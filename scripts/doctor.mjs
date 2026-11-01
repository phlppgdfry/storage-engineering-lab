import { parseArgs } from 'node:util'
import { BASELINE } from './config.mjs'
import { git, redact, requireRuntime, sourceCheckout, verifyDependencies } from './runtime.mjs'

try {
  const { values, positionals } = parseArgs({ options: { checkout: { type: 'string' }, help: { type: 'boolean' }, json: { type: 'boolean' } }, allowPositionals: true })
  if (values.help) {
    console.log('Usage: npm run doctor -- [--checkout PATH] [--json]\nChecks Node/platform, pinned Git object, lockfile and installed dependency metadata. No network or mutations.')
  } else {
    if (positionals.length > 1 || (positionals.length && values.checkout)) throw new Error('Pass one checkout, using either --checkout PATH or the legacy positional form.')
    requireRuntime()
    const checkout = sourceCheckout(values.checkout ?? positionals[0])
    git(checkout, ['cat-file', '-e', `${BASELINE}^{commit}`])
    const dependencies = verifyDependencies(checkout)
    const result = { status: 'PASS', checkout, baseline: BASELINE, node: process.version, platform: process.platform, arch: process.arch,
      dependencies, scope: 'Prerequisite/metadata check, not native execution or package-content integrity certification.',
      next: 'npm run reproduce -- --checkout PATH' }
    console.log(values.json ? JSON.stringify(result, null, 2) : `PASS: pinned prerequisites verified (${dependencies.entries} installed entries).\nNext: ${result.next}`)
  }
} catch (error) {
  console.error(`DOCTOR FAIL: ${redact(error.message)}\nSee docs/troubleshooting.md.`)
  process.exitCode = 1
}
