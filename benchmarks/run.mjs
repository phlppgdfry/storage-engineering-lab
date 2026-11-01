import { assertDisposable, containerEnv } from '../scripts/container.mjs'
import { assertVariant } from '../scripts/runtime.mjs'
import { FILE_HASHES } from '../scripts/config.mjs'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'

const environment = assertDisposable()
const safeEnv = containerEnv()
for (const key of Object.keys(process.env)) delete process.env[key]
Object.assign(process.env, safeEnv)
const root = '/workspace/storage'
assertVariant(root, { fixed: FILE_HASHES.fixed })
const timed = process.argv.includes('--timed')
const directory = timed ? '/evidence/performance-timed' : '/evidence/performance'
mkdirSync(directory, { recursive: true })
const cases = [
  { id: '64KiB-c8-no-signal', size: 65536, concurrency: 8, count: 128, signal: false, cancel: false },
  { id: '64KiB-c8-live-signal', size: 65536, concurrency: 8, count: 128, signal: true, cancel: false },
  { id: '4MiB-c1-live-signal', size: 4194304, concurrency: 1, count: 24, signal: true, cancel: false },
  { id: '4MiB-c8-live-signal', size: 4194304, concurrency: 8, count: 32, signal: true, cancel: false },
  { id: '4MiB-c8-cancelled', size: 4194304, concurrency: 8, count: 24, signal: true, cancel: true },
]
const results = []
let state = 'fixed'
function variant(value) {
  if (value === state) return
  const args = ['apply', ...(value === 'original' ? ['-R'] : []), '/lab/experiments/fix.patch']
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  state = value
  assertVariant(root, { [value]: FILE_HASHES[value] })
}
try {
  // Paired AB/BA order alternates across repetitions to reduce order bias.
  // Each child imports a fresh implementation; no module-cache reuse across patches.
  for (let repeat = 0; repeat < 5; repeat++) {
    for (const item of cases) {
      for (const value of repeat % 2 ? ['fixed', 'original'] : ['original', 'fixed']) {
        variant(value)
        const spec = { ...item, ...(timed ? { durationMs: 2000, count: item.size > 65536 && !item.cancel ? 1000 : 10000 } : {}), repeat: repeat + 1, variant: value }
        const sourceHash = createHash('sha256').update(readFileSync(`${root}/src/storage/backend/file.ts`)).digest('hex')
        const run = spawnSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', '--tsconfig', 'tsconfig.json',
          '/lab/benchmarks/upload-worker.ts', JSON.stringify(spec)], {
          cwd: root, encoding: 'utf8', timeout: 60_000, maxBuffer: 4 * 1024 * 1024,
        })
        writeFileSync(`${directory}/${item.id}-${repeat + 1}-${value}.log`, `${run.stdout ?? ''}${run.stderr ?? ''}`)
        assert(!run.error, String(run.error))
        assert.equal(run.status, 0, run.stderr)
        results.push({ ...JSON.parse(run.stdout.trim()), sourceHash })
        console.log(`completed ${repeat + 1}/5 ${item.id} ${value}`)
      }
    }
  }
} finally {
  variant('fixed')
}
const artifact = { recordedAt: new Date().toISOString(), baseline: 'b11f751abe0fdd6c7f56d3a858b5527f683b7a37',
  fixed: '3bbc971796fe9907a030c4fc70a07d440930d7b2',
  environment: { node: process.version, platform: process.platform, arch: process.arch,
    kernel: os.release(), cpuMax: environment.cpuMax, memoryMax: environment.memoryMax, etagAlgorithm: 'md5' },
  methodology: { repeats: 5, warmupUploadsPerChild: 'at least 4; timed runs also warm for 250 ms', trialDurationMs: timed ? 2000 : null, requestLatency: 'adapter call to settled promise; no client queue time',
    percentile: 'nearest rank within a run; p99 equals the maximum for workloads below 100 requests',
    rss: 'sampled every 5 ms; not an exact peak and not per-request memory',
    cache: 'OS cache not flushed; no fsync; not durable-disk throughput',
    scope: 'real file-backend microbenchmark, no network or PostgreSQL; cancelled outcomes are intentionally different',
    bytes: 'produced by the input source, not physical disk or network traffic',
    order: 'paired AB/BA, separate child processes per implementation/workload/repetition' }, results }
writeFileSync(`${directory}/results.json`, JSON.stringify(artifact, null, 2) + '\n')
console.log(`DONE: ${results.length} measured groups; source restored to fixed implementation.`)
