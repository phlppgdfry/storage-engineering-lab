import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const root = '/workspace/storage'
const dir = '/evidence/performance-steady'
mkdirSync(dir, { recursive: true })
const specs = {
  A: { variant: 'original', signal: true }, B: { variant: 'fixed', signal: true },
  C: { variant: 'original', signal: false }, D: { variant: 'fixed', signal: false },
  S: { variant: 'original', signal: true, sham: true },
}
const order = [
  ['A', 'B', 'C', 'D', 'S'], ['S', 'D', 'C', 'B', 'A'],
  ['C', 'D', 'S', 'A', 'B'], ['B', 'A', 'S', 'D', 'C'],
  ['S', 'A', 'B', 'C', 'D'], ['D', 'C', 'B', 'A', 'S'],
]
const results = []
let state = 'fixed'
function setVariant(value) {
  if (value === state) return
  const r = spawnSync('git', ['apply', ...(value === 'original' ? ['-R'] : []), '/lab/experiments/fix.patch'], { cwd: root, encoding: 'utf8' })
  assert.equal(r.status, 0, r.stderr)
  state = value
}
try {
  for (let repeat = 0; repeat < order.length; repeat++) {
    for (const id of order[repeat]) {
      const spec = { id, ...specs[id], repeat: repeat + 1, bytes: 4194304, concurrency: 1 }
      setVariant(spec.variant)
      const sourceHash = createHash('sha256').update(readFileSync(`${root}/src/storage/backend/file.ts`)).digest('hex')
      const r = spawnSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', '--tsconfig', 'tsconfig.json',
        '/lab/benchmarks/steady-worker.ts', JSON.stringify(spec)], { cwd: root, encoding: 'utf8', timeout: 30_000, maxBuffer: 4 * 1024 * 1024 })
      writeFileSync(`${dir}/${repeat + 1}-${id}.log`, `${r.stdout ?? ''}${r.stderr ?? ''}`)
      assert(!r.error, String(r.error)); assert.equal(r.status, 0, r.stderr)
      results.push({ ...JSON.parse(r.stdout.trim()), sourceHash })
      console.log(`steady ${repeat + 1}/6 ${id}`)
    }
  }
} finally { setVariant('fixed') }
writeFileSync(`${dir}/results.json`, JSON.stringify({ recordedAt: new Date().toISOString(),
  baseline: 'b11f751abe0fdd6c7f56d3a858b5527f683b7a37', fixed: '3bbc971796fe9907a030c4fc70a07d440930d7b2',
  design: { boundedWorkingSet: 'one constant 4MiB destination atomically overwritten; no retained-file growth',
    order, warmup: '500ms windows, at least2s, last3windows CV <=15%, max6s; instability is reported',
    measurementMs: 2500, controls: 'A/S same original code and live signal; C/D no-signal original/fixed',
    environment: 'same Linux image and4CPU/3GiB limits; native xattrs and md5; no fsync/cache flush',
    limitation: 'diagnostic microbenchmark, not an HTTP or durability benchmark' }, results }, null, 2) + '\n')
console.log('STEADY DONE')
