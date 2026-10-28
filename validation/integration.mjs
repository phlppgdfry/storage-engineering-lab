import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'

const root = '/workspace/storage'
mkdirSync('/evidence/integration', { recursive: true })
const commands = [
  ['migrate', ['run', 'migration:run']],
  ['seed', ['run', 'test:dummy-data']],
  ['suite', ['run', 'test:integration']],
]
const results = []
for (const [label, args] of commands) {
  const run = spawnSync('npm', args, { cwd: root, encoding: 'utf8', timeout: 600_000,
    maxBuffer: 64 * 1024 * 1024, env: { ...process.env, DB_INSTALL_ROLES: 'true',
      OTEL_METRICS_ENABLED: 'false', PROMETHEUS_METRICS_ENABLED: 'false', NO_COLOR: '1', FORCE_COLOR: '0' } })
  const text = `${run.stdout ?? ''}${run.stderr ?? ''}`
  writeFileSync(`/evidence/integration/${label}.log`, text)
  const result = { label, command: `npm ${args.join(' ')}`, exitCode: run.status,
    error: run.error?.message ?? null, summary: text.split('\n').filter(line => /Test Files|Tests\s+|Duration/.test(line)) }
  results.push(result)
  console.log(JSON.stringify(result))
  if (run.status !== 0) break
}
writeFileSync('/evidence/integration/summary.json', JSON.stringify({ recordedAt: new Date().toISOString(),
  commit: '3bbc971796fe9907a030c4fc70a07d440930d7b2', database: 'PostgreSQL 17',
  isolation: 'dedicated Compose project, private network, no published ports', results }, null, 2) + '\n')
if (results.length !== commands.length || results.some(r => r.exitCode !== 0)) process.exitCode = 1
