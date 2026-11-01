import assert from 'node:assert/strict'
import path from 'node:path'
import { copyFileSync, symlinkSync, writeFileSync, readFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { LAB } from './config.mjs'
import { createOwnedRun, cleanupOwned, fixtureEnv, git, hash, runCommand, sourceCheckout, verifyDependencies, interruptController } from './runtime.mjs'
const revision = 'dcbb8eb78fd389a51ba0e6477fde0c02f6466986'
const { values, positionals } = parseArgs({ options: { http: { type: 'boolean' }, intervention: { type: 'boolean' } }, allowPositionals: true })
if (values.intervention && !values.http) throw new Error('--intervention requires --http')
if (positionals.length > 1) throw new Error('Pass one checkout')
const worker = values.http ? 'experiments/http-download-cancellation.ts' : 'experiments/file-download-cancellation.ts'
const checkout = sourceCheckout(positionals[0])
const dependencies = verifyDependencies(checkout)
const interruption = interruptController()
const owner = createOwnedRun(values.http ? 'http-download' : 'download')
const worktree = path.join(owner.temporary, 'checkout')
let created = false
const summary = { revision, recordedAt: new Date().toISOString(), environment: { node: process.version, platform: process.platform, arch: process.arch }, worker, workerSha256: hash(readFileSync(path.join(LAB, worker))), observations: [], status: 'RUNNING', limitation: 'Historical pinned dcbb8eb7 source with reused study dependencies, not an installation at moving upstream HEAD; minimal route bypasses database/auth when --http.' }
try {
  git(checkout, ['worktree', 'add', '--detach', worktree, revision]); created = true
  symlinkSync(dependencies.modules, path.join(worktree, 'node_modules'), 'dir')
  for (const name of ['.env', '.env.test']) copyFileSync(path.join(worktree, `${name}.sample`), path.join(worktree, name))
  if (values.intervention) git(worktree, ['apply', path.join(LAB, 'experiments/download-md5-intervention.patch')])
  summary.variant = values.intervention ? 'diagnostic MD5 signal forwarding' : 'original historical pinned source'
  summary.adapterSha256 = hash(readFileSync(path.join(worktree, 'src/storage/backend/file.ts')))
  summary.sourceTree = git(worktree, ['rev-parse', 'HEAD^{tree}']).trim()
  for (let i = 0; i < 3; i++) {
    const run = await runCommand(`native-${i + 1}`, process.execPath, [path.join(dependencies.modules, 'tsx/dist/cli.mjs'), '--tsconfig', path.join(worktree, 'tsconfig.json'), path.join(LAB, worker), worktree, ...(values.intervention ? ['forwarded'] : [])], { cwd: worktree, env: fixtureEnv(worktree, { TMPDIR: owner.temporary }), evidence: owner.evidence, timeout: 30000, signal: interruption.signal })
    summary.observations.push(JSON.parse(run.stdout))
  }
  if (!values.http) { assert.deepEqual(summary.observations[0], summary.observations[1]); assert.deepEqual(summary.observations[1], summary.observations[2]) }
  summary.status = 'PASS'
} catch (error) { summary.status = 'FAIL'; summary.error = error.message; process.exitCode = 1 }
finally {
  interruption.dispose()
  try { if (created) git(checkout, ['worktree', 'remove', '--force', worktree]); cleanupOwned(owner); summary.cleanup = 'PASS' } catch (error) { summary.status = 'FAIL'; summary.cleanup = error.message; process.exitCode = 1 }
  writeFileSync(path.join(owner.evidence, 'summary.json'), JSON.stringify(summary, null, 2) + '\n')
}
console.log(JSON.stringify({ ...summary, evidence: path.relative(LAB, owner.evidence) }, null, 2))
