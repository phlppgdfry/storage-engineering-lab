import assert from 'node:assert/strict'
import fs from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'
import { once } from 'node:events'
import { pathToFileURL } from 'node:url'

const checkout = path.resolve(process.argv[2])
const root = await mkdtemp(path.join(tmpdir(), 'download-probe-'))
process.env.STORAGE_FILE_BACKEND_PATH = root
process.env.STORAGE_FILE_ETAG_ALGORITHM = 'mtime'
let backend: any
const original = fs.createReadStream
try {
  const { getConfig } = await import(pathToFileURL(path.join(checkout, 'src/config.ts')).href)
  getConfig({ reload: true })
  const { FileBackend } = await import(pathToFileURL(path.join(checkout, 'src/storage/backend/file.ts')).href)
  backend = new FileBackend()
  const size = 4 * 1024 * 1024
  await backend.uploadObject('bucket', 'object', undefined, Readable.from(Buffer.alloc(size, 97)), 'text/plain', 'no-cache')
  const observations = []
  for (const range of [undefined, 'bytes=0-1048575']) {
    const controller = new AbortController()
    const result = await backend.getObject('bucket', 'object', undefined, { range }, controller.signal)
    let bytes = 0
    for await (const chunk of result.body) {
      bytes += chunk.length
      if (!controller.signal.aborted) controller.abort()
    }
    assert.equal(bytes, range ? 1048576 : size)
    assert.equal(result.body.closed, true)
    observations.push({ trigger: 'signal during consumption', range: range ?? null, bytes, closed: result.body.closed })
    const control = await backend.getObject('bucket', 'object', undefined, { range })
    const closed = once(control.body, 'close')
    // Explicit consumer cleanup is an alternative explanation for safe HTTP behavior.
    control.body.destroy()
    await closed
    assert.equal(control.body.closed, true)
    observations.push({ trigger: 'consumer destroy control', range: range ?? null, bytes: control.body.bytesRead, closed: control.body.closed })
  }
  backend.etagAlgorithm = 'md5'
  const controller = new AbortController()
  let hashStream: fs.ReadStream | undefined
  // Observe the native open event without putting a stream in flowing mode.
  fs.createReadStream = ((...args: Parameters<typeof fs.createReadStream>) => {
    const stream = original(...args)
    if (!hashStream) { hashStream = stream; stream.once('open', () => controller.abort()) }
    return stream
  }) as typeof fs.createReadStream
  const result = await backend.getObject('bucket', 'object', undefined, {}, controller.signal)
  fs.createReadStream = original
  const closed = once(result.body, 'close'); result.body.destroy(); await closed
  assert.equal(controller.signal.aborted, true)
  assert.equal(hashStream?.bytesRead, size)
  assert.equal(hashStream?.closed, true)
  observations.push({ trigger: 'abort at MD5 native open', bytesHashedRead: hashStream?.bytesRead, closed: hashStream?.closed, outcome: 'resolved' })
  console.log(JSON.stringify({ observations, scope: 'Native adapter; no HTTP disconnect or production leak established' }))
} finally {
  fs.createReadStream = original
  try { await backend?.close() } finally { await rm(root, { recursive: true, force: true }) }
}
