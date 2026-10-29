import { createHash } from 'node:crypto'
import { gunzipSync } from 'node:zlib'

export const HISTORICAL_HASHES = Object.freeze({
  original: 'b3caa1184247a76f45b7c44322580f191e12c398131ea198f215580439f5c706',
  fixed: '13aeee850cc7263a87b0fd2431a429e2360d7cd135b98ccf8ce5f1d422cfb710',
})
const cases = {
  '64KiB-c8-no-signal': [65536, 8, false, false, 128],
  '64KiB-c8-live-signal': [65536, 8, true, false, 128],
  '4MiB-c1-live-signal': [4194304, 1, true, false, 24],
  '4MiB-c8-live-signal': [4194304, 8, true, false, 32],
  '4MiB-c8-cancelled': [4194304, 8, true, true, 24],
}
const treatments = { A: ['original', true], B: ['fixed', true], C: ['original', false], D: ['fixed', false], S: ['original', true] }
function requireValue(condition, message) { if (!condition) throw new Error(message) }
function number(value, label, minimum = 0) {
  requireValue(typeof value === 'number' && Number.isFinite(value) && value >= minimum, `${label}: expected a finite number >= ${minimum}`)
}
function integer(value, label, minimum = 0) { number(value, label, minimum); requireValue(Number.isSafeInteger(value), `${label}: expected a safe integer`) }
function same(actual, expected, label) { requireValue(actual === expected, `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`) }
function close(actual, expected, label) {
  number(actual, label)
  requireValue(Math.abs(actual - expected) <= 1e-8 * Math.max(1, Math.abs(expected)), `${label}: recorded ${actual}, recalculated ${expected}`)
}
function samples(value, label) {
  requireValue(Array.isArray(value), `${label}: expected an array`)
  value.forEach((v, i) => number(v, `${label}[${i}]`))
}
export function percentile(values, quantile) {
  requireValue(Array.isArray(values) && values.length > 0, 'percentile: nonempty samples required')
  samples(values, 'percentile samples')
  requireValue(Number.isFinite(quantile) && quantile > 0 && quantile <= 1, 'percentile: quantile must be in (0, 1]')
  return [...values].sort((a, b) => a - b)[Math.ceil(values.length * quantile) - 1]
}
export function median(values) {
  requireValue(Array.isArray(values) && values.length > 0, 'median: nonempty samples required')
  samples(values, 'median samples')
  const xs = [...values].sort((a, b) => a - b), middle = Math.floor(xs.length / 2)
  return xs.length % 2 ? xs[middle] : (xs[middle - 1] + xs[middle]) / 2
}
export function parseEvidence(bytes, { gzip = false, label = 'evidence' } = {}) {
  try { return JSON.parse((gzip ? gunzipSync(bytes, { maxOutputLength: 64 * 1024 * 1024 }) : bytes).toString('utf8')) }
  catch (error) { throw new Error(`${label}: invalid ${gzip ? 'gzip/JSON' : 'JSON'}: ${error.message}`) }
}

export function validateBenchmarkDataset(raw, { kind, expectedHashes = HISTORICAL_HASHES } = {}) {
  requireValue(['exploratory', 'timed', 'steady'].includes(kind), 'Unsupported dataset schema: specify exploratory, timed or steady')
  requireValue(raw && typeof raw === 'object' && !Array.isArray(raw), `${kind}: expected dataset object`)
  if ('schemaVersion' in raw) same(raw.schemaVersion, 1, `${kind}.schemaVersion`)
  requireValue(typeof raw.recordedAt === 'string' && Number.isFinite(Date.parse(raw.recordedAt)), `${kind}.recordedAt: invalid timestamp`)
  same(raw.baseline, 'b11f751abe0fdd6c7f56d3a858b5527f683b7a37', `${kind}.baseline`)
  same(raw.fixed, '3bbc971796fe9907a030c4fc70a07d440930d7b2', `${kind}.fixed`)
  for (const variant of ['original', 'fixed']) requireValue(/^[a-f0-9]{64}$/.test(expectedHashes[variant] ?? ''), `Expected ${variant} source identity is missing/invalid`)
  const steady = kind === 'steady', repeats = steady ? 6 : 5
  const ids = steady ? Object.keys(treatments) : Object.keys(cases)
  requireValue(Array.isArray(raw.results), `${kind}.results: expected an array`)
  same(raw.results.length, ids.length * repeats * (steady ? 1 : 2), `${kind}.results row count`)
  if (steady) {
    requireValue(raw.design && Array.isArray(raw.design.order), 'steady.design.order: required')
    same(raw.design.order.length, repeats, 'steady.design.order block count')
    raw.design.order.forEach((order, i) => {
      requireValue(Array.isArray(order) && order.length === ids.length && new Set(order).size === ids.length && ids.every(id => order.includes(id)), `steady.design.order[${i}]: each treatment must appear exactly once`)
    })
  } else {
    same(raw.methodology?.repeats, repeats, `${kind}.methodology.repeats`)
    if (kind === 'timed') same(raw.methodology?.trialDurationMs, 2000, 'timed trialDurationMs')
    else requireValue(raw.methodology?.trialDurationMs == null, 'exploratory: unexpected trialDurationMs')
  }
  const keys = new Set(), warnings = []
  raw.results.forEach((row, index) => {
    const label = `${kind}.results[${index}]`
    requireValue(row && typeof row === 'object', `${label}: expected row object`)
    requireValue(ids.includes(row.id), `${label}.id: unsupported workload ${row.id}`)
    requireValue(['original', 'fixed'].includes(row.variant), `${label}.variant: unsupported variant`)
    integer(row.repeat, `${label}.repeat`, 1); requireValue(row.repeat <= repeats, `${label}.repeat: out of range`)
    const key = `${row.id}/${row.repeat}/${row.variant}`
    requireValue(!keys.has(key), `${label}: duplicate row ${key}`); keys.add(key)
    same(row.sourceHash, expectedHashes[row.variant], `${label}.sourceHash`)
    integer(row.count, `${label}.count`, 1); number(row.wallMs, `${label}.wallMs`, Number.MIN_VALUE)
    samples(row.latenciesMs, `${label}.latenciesMs`); same(row.latenciesMs.length, row.count, `${label}.latenciesMs length`)
    close(row.operationsPerSecond, row.count * 1000 / row.wallMs, `${label}.operationsPerSecond`)
    if (steady) {
      same(row.variant, treatments[row.id][0], `${label}.variant`); same(row.signal, treatments[row.id][1], `${label}.signal`)
      same(row.bytes, 4194304, `${label}.bytes`); same(row.concurrency, 1, `${label}.concurrency`)
      same(row.sham === true, row.id === 'S', `${label}.sham`)
      const expectedId = raw.design.order[row.repeat - 1][index % ids.length]
      same(row.id, expectedId, `${label}: recorded block order`)
      same(row.repeat, Math.floor(index / ids.length) + 1, `${label}: recorded block repetition`)
      // The historical worker uses upper-middle order statistic, not averaged median.
      close(row.medianLatencyMs, [...row.latenciesMs].sort((a, b) => a - b)[Math.floor(row.count / 2)], `${label}.medianLatencyMs`)
      number(row.rssBytes, `${label}.rssBytes`, 1); number(row.cpuMsPerOperation, `${label}.cpuMsPerOperation`)
      for (const phase of ['usageBefore', 'usageAfter']) {
        requireValue(row[phase] && typeof row[phase] === 'object', `${label}.${phase}: required`)
        for (const field of ['userCPUTime', 'systemCPUTime']) number(row[phase][field], `${label}.${phase}.${field}`)
      }
      // resourceUsage snapshots bracket additional diagnostics; they are not the
      // process.cpuUsage interval used for this metric. Do not invent equality.
      for (const field of ['userCPUTime', 'systemCPUTime']) requireValue(row.usageAfter[field] >= row.usageBefore[field], `${label}.${field}: cumulative CPU counter decreased`)
      requireValue(row.warmup && typeof row.warmup === 'object', `${label}.warmup: required`)
      const windows = row.warmup.windowsMsPerOperation
      samples(windows, `${label}.warmup.windowsMsPerOperation`); requireValue(windows.length >= 3, `${label}.warmup: at least three windows required`)
      const last = windows.slice(-3), mean = last.reduce((a, b) => a + b, 0) / 3
      requireValue(mean > 0, `${label}.warmup: window mean must be positive`)
      const cv = Math.sqrt(last.reduce((sum, v) => sum + (v - mean) ** 2, 0) / 3) / mean
      close(row.warmup.coefficientOfVariation, cv, `${label}.warmup.coefficientOfVariation`)
      same(row.warmup.stableByPredefinedRule, cv <= .15, `${label}.warmup.stableByPredefinedRule`)
      if (!row.warmup.stableByPredefinedRule) warnings.push(`${key}: warm-up rule not met; retained as inconclusive evidence`)
    } else {
      const [size, concurrency, signal, cancel, fixedCount] = cases[row.id]
      same(row.size, size, `${label}.size`); same(row.concurrency, concurrency, `${label}.concurrency`)
      same(row.signal, signal, `${label}.signal`); same(row.cancel, cancel, `${label}.cancel`)
      if (kind === 'exploratory') { same(row.count, fixedCount, `${label}.count`); requireValue(row.durationMs == null, `${label}: exploratory durationMs must be absent`) }
      else { same(row.durationMs, 2000, `${label}.durationMs`); integer(row.cap, `${label}.cap`, 1); requireValue(row.count <= row.cap, `${label}.count exceeds cap`) }
      for (const field of ['successes', 'aborts', 'producedBytes']) integer(row[field], `${label}.${field}`)
      const aborted = cancel && row.variant === 'fixed'
      same(row.aborts, aborted ? row.count : 0, `${label}.aborts`); same(row.successes, aborted ? 0 : row.count, `${label}.successes`)
      requireValue(row.producedBytes > 0 && row.producedBytes <= size * row.count, `${label}.producedBytes: outside source bounds`)
      if (!aborted) same(row.producedBytes, size * row.count, `${label}.producedBytes`)
      for (const [field, q] of [['p50Ms', .5], ['p95Ms', .95], ['p99Ms', .99]]) close(row[field], percentile(row.latenciesMs, q), `${label}.${field}`)
      samples(row.cancellationLatenciesMs, `${label}.cancellationLatenciesMs`)
      same(row.cancellationLatenciesMs.length, cancel ? row.count : 0, `${label}.cancellationLatenciesMs length`)
      for (const [field, q] of [['cancellationP50Ms', .5], ['cancellationP95Ms', .95]]) {
        if (cancel) close(row[field], percentile(row.cancellationLatenciesMs, q), `${label}.${field}`)
        else same(row[field], null, `${label}.${field}`)
      }
      for (const field of ['cpuUserMs', 'cpuSystemMs', 'sampledPeakRssBytes']) number(row[field], `${label}.${field}`)
    }
  })
  for (const id of ids) for (let repeat = 1; repeat <= repeats; repeat++) {
    for (const variant of steady ? [treatments[id][0]] : ['original', 'fixed']) requireValue(keys.has(`${id}/${repeat}/${variant}`), `${kind}: missing paired row ${id}/${repeat}/${variant}`)
  }
  return { kind, rows: raw.results.length, warnings }
}

export function summarizePairedDataset(raw, options) {
  const checked = validateBenchmarkDataset(raw, options)
  requireValue(checked.kind !== 'steady', 'Unsupported summary schema: steady requires its own diagnostic interpretation')
  const range = values => ({ median: median(values), min: Math.min(...values), max: Math.max(...values) })
  const workloads = [...new Set(raw.results.map(row => row.id))].map(id => {
    const variants = ['original', 'fixed'].map(variant => {
      const rows = raw.results.filter(row => row.id === id && row.variant === variant)
      return { variant, repetitions: rows.length, measuredOperations: rows.reduce((sum, row) => sum + row.count, 0),
        operationsPerSecond: range(rows.map(row => row.operationsPerSecond)),
        p50Ms: range(rows.map(row => row.p50Ms)), p95Ms: range(rows.map(row => row.p95Ms)), p99Ms: range(rows.map(row => row.p99Ms)),
        cpuMsPerOperation: range(rows.map(row => (row.cpuUserMs + row.cpuSystemMs) / row.count)),
        sourceBytesPerOperation: range(rows.map(row => row.producedBytes / row.count)),
        sampledPeakRssMiB: range(rows.map(row => row.sampledPeakRssBytes / 1048576)),
        cancellationP95Ms: rows[0].cancel ? range(rows.map(row => row.cancellationP95Ms)) : null }
    })
    const original = raw.results.filter(row => row.id === id && row.variant === 'original')
    const changes = original.map(a => { const b = raw.results.find(row => row.id === id && row.variant === 'fixed' && row.repeat === a.repeat); return (b.operationsPerSecond / a.operationsPerSecond - 1) * 100 })
    return { id, variants, pairedThroughputChangesPercent: changes, everyFixedRunSlower: changes.every(v => v < 0),
      note: original[0].cancel ? 'Different outcomes: rejected cancellation versus completed transfer. Do not market throughput ratio as general speedup.' : 'Local observations; repeatability does not alone establish attribution.' }
  })
  return { sourceRecordedAt: raw.recordedAt, environment: raw.environment, aggregation: 'Median/min/max of run-level metrics, not pooled request percentiles.', workloads }
}

export function validateSummary(actual, expected, label = 'summary') {
  if (typeof expected === 'number') {
    requireValue(typeof actual === 'number' && Number.isFinite(actual) && Math.abs(actual - expected) <= 1e-8 * Math.max(1, Math.abs(expected)), `${label}: recorded ${actual}, recalculated ${expected}`)
  } else if (Array.isArray(expected)) {
    requireValue(Array.isArray(actual) && actual.length === expected.length, `${label}: array length/schema mismatch`)
    expected.forEach((value, i) => validateSummary(actual[i], value, `${label}[${i}]`))
  } else if (expected && typeof expected === 'object') {
    requireValue(actual && typeof actual === 'object' && !Array.isArray(actual), `${label}: expected object`)
    same(Object.keys(actual).sort().join('\0'), Object.keys(expected).sort().join('\0'), `${label}: fields`)
    for (const [key, value] of Object.entries(expected)) validateSummary(actual[key], value, `${label}.${key}`)
  } else same(actual, expected, label)
  return true
}

export function safeArtifactPath(value) {
  requireValue(typeof value === 'string' && value.length > 0 && !value.includes('\\') && !value.includes('\0') && !value.startsWith('/') && !/^[a-z]:/i.test(value), 'manifest artifact path must be relative to repository')
  requireValue(value.split('/').every(part => part && part !== '.' && part !== '..') && !value.split('/').some(part => ['.git', 'node_modules'].includes(part)) && !value.startsWith('evidence/local/'), `manifest artifact path is unsafe: ${value}`)
  return value
}
export function validateManifest(manifest, readArtifact) {
  requireValue(manifest && Array.isArray(manifest.artifacts) && manifest.artifacts.length > 0, 'manifest.artifacts: nonempty array required')
  const seen = new Set()
  for (const entry of manifest.artifacts) {
    requireValue(entry && typeof entry === 'object', 'manifest artifact must be an object')
    const name = safeArtifactPath(entry.path)
    requireValue(!seen.has(name), `manifest duplicate artifact: ${name}`); seen.add(name)
    integer(entry.bytes, `manifest ${name}.bytes`); requireValue(/^[a-f0-9]{64}$/.test(entry.sha256 ?? ''), `manifest ${name}.sha256: invalid digest`)
    let bytes
    try { bytes = readArtifact(name) } catch (error) { throw new Error(`manifest ${name}: cannot read artifact: ${error.message}`) }
    requireValue(Buffer.isBuffer(bytes) || bytes instanceof Uint8Array, `manifest ${name}: reader must return bytes`)
    same(bytes.byteLength, entry.bytes, `manifest ${name} byte size`)
    same(createHash('sha256').update(bytes).digest('hex'), entry.sha256, `manifest ${name} SHA-256`)
  }
  return { artifacts: seen.size }
}
