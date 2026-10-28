import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'

const input = process.argv[2]
const bytes = readFileSync(input)
const raw = JSON.parse((input.endsWith('.gz') ? gunzipSync(bytes) : bytes).toString())
const median = values => {
  const xs = [...values].sort((a, b) => a - b)
  const half = Math.floor(xs.length / 2)
  return xs.length % 2 ? xs[half] : (xs[half - 1] + xs[half]) / 2
}
const range = values => ({ median: median(values), min: Math.min(...values), max: Math.max(...values) })
const cases = [...new Set(raw.results.map(r => r.id))]
const workloads = cases.map(id => {
  const variants = ['original', 'fixed'].map(variant => {
    const rows = raw.results.filter(r => r.id === id && r.variant === variant)
    return { variant, repetitions: rows.length, measuredOperations: rows.reduce((a, r) => a + r.count, 0),
      operationsPerSecond: range(rows.map(r => r.operationsPerSecond)),
      p50Ms: range(rows.map(r => r.p50Ms)), p95Ms: range(rows.map(r => r.p95Ms)), p99Ms: range(rows.map(r => r.p99Ms)),
      cpuMsPerOperation: range(rows.map(r => (r.cpuUserMs + r.cpuSystemMs) / r.count)),
      sourceBytesPerOperation: range(rows.map(r => r.producedBytes / r.count)),
      sampledPeakRssMiB: range(rows.map(r => r.sampledPeakRssBytes / 1048576)),
      cancellationP95Ms: rows[0].cancel ? range(rows.map(r => r.cancellationP95Ms)) : null,
    }
  })
  const original = raw.results.filter(r => r.id === id && r.variant === 'original')
  const pairedThroughputChangesPercent = original.map(a => {
    const b = raw.results.find(r => r.id === id && r.variant === 'fixed' && r.repeat === a.repeat)
    return (b.operationsPerSecond / a.operationsPerSecond - 1) * 100
  })
  return { id, variants, pairedThroughputChangesPercent,
    everyFixedRunSlower: pairedThroughputChangesPercent.every(x => x < 0),
    note: original[0].cancel ? 'Different outcomes: rejected cancellation versus completed transfer. Do not market throughput ratio as general speedup.' : 'Local observations; repeatability does not alone establish attribution.' }
})
console.log(JSON.stringify({ sourceRecordedAt: raw.recordedAt, environment: raw.environment,
  aggregation: 'Median/min/max of run-level metrics, not pooled request percentiles.', workloads }, null, 2))
