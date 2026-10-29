import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { assertDisposable, containerEnv, ROOT } from '../scripts/container.mjs'
import { assertVariant, interruptController, runCommand } from '../scripts/runtime.mjs'
import { FILE_HASHES } from '../scripts/config.mjs'

const environment = assertDisposable()
const env = containerEnv()
const evidence = '/evidence/linux'
mkdirSync(evidence, { recursive: true })
const interrupts = interruptController()
const run = (label, command, args, allowed = [0], timeout = 240_000) => runCommand(label, command, args, { cwd: ROOT, env, evidence, allowed, timeout, signal: interrupts.signal })
const native = async label => JSON.parse((await run(label, process.execPath, ['node_modules/tsx/dist/cli.mjs', '--tsconfig', 'tsconfig.json', '/lab/experiments/file-upload-cancellation.ts', ROOT])).stdout.trim())
const args = ['node_modules/vitest/vitest.mjs', 'run', '--config', 'vitest.unit.config.ts', 'src/storage/backend/file.test.ts', '-t', 'FileBackend uploadObject signal']
const results = { status: 'FAIL', environment, mode: process.argv.includes('--smoke') ? 'smoke' : 'linux', before: [], after: [], checks: [] }
try {
  assertVariant(ROOT, { fixed: FILE_HASHES.fixed })
  await run('restore-original', 'git', ['apply', '-R', '/lab/experiments/fix.patch'])
  assertVariant(ROOT, { original: FILE_HASHES.original })
  for (let i = 0; i < 3; i++) {
    const value = await native(`native-before-${i}`)
    assert.equal(value.preAborted.outcome, 'resolved'); assert.equal(value.preAborted.published, true)
    assert.equal(value.active.outcome, 'resolved'); assert.equal(value.active.sourceDestroyedOnAbort, false)
    assert.equal(value.active.finalContents, 'partialremaining'); results.before.push(value)
  }
  const red = await run('red', process.execPath, args, [1])
  assert.match(red.output, /2 failed \| 3 passed/)
  results.checks.push({ name: 'regression before', failed: 2, passed: 3, expectedFailure: true })
  await run('apply-fix', 'git', ['apply', '/lab/experiments/fix.patch'])
  assertVariant(ROOT, { fixed: FILE_HASHES.fixed })
  for (let i = 0; i < 3; i++) {
    const value = await native(`native-after-${i}`)
    assert.equal(value.preAborted.code, 'Aborted'); assert.equal(value.preAborted.published, false)
    assert.equal(value.active.code, 'AbortedTerminate'); assert.equal(value.active.sourceDestroyedOnAbort, true)
    assert.equal(value.active.finalContents, 'old'); assert.deepEqual(value.active.stagingFiles, []); results.after.push(value)
  }
  const green = await run('green', process.execPath, args)
  assert.match(green.output, /5 passed/)
  results.checks.push({ name: 'regression after', failed: 0, passed: 5 })
  if (results.mode === 'linux') {
    const unit = await run('unit', 'npm', ['run', 'test:unit', '--', '--maxWorkers=2'])
    const match = unit.output.match(/Tests\s+(\d+) passed(?: \| (\d+) skipped)?/)
    assert(match, 'Missing unit result summary')
    results.checks.push({ name: 'full unit', outcome: 'passed', tests: Number(match[1]), skipped: Number(match[2] ?? 0) })
    await run('lint', 'npm', ['run', 'lint']); await run('build', 'npm', ['run', 'build'])
    results.checks.push({ name: 'lint', outcome: 'passed' }, { name: 'build', outcome: 'passed' })
  }
  results.status = 'PASS'
} catch (error) { results.error = error.message; process.exitCode = 1 }
finally {
  try {
    if (assertVariant(ROOT, FILE_HASHES) === FILE_HASHES.original) await runCommand('finally-restore-fixed', 'git', ['apply', '/lab/experiments/fix.patch'], { cwd: ROOT, env, evidence })
    assertVariant(ROOT, { fixed: FILE_HASHES.fixed }); results.sourceRestored = true
  } catch (error) { results.status = 'FAIL'; results.restoreError = error.message; process.exitCode = 1 }
  interrupts.dispose()
  writeFileSync(path.join(evidence, 'summary.json'), JSON.stringify(results, null, 2) + '\n')
}
console.log(JSON.stringify(results, null, 2))
