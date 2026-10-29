import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import http from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pathToFileURL } from 'node:url'

const checkout = path.resolve(process.argv[2])
const signalForwarded = process.argv[3] === 'forwarded'
const root = await mkdtemp(path.join(tmpdir(), 'http-download-'))
Object.assign(process.env, { STORAGE_FILE_BACKEND_PATH: root, STORAGE_FILE_ETAG_ALGORITHM: 'mtime' })
const load = (file: string) => import(pathToFileURL(path.join(checkout, file)).href)
const original = fs.createReadStream
let backend: any, app: any
let active: any
const size = 16 * 1024 * 1024
const expectedMd5 = createHash('md5').update(Buffer.alloc(size, 97)).digest('hex')
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
async function waitFor(condition: () => boolean, label: string) {
  const deadline = Date.now() + 5000
  while (!condition()) { if (Date.now() >= deadline) throw new Error(`Timeout: ${label}`); await sleep(5) }
}
try {
  const { getConfig } = await load('src/config.ts'); getConfig({ reload: true })
  const { FileBackend } = await load('src/storage/backend/file.ts')
  const { AssetRenderer } = await load('src/storage/renderer/asset.ts')
  const { signals } = await load('src/http/plugins/signals.ts')
  const { default: Fastify } = await import(pathToFileURL(path.join(checkout, 'node_modules/fastify/fastify.js')).href)
  backend = new FileBackend()
  await backend.uploadObject('bucket', 'object', undefined, Readable.from(Buffer.alloc(size, 97)), 'text/plain', 'no-cache')
  app = Fastify({ logger: false })
  await app.register(signals)
  const renderer = new AssetRenderer(backend)
  app.get('/object', async (request: any, reply: any) => {
    const run = active
    run.signal = request.signals.disconnect.signal
    run.signal.addEventListener('abort', () => {
      run.abortSeen = true
      run.headersAtAbort = reply.raw.headersSent
      run.bytesAtAbort = run.streams.map((s: fs.ReadStream) => s.bytesRead)
    }, { once: true })
    try {
      // Same signal/renderer/backend path as getObject route, without DB/auth setup.
      return await renderer.render(request, reply, { bucket: 'bucket', key: 'object', version: undefined, signal: run.signal })
    } finally { run.routeSettled = true }
  })
  await app.listen({ host: '127.0.0.1', port: 0 })
  const port = app.server.address().port
  fs.createReadStream = ((...args: Parameters<typeof fs.createReadStream>) => {
    const stream = original(...args)
    if (active && String(args[0]) === path.join(root, 'bucket/object')) {
      active.streams.push(stream)
      const run = active
      // Observation only: never attach a data listener or throttle native reads.
      if (run.trigger === 'hash-open' && run.streams.length === 1) stream.once('open', () => run.client.destroy())
      if (run.trigger === 'head-control' && run.streams.length === 1) stream.once('open', () => run.controller.abort())
    }
    return stream
  }) as typeof fs.createReadStream
  const observations: any[] = []
  for (const mode of ['complete', 'pre-header-md5', 'mid-body', 'mid-body-range']) {
    backend.etagAlgorithm = mode.includes('md5') || mode === 'complete' ? 'md5' : 'mtime'
    const run: any = { mode, trigger: mode === 'pre-header-md5' ? 'hash-open' : 'client-data', streams: [], abortSeen: false, clientHeaders: false, routeSettled: false, clientBytes: 0, digest: createHash('md5') }
    active = run
    const clientClosed = new Promise<void>(resolve => {
      run.client = http.get({ host: '127.0.0.1', port, path: '/object', agent: false, headers: mode === 'mid-body-range' ? { range: 'bytes=0-1048575' } : {} }, response => {
        run.clientHeaders = true; run.httpStatus = response.statusCode
        run.contentLength = Number(response.headers['content-length']); run.contentRange = response.headers['content-range'] ?? null; run.etag = response.headers.etag
        response.on('error', () => {})
        response.on('data', chunk => {
          run.clientBytes += chunk.length; run.digest.update(chunk)
          if (mode.startsWith('mid-body')) { response.destroy(); run.client.destroy() }
        })
      })
      run.client.on('error', () => {}) // Expected ECONNRESET is not a test pass oracle.
      run.client.once('close', resolve)
    })
    await clientClosed
    await waitFor(() => run.routeSettled && run.streams.length > 0 && run.streams.every((s: fs.ReadStream) => s.closed), mode)
    const streams = run.streams.map((s: fs.ReadStream) => ({ bytesRead: s.bytesRead, closed: s.closed, fd: s.fd }))
    if (mode === 'complete') {
      assert.equal(run.httpStatus, 200); assert.equal(run.clientBytes, size); assert.equal(run.abortSeen, false)
      assert.equal(run.digest.digest('hex'), expectedMd5); assert.equal(run.etag, `"${expectedMd5}"`); assert.equal(run.contentLength, size)
    } else {
      assert.equal(run.abortSeen, true)
      if (mode === 'pre-header-md5') {
        assert.equal(run.clientHeaders, false); assert.equal(run.headersAtAbort, false)
        assert(run.bytesAtAbort[0] < size, 'Disconnect happened too late: inconclusive oracle')
        if (signalForwarded) {
          assert(streams[0].bytesRead < size); assert.equal(streams.length, 1)
        } else {
          assert.equal(streams[0].bytesRead, size)
          assert.equal(streams.length, 2); assert.equal(streams[1].bytesRead, 0)
        }
      } else {
        const responseSize = mode.endsWith('range') ? 1048576 : size
        assert.equal(run.httpStatus, mode.endsWith('range') ? 206 : 200)
        assert.equal(run.contentLength, responseSize); assert(run.clientBytes > 0)
        assert.equal(run.contentRange, mode.endsWith('range') ? `bytes 0-1048575/${size}` : null)
        assert.equal(streams.length, 1); assert(streams[0].bytesRead < responseSize, 'Streaming disconnect did not stop before full body read')
      }
    }
    assert(streams.every((s: any) => s.closed && s.fd === null))
    observations.push({ mode, clientHeaders: run.clientHeaders, httpStatus: run.httpStatus ?? null, clientBytes: run.clientBytes, contentLength: run.contentLength ?? null, contentRange: run.contentRange ?? null, abortSeen: run.abortSeen, headersAtAbort: run.headersAtAbort ?? null, bytesAtAbort: run.bytesAtAbort ?? null, streams, routeSettled: run.routeSettled })
  }
  backend.etagAlgorithm = 'md5'
  active = { trigger: 'head-control', controller: new AbortController(), streams: [] }
  let rejection: any
  try { await backend.headObject('bucket', 'object', undefined, { signal: active.controller.signal }) } catch (error) { rejection = error }
  await waitFor(() => active.streams.length === 1 && active.streams[0].closed, 'HEAD cancellation control')
  assert(active.controller.signal.aborted); assert(rejection)
  assert(rejection === active.controller.signal.reason || rejection.name === 'AbortError' || rejection.code === 'ABORT_ERR')
  assert(active.streams[0].bytesRead < size); assert.equal(active.streams[0].fd, null)
  observations.push({ mode: 'native-head-control', rejected: true, signalAborted: active.controller.signal.aborted, errorName: rejection.name, errorCode: rejection.code ?? null, bytesRead: active.streams[0].bytesRead, closed: active.streams[0].closed, fd: active.streams[0].fd })
  console.log(JSON.stringify({ size, signalForwarded, observations, components: ['actual Fastify', 'actual RequestSignals plugin', 'actual AssetRenderer', 'actual FileBackend/native xattrs'], limitations: ['Minimal local route bypasses authentication/database lookup/CDN/proxy', 'No throttling, mocks or synthetic sleeps in file read path', 'Bytes read are logical native stream bytes, not physical disk IO', signalForwarded ? 'Diagnostic intervention stops pre-header hash; not a complete production fix' : 'No descriptor leak observed; pre-header MD5 work continues after disconnect'] }))
} finally {
  fs.createReadStream = original
  if (active?.client) active.client.destroy()
  if (app) { app.server.closeAllConnections(); await app.close() }
  try { await backend?.close() } finally { await rm(root, { recursive: true, force: true }) }
}
