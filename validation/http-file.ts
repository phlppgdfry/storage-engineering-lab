import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { mkdtemp, readdir, stat, rm, writeFile } from 'node:fs/promises'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = await mkdtemp(path.join(os.tmpdir(), 'storage-http-file-validation-'))
Object.assign(process.env, { STORAGE_BACKEND: 'file', STORAGE_FILE_BACKEND_PATH: root,
  STORAGE_FILE_ETAG_ALGORITHM: 'md5', OTEL_METRICS_ENABLED: 'false', PROMETHEUS_METRICS_ENABLED: 'false' })
const checkout = '/workspace/storage'
const { getConfig, setEnvPaths } = await import(pathToFileURL(path.join(checkout, 'src/config.ts')).href)
setEnvPaths(['.env.test', '.env'])
const config = getConfig({ reload: true })
const { default: build } = await import(pathToFileURL(path.join(checkout, 'src/app.ts')).href)
const database = await import(pathToFileURL(path.join(checkout, 'src/internal/database/index.ts')).href)
const app = build()
const serviceKey = await config.serviceKeyAsync
const headers = { authorization: `Bearer ${serviceKey}` }
const bucket = `lab-completion-${randomUUID()}`
const payload = Buffer.alloc(262144, 0x29)
const checks: string[] = []

async function stages(directory: string): Promise<{ file: string, size: number }[]> {
  const result: { file: string, size: number }[] = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) result.push(...await stages(file))
    else if (entry.name.endsWith('.tmp')) {
      try { result.push({ file, size: (await stat(file)).size }) } catch {}
    }
  }
  return result
}
async function waitFor(check: () => Promise<boolean>, message: string) {
  const deadline = Date.now() + 10_000
  while (Date.now() < deadline) {
    if (await check()) return
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  throw new Error(message)
}
let base = ''
let created = false
try {
  await app.listen({ host: '127.0.0.1', port: 0 })
  const address = app.server.address()
  assert(address && typeof address !== 'string')
  base = `http://127.0.0.1:${address.port}`
  let response = await fetch(`${base}/bucket`, { method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ id: bucket, name: bucket }) })
  assert.equal(response.status, 200, await response.text())
  created = true
  checks.push('real PostgreSQL bucket creation')
  const objectUrl = `${base}/object/${bucket}/payload.bin`
  response = await fetch(objectUrl, { method: 'POST', headers: { ...headers, 'content-type': 'application/octet-stream' }, body: payload })
  assert.equal(response.status, 200, await response.text())
  response = await fetch(objectUrl, { headers })
  assert.equal(response.status, 200)
  const etag = response.headers.get('etag')
  assert(etag)
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), payload)
  assert.equal(etag, `"${createHash('md5').update(payload).digest('hex')}"`)
  checks.push('real HTTP upload/download; native bytes, xattrs and ETag')
  response = await fetch(objectUrl, { headers: { ...headers, range: 'bytes=7-39' } })
  assert.equal(response.status, 206)
  assert.equal(response.headers.get('content-range'), `bytes 7-39/${payload.length}`)
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), payload.subarray(7, 40))
  checks.push('range response bytes and metadata')
  response = await fetch(objectUrl, { headers: { ...headers, 'if-none-match': etag } })
  assert.equal(response.status, 304)
  checks.push('conditional retrieval')

  const request = http.request(objectUrl, { method: 'POST', headers: { ...headers,
    'content-type': 'application/octet-stream', 'content-length': 1048576, 'x-upsert': 'true' } })
  request.on('error', () => {})
  const closed = new Promise<void>(resolve => request.once('close', () => resolve()))
  try {
    request.write(Buffer.alloc(65536, 0x51))
    await waitFor(async () => (await stages(root)).some(item => item.size >= 65536), 'partial upload did not reach a real staging file')
    request.destroy()
    await closed
  } finally {
    request.destroy()
  }
  await waitFor(async () => (await stages(root)).length === 0, 'staged file remained after disconnect')
  response = await fetch(objectUrl, { headers })
  assert.equal(response.status, 200)
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), payload)
  checks.push('disconnect after actual partial disk write: staging cleaned, old object still readable')

  await writeFile('/evidence/integration/http-file.json', JSON.stringify({
    recordedAt: new Date().toISOString(), commit: '3bbc971796fe9907a030c4fc70a07d440930d7b2',
    database: 'real isolated PostgreSQL 17', backend: 'native Linux FileBackend', checks,
    limitation: 'End-to-end regression assurance; not proof that an HTTP disconnect bypassed source-error handling on the parent.'
  }, null, 2) + '\n')
  console.log(`HTTP FILE PASS: ${checks.length} checks`)
} finally {
  if (created && base) {
    await fetch(`${base}/object/${bucket}/payload.bin`, { method: 'DELETE', headers }).catch(() => {})
    await fetch(`${base}/bucket/${bucket}`, { method: 'DELETE', headers }).catch(() => {})
  }
  await app.close()
  await database.PgTenantConnection.stop()
  await database.shutdownMultitenantPg()
  await rm(root, { recursive: true, force: true })
}
