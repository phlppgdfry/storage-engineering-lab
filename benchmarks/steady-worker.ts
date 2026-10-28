import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { Readable } from 'node:stream'
import { pathToFileURL } from 'node:url'

const spec = JSON.parse(process.argv[2])
const root = await mkdtemp(path.join(os.tmpdir(), 'storage-steady-bench-'))
Object.assign(process.env, { STORAGE_FILE_BACKEND_PATH: root, STORAGE_FILE_ETAG_ALGORITHM: 'md5' })
const { getConfig } = await import(pathToFileURL(path.join(process.cwd(), 'src/config.ts')).href)
getConfig({ reload: true })
const { FileBackend } = await import(pathToFileURL(path.join(process.cwd(), 'src/storage/backend/file.ts')).href)
const backend = new FileBackend()
const payload = Buffer.alloc(4194304, 0x37)
const expected = `"${createHash('md5').update(payload).digest('hex')}"`
const chunks = Array.from({ length: 64 }, (_, i) => payload.subarray(i * 65536, (i + 1) * 65536))
const observations: number[] = []
async function upload() {
  const controller = new AbortController()
  const begin = performance.now()
  const value = await backend.uploadObject('bench', 'constant-key', undefined, Readable.from(chunks),
    'application/octet-stream', 'no-cache', spec.signal ? controller.signal : undefined)
  assert.equal(value.size, payload.length)
  assert.equal(value.eTag, expected)
  return performance.now() - begin
}
async function diagnostics() {
  const result: Record<string, string> = {}
  for (const name of ['/sys/fs/cgroup/cpu.stat', '/sys/fs/cgroup/cpu.max', '/sys/fs/cgroup/memory.max', '/sys/fs/cgroup/memory.events', '/sys/fs/cgroup/io.stat', '/proc/pressure/io', '/proc/pressure/cpu']) {
    try { result[name] = await readFile(name, 'utf8') } catch {}
  }
  return result
}
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
try {
  const warmStart = performance.now()
  const windows: number[] = []
  let warmCv = Infinity
  while (performance.now() - warmStart < 6000) {
    const start = performance.now()
    let count = 0
    do { await upload(); count++ } while (performance.now() - start < 500)
    windows.push((performance.now() - start) / count)
    if (windows.length >= 3) {
      const last = windows.slice(-3)
      const mean = last.reduce((a, b) => a + b, 0) / last.length
      warmCv = Math.sqrt(last.reduce((a, b) => a + (b - mean) ** 2, 0) / last.length) / mean
      if (performance.now() - warmStart >= 2000 && warmCv <= .15) break
    }
  }
  const before = await diagnostics()
  const cpuStart = process.cpuUsage()
  const usageBefore = process.resourceUsage()
  const start = performance.now()
  do { observations.push(await upload()) } while (performance.now() - start < 2500)
  const wallMs = performance.now() - start
  const cpu = process.cpuUsage(cpuStart)
  const after = await diagnostics()
  const usageAfter = process.resourceUsage()
  console.log(JSON.stringify({ ...spec, count: observations.length, wallMs,
    operationsPerSecond: observations.length / (wallMs / 1000),
    medianLatencyMs: median(observations), cpuMsPerOperation: (cpu.user + cpu.system) / 1000 / observations.length,
    warmup: { windowsMsPerOperation: windows, coefficientOfVariation: warmCv, stableByPredefinedRule: warmCv <= .15 },
    before, after, usageBefore, usageAfter, rssBytes: process.memoryUsage().rss, latenciesMs: observations,
  }))
} finally {
  backend.close()
  await rm(root, { recursive: true, force: true })
}
