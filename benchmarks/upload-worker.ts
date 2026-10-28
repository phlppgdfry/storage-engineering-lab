import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { Readable } from 'node:stream'
import { pathToFileURL } from 'node:url'

const checkout = process.cwd()
const spec = JSON.parse(process.argv[2])
const root = await mkdtemp(path.join(os.tmpdir(), 'storage-upload-benchmark-'))
process.env.STORAGE_FILE_BACKEND_PATH = root
process.env.STORAGE_FILE_ETAG_ALGORITHM = 'md5'
const { getConfig } = await import(pathToFileURL(path.join(checkout, 'src/config.ts')).href)
getConfig({ reload: true })
const { FileBackend } = await import(pathToFileURL(path.join(checkout, 'src/storage/backend/file.ts')).href)
const backend = new FileBackend()
const payload = Buffer.alloc(spec.size, 0x37)
const expectedETag = `"${createHash('md5').update(payload).digest('hex')}"`
const latencies: number[] = []
const cancellationLatencies: number[] = []
let producedBytes = 0
let successes = 0
let aborts = 0
let next = 0
let peakRss = process.memoryUsage().rss

async function upload(index: number, measured: boolean) {
  const controller = new AbortController()
  let abortedAt = 0
  async function* chunks() {
    for (let offset = 0; offset < payload.length; offset += 65536) {
      const chunk = payload.subarray(offset, offset + 65536)
      if (measured) producedBytes += chunk.length
      yield chunk
      if (spec.cancel && offset === 0) {
        abortedAt = performance.now()
        controller.abort()
      }
      if (spec.cancel) await new Promise<void>((resolve) => setImmediate(resolve))
    }
  }
  const start = performance.now()
  try {
    const value = await backend.uploadObject('bench', `object-${index}`, undefined,
      Readable.from(chunks()), 'application/octet-stream', 'no-cache',
      spec.signal ? controller.signal : undefined)
    assert.equal(value.size, payload.length)
    assert.equal(value.eTag, expectedETag)
    if (measured) successes++
  } catch (error) {
    assert(spec.cancel && spec.variant === 'fixed', `Unexpected upload failure: ${String(error)}`)
    assert.equal((error as { code: string }).code, 'AbortedTerminate')
    if (measured) aborts++
  } finally {
    if (measured) {
      latencies.push(performance.now() - start)
      if (abortedAt) cancellationLatencies.push(performance.now() - abortedAt)
    }
  }
}

function percentile(values: number[], q: number) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.max(0, Math.ceil(sorted.length * q) - 1)] ?? null
}

try {
  // Warm the actual implementation, native module and write path outside measurement.
  const warmStart = performance.now()
  let warmCount = 0
  do { await upload(-++warmCount, false) } while (warmCount < 4 || (spec.durationMs && performance.now() - warmStart < 250))
  const cpuStart = process.cpuUsage()
  const wallStart = performance.now()
  const rssTimer = setInterval(() => { peakRss = Math.max(peakRss, process.memoryUsage().rss) }, 5)
  try {
    await Promise.all(Array.from({ length: spec.concurrency }, async () => {
      for (;;) {
        if (spec.durationMs && performance.now() - wallStart >= spec.durationMs) return
        const index = next++
        if (index >= spec.count) return
        await upload(index, true)
      }
    }))
  } finally {
    clearInterval(rssTimer)
  }
  const wallMs = performance.now() - wallStart
  const cpu = process.cpuUsage(cpuStart)
  peakRss = Math.max(peakRss, process.memoryUsage().rss)
  const count = successes + aborts
  assert(count > 0)
  if (!spec.durationMs) assert.equal(count, spec.count)
  if (spec.cancel && spec.variant === 'fixed') assert.equal(aborts, count)
  else assert.equal(successes, count)
  console.log(JSON.stringify({ ...spec, cap: spec.count, count, wallMs, successes, aborts, producedBytes,
    operationsPerSecond: count / (wallMs / 1000),
    p50Ms: percentile(latencies, .50), p95Ms: percentile(latencies, .95), p99Ms: percentile(latencies, .99),
    cancellationP50Ms: percentile(cancellationLatencies, .50),
    cancellationP95Ms: percentile(cancellationLatencies, .95),
    cpuUserMs: cpu.user / 1000, cpuSystemMs: cpu.system / 1000, sampledPeakRssBytes: peakRss,
    latenciesMs: latencies, cancellationLatenciesMs: cancellationLatencies,
  }))
} finally {
  backend.close()
  await rm(root, { recursive: true, force: true })
}
