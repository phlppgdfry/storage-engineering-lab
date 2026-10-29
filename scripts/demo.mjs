import { readFileSync } from 'node:fs'
import path from 'node:path'
import { LAB } from './config.mjs'
import { runCommand } from './runtime.mjs'

// Real execution, with portable excerpts on screen; full original logs stay local.
console.log('Investigating File Upload Cancellation in Supabase Storage')
console.log('$ node experiments/reproduce.mjs --repeats 1 --json')
const run = await runCommand('demo', process.execPath, [path.join(LAB, 'experiments/reproduce.mjs'),
  '--checkout', process.argv[2] ?? path.join(LAB, '../supabase-storage'), '--repeats', '1', '--json'],
{ cwd: LAB, timeout: 180000, progress: false })
const result = JSON.parse(run.stdout)
console.log(`Executed ${result.recordedAt}; ${result.environment.node}/${result.environment.platform}/${result.environment.arch}`)
console.log(`Baseline ${result.baseline}; fixed adapter SHA256 ${result.fixedSourceSha256}`)
console.log('\nNative BEFORE (actual files and xattrs):\n' + JSON.stringify(result.before[0], null, 2))
// Evidence directory comes only from our own runner output, never repository prose.
const evidence = run.stderr.match(/Evidence retained: (.*)/)?.[1]
// Reproducer writes logs inside its newly owned evidence directory. Find the exact run
// using the timestamp instead of accepting an arbitrary command or path from input.
const { readdirSync } = await import('node:fs')
const parent = path.join(LAB, 'evidence/local')
const matches = readdirSync(parent).filter(n => n.startsWith('reproduce-')).filter(n => {
  try { return JSON.parse(readFileSync(path.join(parent, n, 'summary.json'))).recordedAt === result.recordedAt } catch { return false }
})
if (matches.length !== 1 || evidence) throw new Error('Cannot uniquely identify successful reproduction evidence')
const directory = path.join(parent, matches[0])
for (const variant of ['red', 'green']) {
  console.log(`\nRegression ${variant.toUpperCase()} — excerpts from actual output:`)
  const lines = readFileSync(path.join(directory, `regression-${variant}.log`), 'utf8').split('\n')
  console.log(lines.filter(line => /Tests\s|Test Files\s|FAIL\s|AssertionError:/.test(line)).join('\n'))
  if (variant === 'red') {
    console.log('\nProduction change applied during this run:')
    console.log(readFileSync(path.join(LAB, 'experiments/fix.patch'), 'utf8'))
    console.log('Native AFTER:\n' + JSON.stringify(result.after[0], null, 2))
  }
}
console.log(`\n${result.status}; cleanup: ${result.cleanup}`)
console.log(`Full logs: evidence/local/${matches[0]}/ (private; inspect before sharing)`)
console.log('Scope: adapter cancellation; normal-upload performance remains inconclusive. PR #1616 is a draft as checked 2026-10-29.')
