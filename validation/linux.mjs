import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import os from 'node:os'

const root = '/workspace/storage'
mkdirSync('/evidence/linux', { recursive: true })
function run(label, command, args, allowed = [0], timeout = 240_000) {
  const r = spawnSync(command, args, { cwd: root, encoding: 'utf8', timeout,
    maxBuffer: 32 * 1024 * 1024, env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' } })
  writeFileSync(`/evidence/linux/${label}.log`, `${r.stdout ?? ''}${r.stderr ?? ''}`)
  assert(!r.error, `${label}: ${r.error?.message}`)
  assert(allowed.includes(r.status), `${label} exited ${r.status}`)
  return r
}
const native = (label) => JSON.parse(run(label, process.execPath, [
  'node_modules/tsx/dist/cli.mjs', '--tsconfig', 'tsconfig.json',
  '/lab/experiments/file-upload-cancellation.ts', root,
]).stdout.trim())
const args = ['node_modules/vitest/vitest.mjs', 'run', '--config', 'vitest.unit.config.ts',
  'src/storage/backend/file.test.ts', '-t', 'FileBackend uploadObject signal']
const results = { environment: { node: process.version, platform: process.platform,
  arch: process.arch, kernel: os.release(), os: readFileSync('/etc/os-release', 'utf8') },
  commit: '3bbc971796fe9907a030c4fc70a07d440930d7b2', before: [], after: [], checks: [] }
run('restore-original', 'git', ['apply', '-R', '/lab/experiments/fix.patch'])
for (let i = 0; i < 3; i++) {
  const value = native(`native-before-${i}`)
  assert.equal(value.preAborted.outcome, 'resolved')
  assert.equal(value.preAborted.published, true)
  assert.equal(value.active.outcome, 'resolved')
  assert.equal(value.active.sourceDestroyedOnAbort, false)
  assert.equal(value.active.finalContents, 'partialremaining')
  results.before.push(value)
}
const red = run('red', process.execPath, args, [1])
assert.match(red.stdout + red.stderr, /2 failed \| 3 passed/)
run('apply-fix', 'git', ['apply', '/lab/experiments/fix.patch'])
for (let i = 0; i < 3; i++) {
  const value = native(`native-after-${i}`)
  assert.equal(value.preAborted.code, 'Aborted')
  assert.equal(value.preAborted.published, false)
  assert.equal(value.active.code, 'AbortedTerminate')
  assert.equal(value.active.sourceDestroyedOnAbort, true)
  assert.equal(value.active.finalContents, 'old')
  assert.deepEqual(value.active.stagingFiles, [])
  results.after.push(value)
}
run('green', process.execPath, args)
results.checks.push({ name: 'native + regression red/green', outcome: 'passed' })
const unit = run('unit', 'npm', ['run', 'test:unit', '--', '--maxWorkers=2'])
const match = (unit.stdout + unit.stderr).match(/Tests\s+(\d+) passed(?: \| (\d+) skipped)?/)
results.checks.push({ name: 'full unit', outcome: 'passed', tests: match ? Number(match[1]) : null, skipped: match?.[2] ? Number(match[2]) : 0 })
run('lint', 'npm', ['run', 'lint'])
run('build', 'npm', ['run', 'build'])
results.checks.push({ name: 'lint', outcome: 'passed' }, { name: 'build', outcome: 'passed' })
results.recordedAt = new Date().toISOString()
writeFileSync('/evidence/linux/summary.json', JSON.stringify(results, null, 2) + '\n')
console.log(JSON.stringify({ status: 'passed', checks: results.checks, environment: results.environment }, null, 2))
