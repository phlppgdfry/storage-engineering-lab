import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { parseEvidence, validateBenchmarkDataset, summarizePairedDataset, validateSummary, validateManifest } from '../scripts/evidence.mjs'
import { markdownTargets, validateRegistry, recommendNext } from '../scripts/check.mjs'

const load = kind => parseEvidence(readFileSync(fileURLToPath(new URL(`../evidence/completion/performance-${kind}.json.gz`, import.meta.url))), { gzip: true })
test('all retained datasets validate their real arithmetic and hashes without claiming performance approval', () => {
  for (const kind of ['exploratory', 'timed', 'steady']) {
    const result = validateBenchmarkDataset(load(kind), { kind })
    assert.equal(result.rows, kind === 'steady' ? 30 : 50)
    if (kind === 'steady') assert.equal(result.warnings.length, 1)
  }
})
test('retained summaries equal recalculated observations', () => {
  for (const kind of ['exploratory', 'timed']) {
    const summary = JSON.parse(readFileSync(fileURLToPath(new URL(`../evidence/completion/performance-${kind}-summary.json`, import.meta.url))))
    assert.equal(validateSummary(summary, summarizePairedDataset(load(kind), { kind })), true)
  }
})
test('corrupt gzip, malformed JSON and unsupported schema fail', () => {
  assert.throws(() => parseEvidence(Buffer.from('broken'), { gzip: true }), /invalid gzip\/JSON/)
  assert.throws(() => parseEvidence(gzipSync(Buffer.from('{oops')), { gzip: true }), /invalid gzip\/JSON/)
  assert.throws(() => validateBenchmarkDataset(load('timed'), { kind: 'guess' }), /Unsupported dataset schema/)
  const raw = load('timed'); raw.schemaVersion = 999
  assert.throws(() => validateBenchmarkDataset(raw, { kind: 'timed' }), /schemaVersion/)
})
test('missing pair and duplicate rows cannot silently produce a summary', () => {
  const missing = load('timed'); missing.results.pop()
  assert.throws(() => summarizePairedDataset(missing, { kind: 'timed' }), /row count/)
  const duplicate = load('timed'); duplicate.results[1] = structuredClone(duplicate.results[0])
  assert.throws(() => summarizePairedDataset(duplicate, { kind: 'timed' }), /duplicate row/)
})
test('wrong counts, nonfinite/null metrics, modified percentiles and hashes fail', () => {
  for (const [field, value, expected] of [['count', 0, /count/], ['wallMs', Infinity, /wallMs/], ['operationsPerSecond', null, /operationsPerSecond/], ['p95Ms', NaN, /p95Ms/], ['sourceHash', '0'.repeat(64), /sourceHash/], ['producedBytes', -1, /producedBytes/]]) {
    const raw = load('timed'); raw.results[0][field] = value
    assert.throws(() => validateBenchmarkDataset(raw, { kind: 'timed' }), expected)
  }
  const raw = load('timed'); raw.results[0].latenciesMs.pop()
  assert.throws(() => validateBenchmarkDataset(raw, { kind: 'timed' }), /latenciesMs length/)
  const changed = load('timed'); changed.results[0].p95Ms += 1
  assert.throws(() => validateBenchmarkDataset(changed, { kind: 'timed' }), /recalculated/)
})
test('steady controls reject altered warm-up flags, treatment identity and missing blocks', () => {
  const flag = load('steady'); flag.results[0].warmup.stableByPredefinedRule = !flag.results[0].warmup.stableByPredefinedRule
  assert.throws(() => validateBenchmarkDataset(flag, { kind: 'steady' }), /stableByPredefinedRule/)
  const treatment = load('steady'); treatment.results[0].signal = false
  assert.throws(() => validateBenchmarkDataset(treatment, { kind: 'steady' }), /signal/)
  const missing = load('steady'); missing.design.order.pop()
  assert.throws(() => validateBenchmarkDataset(missing, { kind: 'steady' }), /block count/)
})
test('tampered summary cannot pass numeric/structural comparison', () => {
  const expected = summarizePairedDataset(load('timed'), { kind: 'timed' }), actual = structuredClone(expected)
  actual.workloads[0].variants[0].operationsPerSecond.median += 1
  assert.throws(() => validateSummary(actual, expected), /recalculated/)
  assert.throws(() => validateSummary({}, expected), /fields/)
})
test('manifest detects tampering, size mismatch, duplicates and traversal before reading', () => {
  const bytes = Buffer.from('preserved evidence'), entry = { path: 'evidence/result.json', bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }
  assert.deepEqual(validateManifest({ artifacts: [entry] }, () => bytes), { artifacts: 1 })
  assert.throws(() => validateManifest({ artifacts: [entry] }, () => Buffer.from('x'.repeat(bytes.length))), /SHA-256/)
  assert.throws(() => validateManifest({ artifacts: [entry] }, () => Buffer.from('x')), /byte size/)
  assert.throws(() => validateManifest({ artifacts: [entry, entry] }, () => bytes), /duplicate artifact/)
  for (const path of ['../secret', '/etc/passwd', 'a/../../secret', 'a\\..\\secret', 'evidence/local/private.json', '.git/config']) {
    let read = false
    assert.throws(() => validateManifest({ artifacts: [{ ...entry, path }] }, () => { read = true; return bytes }), /path/)
    assert.equal(read, false)
  }
})
test('Markdown parser checks links/references but ignores fenced and inline code examples', () => {
  const source = '[ok](docs/a.md)\n[ref]: <docs/b file.md>\n`[example](missing.md)`\n```sh\n[also example](missing.md)\n```\n'
  assert.deepEqual(markdownTargets(source), ['docs/a.md', 'docs/b file.md'])
})
test('check CLI help is dependency-free and unknown input is actionable JSON with nonzero status', () => {
  const script = fileURLToPath(new URL('../scripts/check.mjs', import.meta.url))
  const help = spawnSync(process.execPath, [script, '--help'], { encoding: 'utf8' })
  assert.equal(help.status, 0); assert.match(help.stdout, /Offline, read-only/)
  const invalid = spawnSync(process.execPath, [script, '--json', '--unknown'], { encoding: 'utf8' })
  assert.equal(invalid.status, 1)
  const result = JSON.parse(invalid.stdout)
  assert.equal(result.ok, false); assert.match(result.errors[0], /Unknown argument.*--help/)
})
const registry = () => JSON.parse(readFileSync(fileURLToPath(new URL('../research/hypotheses.json', import.meta.url))))
test('canonical registry preserves historical states and recommends only eligible work deterministically', () => {
  const raw = registry(), result = validateRegistry(raw)
  assert.equal(result.hypotheses, 5); assert.equal(result.recommendation.id, 'H002')
  assert.equal(raw.hypotheses[0].status, 'UPSTREAM SUBMITTED')
  assert.deepEqual(raw.hypotheses.map(item => item.legacyStatus), ['CONFIRMED_ADAPTER_DEFECT', 'SUSPECTED', 'SUSPECTED', 'OVERLAPPING_WORK', 'DEFERRED'])
  assert.equal(raw.hypotheses[0].source.commit, '3bbc971796fe9907a030c4fc70a07d440930d7b2')
  const shuffled = structuredClone(raw); shuffled.hypotheses.reverse()
  assert.deepEqual(recommendNext(shuffled), result.recommendation)
  const deferred = structuredClone(raw); deferred.hypotheses[1].disposition = 'deferred'
  assert.equal(recommendNext(deferred).id, 'H003')
})
test('registry rejects unsupported statuses/schema, lost provenance, nonexistent references and unsafe paths', () => {
  for (const mutate of [raw => { raw.schemaVersion = 2 }, raw => { raw.hypotheses[0].status = 'CONFIRMED_ADAPTER_DEFECT' }, raw => { delete raw.hypotheses[0].legacyStatus }, raw => { raw.hypotheses[0].source.commit = 'HEAD' }, raw => { raw.hypotheses[0].evidence = [] }, raw => { raw.hypotheses[0].nextAction = '' }, raw => { raw.hypotheses[1].id = raw.hypotheses[0].id }, raw => { raw.hypotheses[0].upstream.observationEvidence = 'missing.md' }]) {
    const raw = registry(); mutate(raw)
    assert.throws(() => validateRegistry(raw), /research registry/)
  }
  assert.throws(() => validateRegistry(registry(), { exists: () => false }), /missing file/)
  const unsafe = registry(); unsafe.hypotheses[0].evidence[0].path = '../outside.md'
  assert.throws(() => validateRegistry(unsafe), /path/)
})
test('summarize CLI rejects incomplete evidence with no reassuring output and preserves valid output', () => {
  const script = fileURLToPath(new URL('../benchmarks/summarize.mjs', import.meta.url))
  const directory = mkdtempSync(path.join(os.tmpdir(), 'storage-evidence-test-'))
  try {
    const raw = load('timed'); raw.results.pop()
    const invalidPath = path.join(directory, 'missing-pair.json'); writeFileSync(invalidPath, JSON.stringify(raw))
    const failed = spawnSync(process.execPath, [script, invalidPath], { encoding: 'utf8' })
    assert.equal(failed.status, 1); assert.equal(failed.stdout, ''); assert.match(failed.stderr, /SUMMARY FAIL:.*row count/)
    const validPath = fileURLToPath(new URL('../evidence/completion/performance-timed.json.gz', import.meta.url))
    const passed = spawnSync(process.execPath, [script, validPath], { encoding: 'utf8' })
    assert.equal(passed.status, 0); assert.equal(passed.stderr, '')
    assert.deepEqual(JSON.parse(passed.stdout), summarizePairedDataset(load('timed'), { kind: 'timed' }))
  } finally { rmSync(directory, { recursive: true, force: true }) }
})
