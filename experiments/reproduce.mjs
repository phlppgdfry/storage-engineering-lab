import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const baseline = '4134dbba1b94757f400d5d7c09f9382935efd726'
const lab = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const checkout = realpathSync(path.resolve(process.argv[2] ?? path.join(lab, '../supabase-storage')))
const dependencies = path.join(checkout, 'node_modules')
for (const file of ['vitest/vitest.mjs', 'tsx/dist/cli.mjs']) {
  assert(existsSync(path.join(dependencies, file)), `Missing ${file}; install upstream dependencies first.`)
}
assert(Number(process.versions.node.split('.')[0]) >= 24, 'Node 24 or newer is required.')

mkdirSync(path.join(lab, 'evidence/local'), { recursive: true })
const evidence = mkdtempSync(path.join(lab, 'evidence/local/run-'))
const temporary = mkdtempSync(path.join(os.tmpdir(), 'storage-lab-reproduce-'))
const worktree = path.join(temporary, 'checkout')
let created = false

function run(command, args, cwd, label, allowed = [0]) {
  const result = spawnSync(command, args, {
    cwd, encoding: 'utf8', timeout: 60_000, maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
  })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  writeFileSync(path.join(evidence, `${label}.log`), output)
  assert(!result.error, `${label}: ${result.error?.message}`)
  assert(allowed.includes(result.status), `${label} exited ${result.status}; see ${evidence}`)
  return { status: result.status, output, stdout: result.stdout }
}

function probe(label) {
  const result = run(process.execPath, [
    path.join(dependencies, 'tsx/dist/cli.mjs'), '--tsconfig', path.join(worktree, 'tsconfig.json'),
    path.join(lab, 'experiments/file-upload-cancellation.ts'), worktree,
  ], worktree, label)
  return JSON.parse(result.stdout.trim())
}

try {
  run('git', ['cat-file', '-e', `${baseline}^{commit}`], checkout, 'check-baseline')
  run('git', ['worktree', 'add', '--detach', worktree, baseline], checkout, 'create-worktree')
  created = true
  symlinkSync(dependencies, path.join(worktree, 'node_modules'), 'dir')
  for (const name of ['.env', '.env.test']) {
    // Only copy tracked PUBLIC samples, never the contributor's actual configuration.
    copyFileSync(path.join(worktree, `${name}.sample`), path.join(worktree, name))
  }

  const before = []
  for (let i = 0; i < 3; i++) {
    const value = probe(`native-before-${i + 1}`)
    assert.deepEqual(value, {
      preAborted: { outcome: 'resolved', code: null, published: true },
      active: { outcome: 'resolved', code: null, sourceDestroyedOnAbort: false, finalContents: 'partialremaining', stagingFiles: [] },
    }, 'Baseline must reproduce the actual cancellation defect, not an infrastructure error.')
    before.push(value)
  }

  run('git', ['apply', path.join(lab, 'experiments/regression.patch')], worktree, 'apply-tests')
  const testArgs = [path.join(dependencies, 'vitest/vitest.mjs'), 'run', '--config', 'vitest.unit.config.ts',
    'src/storage/backend/file.test.ts', '-t', 'FileBackend uploadObject signal']
  const red = run(process.execPath, testArgs, worktree, 'regression-red', [1])
  assert.match(red.output, /2 failed \| 3 passed/, 'Red run must fail exactly the two cancellation assertions.')

  run('git', ['apply', path.join(lab, 'experiments/fix.patch')], worktree, 'apply-fix')
  const after = []
  for (let i = 0; i < 3; i++) {
    const value = probe(`native-after-${i + 1}`)
    assert.deepEqual(value, {
      preAborted: { outcome: 'rejected', code: 'Aborted', published: false },
      active: { outcome: 'rejected', code: 'AbortedTerminate', sourceDestroyedOnAbort: true, finalContents: 'old', stagingFiles: [] },
    })
    after.push(value)
  }
  const green = run(process.execPath, testArgs, worktree, 'regression-green')
  assert.match(green.output, /5 passed/, 'All five regression and control cases must pass.')
  const summary = {
    baseline, recordedAt: new Date().toISOString(),
    environment: { node: process.version, platform: process.platform, arch: process.arch },
    nativeDependencyMocks: false, before, after,
    regression: { before: { failed: 2, passed: 3 }, after: { failed: 0, passed: 5 } },
    limitations: ['Adapter-level behavior; no hosted-service impact established.',
      'Unit tests mock extended attributes; the native probes do not.',
      'No performance benchmark or PostgreSQL integration suite in this command.'],
  }
  writeFileSync(path.join(evidence, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`)
  console.log(`PASS: native before/after verified three times; regression red -> green.\nEvidence: ${path.join(evidence, 'summary.json')}`)
} finally {
  if (created) {
    // This is only the fresh disposable worktree created above; never the user's checkout.
    const cleanup = spawnSync('git', ['worktree', 'remove', '--force', worktree], { cwd: checkout, encoding: 'utf8' })
    if (cleanup.status !== 0) {
      console.error(`Temporary worktree retained for inspection: ${worktree}\n${cleanup.stderr}`)
    } else {
      rmSync(temporary, { recursive: true, force: true })
    }
  } else {
    rmSync(temporary, { recursive: true, force: true })
  }
}
