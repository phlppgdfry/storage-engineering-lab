import assert from 'node:assert/strict'
import path from 'node:path'
import { copyFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { LAB } from './config.mjs'
import { createOwnedRun, cleanupOwned, fixtureEnv, git, hash, runCommand, sourceCheckout, verifyDependencies } from './runtime.mjs'
const revision = 'dcbb8eb78fd389a51ba0e6477fde0c02f6466986'
const checkout = sourceCheckout(process.argv[2])
const dependencies = verifyDependencies(checkout)
const owner = createOwnedRun('download')
const worktree = path.join(owner.temporary, 'checkout')
let created = false
const summary = { revision, recordedAt: new Date().toISOString(), environment: { node: process.version, platform: process.platform, arch: process.arch }, observations: [], status: 'RUNNING', limitation: 'Current source with reused pinned study dependencies, not a fresh installation at current upstream lock; native adapter only.' }
try {
  git(checkout, ['worktree', 'add', '--detach', worktree, revision]); created = true
  symlinkSync(dependencies.modules, path.join(worktree, 'node_modules'), 'dir')
  for (const name of ['.env', '.env.test']) copyFileSync(path.join(worktree, `${name}.sample`), path.join(worktree, name))
  summary.sourceTree = git(worktree, ['rev-parse', 'HEAD^{tree}']).trim()
  for (let i = 0; i < 3; i++) {
    const run = await runCommand(`native-${i + 1}`, process.execPath, [path.join(dependencies.modules, 'tsx/dist/cli.mjs'), '--tsconfig', path.join(worktree, 'tsconfig.json'), path.join(LAB, 'experiments/file-download-cancellation.ts'), worktree], { cwd: worktree, env: fixtureEnv(worktree, { TMPDIR: owner.temporary }), evidence: owner.evidence, timeout: 30000 })
    summary.observations.push(JSON.parse(run.stdout))
  }
  assert.deepEqual(summary.observations[0], summary.observations[1]); assert.deepEqual(summary.observations[1], summary.observations[2])
  summary.status = 'PASS'
} catch (error) { summary.status = 'FAIL'; summary.error = error.message; process.exitCode = 1 }
finally {
  try { if (created) git(checkout, ['worktree', 'remove', '--force', worktree]); cleanupOwned(owner); summary.cleanup = 'PASS' } catch (error) { summary.cleanup = error.message; process.exitCode = 1 }
  writeFileSync(path.join(owner.evidence, 'summary.json'), JSON.stringify(summary, null, 2) + '\n')
}
console.log(JSON.stringify({ ...summary, evidence: path.relative(LAB, owner.evidence) }, null, 2))
