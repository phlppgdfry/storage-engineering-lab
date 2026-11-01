import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pathToFileURL } from 'node:url'

// Use the actual adapter, native xattrs and real files. No dependency mocks.
const checkout = path.resolve(process.argv[2])
const root = await mkdtemp(path.join(tmpdir(), 'storage-cancellation-probe-'))
process.env.STORAGE_FILE_BACKEND_PATH = root
process.env.STORAGE_FILE_ETAG_ALGORITHM = 'mtime'

let cleanupBackend: (() => void) | undefined
try {
const { getConfig } = await import(pathToFileURL(path.join(checkout, 'src/config.ts')).href)
getConfig({ reload: true })
const { FileBackend } = await import(pathToFileURL(path.join(checkout, 'src/storage/backend/file.ts')).href)
const backend = new FileBackend()
cleanupBackend = () => backend.close()

async function settle(promise: Promise<unknown>) {
  try {
    await promise
    return { outcome: 'resolved', code: null }
  } catch (error) {
    return { outcome: 'rejected', code: (error as { code?: string }).code ?? null }
  }
}

  const cancelled = new AbortController()
  cancelled.abort()
  const preAborted = await settle(backend.uploadObject(
    'bucket', 'pre-aborted', undefined, Readable.from('cancelled'),
    'text/plain', 'no-cache', cancelled.signal
  ))
  const preAbortedPublished = await readFile(path.join(root, 'bucket/pre-aborted'), 'utf8')
    .then(() => true, error => { if (error.code === 'ENOENT') return false; throw error })

  await backend.uploadObject('bucket', 'active', undefined, Readable.from('old'), 'text/plain', 'no-cache')
  const controller = new AbortController()
  const body = new Readable({ read() {} })
  const started = new Promise<void>((resolve) => body.once('resume', () => resolve()))
  const activePromise = settle(backend.uploadObject(
    'bucket', 'active', undefined, body, 'text/plain', 'no-cache', controller.signal
  ))
  body.push('partial')
  await started
  controller.abort()
  const sourceDestroyedOnAbort = body.destroyed
  // Also finish on baseline, so the reproducer never waits indefinitely for cancellation.
  body.push('remaining')
  body.push(null)
  const active = await activePromise
  const finalContents = await readFile(path.join(root, 'bucket/active'), 'utf8')
  const stagingFiles = (await readdir(path.join(root, 'bucket'))).filter((name) => name.endsWith('.tmp'))
  console.log(JSON.stringify({
    preAborted: { ...preAborted, published: preAbortedPublished },
    active: { ...active, sourceDestroyedOnAbort, finalContents, stagingFiles }
  }))
} finally {
  try { cleanupBackend?.() } finally { await rm(root, { recursive: true, force: true }) }
}
