import assert from 'node:assert/strict'
import { copyFileSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { BASELINE, FILE_HASHES, LAB } from '../scripts/config.mjs'
import { assertOwned, assertVariant, cleanupOwned, createOwnedRun, fixtureEnv, git, interruptController, redact, requireRuntime, runCommand, sourceCheckout, verifyDependencies } from '../scripts/runtime.mjs'

let owner, checkout, created = false, summary, failure
const interruption = interruptController()
try {
  const { values, positionals } = parseArgs({ options: { checkout: { type: 'string' }, repeats: { type: 'string', default: '3' }, help: { type: 'boolean' }, json: { type: 'boolean' } }, allowPositionals: true })
  if (values.help) {
    console.log('Usage: npm run reproduce -- [--checkout PATH] [--repeats 1..10] [--json]\nNo network or services. Verifies pinned dependencies, creates an owned detached worktree, checks real native before/after behavior and regression failures, then removes only its own workspace.\nSetup: docs/reproduction.md; diagnostics: npm run doctor -- --checkout PATH')
  } else {
    const repeats = Number(values.repeats)
    if (!Number.isSafeInteger(repeats) || repeats < 1 || repeats > 10) throw new Error('--repeats must be an integer from 1 to 10.')
    if (positionals.length > 1 || (positionals.length && values.checkout)) throw new Error('Pass only one checkout.')
    requireRuntime()
    checkout = sourceCheckout(values.checkout ?? positionals[0])
    git(checkout, ['cat-file', '-e', `${BASELINE}^{commit}`])
    const dependencies = verifyDependencies(checkout)
    owner = createOwnedRun('reproduce')
    const worktree = path.join(owner.temporary, 'checkout')
    summary = { status: 'RUNNING', baseline: BASELINE, recordedAt: new Date().toISOString(),
      environment: { node: process.version, platform: process.platform, arch: process.arch }, dependencies,
      before: [], after: [], checks: [], nativeDependencyMocks: false,
      limitations: ['Adapter-level behavior; hosted impact and performance equivalence are not established.', 'Unit tests mock xattrs; native probes use actual xattrs.'] }
    git(checkout, ['worktree', 'add', '--detach', worktree, BASELINE]); created = true
    symlinkSync(dependencies.modules, path.join(worktree, 'node_modules'), 'dir')
    for (const name of ['.env', '.env.test']) copyFileSync(path.join(worktree, `${name}.sample`), path.join(worktree, name))
    const env = fixtureEnv(worktree, { TMPDIR: owner.temporary, TMP: owner.temporary, TEMP: owner.temporary })
    const execute = (label, command, args, allowed = [0]) => runCommand(label, command, args, {
      cwd: worktree, env, evidence: owner.evidence, signal: interruption.signal, allowed,
    })
    const probe = async label => JSON.parse((await execute(label, process.execPath, [
      path.join(dependencies.modules, 'tsx/dist/cli.mjs'), '--tsconfig', path.join(worktree, 'tsconfig.json'),
      path.join(LAB, 'experiments/file-upload-cancellation.ts'), worktree,
    ])).stdout.trim())
    assertVariant(worktree, { original: FILE_HASHES.original })
    for (let i = 0; i < repeats; i++) {
      const value = await probe(`native-before-${i + 1}`)
      assert.deepEqual(value, { preAborted: { outcome: 'resolved', code: null, published: true },
        active: { outcome: 'resolved', code: null, sourceDestroyedOnAbort: false, finalContents: 'partialremaining', stagingFiles: [] } })
      summary.before.push(value)
    }
    await execute('apply-tests', 'git', ['-c', 'core.hooksPath=/dev/null', 'apply', path.join(LAB, 'experiments/regression.patch')])
    const testArgs = [path.join(dependencies.modules, 'vitest/vitest.mjs'), 'run', '--config', 'vitest.unit.config.ts',
      'src/storage/backend/file.test.ts', '-t', 'FileBackend uploadObject signal']
    const red = await execute('regression-red', process.execPath, testArgs, [1])
    assert.match(red.output, /2 failed \| 3 passed/, 'Expected exactly the two cancellation assertions to fail, not an infrastructure error.')
    summary.checks.push({ name: 'regression before', failed: 2, passed: 3, expectedFailure: true })
    await execute('apply-fix', 'git', ['-c', 'core.hooksPath=/dev/null', 'apply', path.join(LAB, 'experiments/fix.patch')])
    const fixedSourceSha256 = assertVariant(worktree, { fixed: FILE_HASHES.fixed })
    for (let i = 0; i < repeats; i++) {
      const value = await probe(`native-after-${i + 1}`)
      assert.deepEqual(value, { preAborted: { outcome: 'rejected', code: 'Aborted', published: false },
        active: { outcome: 'rejected', code: 'AbortedTerminate', sourceDestroyedOnAbort: true, finalContents: 'old', stagingFiles: [] } })
      summary.after.push(value)
    }
    const green = await execute('regression-green', process.execPath, testArgs)
    assert.match(green.output, /Tests\s+5 passed/)
    summary.checks.push({ name: 'regression after', failed: 0, passed: 5 })
    summary.fixedSourceSha256 = fixedSourceSha256
    summary.status = 'PASS'
  }
} catch (error) {
  failure = error
  if (summary) { summary.status = 'FAIL'; summary.error = redact(error.message) }
} finally {
  interruption.dispose()
  if (owner) {
    try {
      assertOwned(owner)
      if (created) git(checkout, ['worktree', 'remove', '--force', path.join(owner.temporary, 'checkout')])
      cleanupOwned(owner)
      if (summary) summary.cleanup = 'own temporary worktree removed'
    } catch (error) {
      failure ??= error
      if (summary) { summary.status = 'FAIL'; summary.cleanup = redact(error.message) }
    }
    if (summary) writeFileSync(path.join(owner.evidence, 'summary.json'), JSON.stringify(summary, null, 2) + '\n')
  }
}
if (failure) {
  console.error(`REPRODUCE FAIL: ${redact(failure.message)}\n${owner ? `Evidence retained: ${owner.evidence}` : 'No experiment started.'}\nSee docs/troubleshooting.md.`)
  process.exitCode = 1
} else if (summary) {
  const json = process.argv.includes('--json')
  console.log(json ? JSON.stringify(summary, null, 2) : `PASS: ${summary.before.length} native repetitions before/after; two expected regression failures -> five passes.\nEvidence: ${owner.evidence}/summary.json\nCleanup: ${summary.cleanup}`)
}
