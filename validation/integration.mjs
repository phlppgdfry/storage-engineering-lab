import { mkdirSync, writeFileSync } from 'node:fs'
import { assertDisposable, containerEnv, ROOT } from '../scripts/container.mjs'
import { interruptController, runCommand } from '../scripts/runtime.mjs'

const environment = assertDisposable()
const env = containerEnv()
const evidence = '/evidence/integration'
mkdirSync(evidence, { recursive: true })
const commands = [['migrate', ['run', 'migration:run']], ['seed', ['run', 'test:dummy-data']], ['suite', ['run', 'test:integration']]]
const summary = { status: 'FAIL', recordedAt: new Date().toISOString(), environment, results: [] }
const interrupts = interruptController()
try {
  for (const [label, args] of commands) {
    const run = await runCommand(label, 'npm', args, { cwd: ROOT, env, evidence, signal: interrupts.signal, timeout: 600_000 })
    summary.results.push({ label, command: `npm ${args.join(' ')}`, exitCode: run.status, summary: run.output.split('\n').filter(line => /Test Files|Tests\s+|Duration/.test(line)) })
  }
  summary.status = 'PASS'
} catch (error) { summary.error = error.message; process.exitCode = 1 }
finally {
  interrupts.dispose()
  writeFileSync(`${evidence}/summary.json`, JSON.stringify(summary, null, 2) + '\n')
}
console.log(JSON.stringify(summary, null, 2))
