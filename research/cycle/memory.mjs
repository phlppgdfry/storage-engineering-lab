import { appendFileSync, closeSync, constants, fstatSync, lstatSync, openSync, readFileSync, realpathSync } from 'node:fs'
import path from 'node:path'
import { hash } from '../../scripts/runtime.mjs'
export function readMemory(file, evidenceRoot) {
  let fd
  try { fd = openRegularMemory(file, constants.O_RDONLY) } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
  let bytes
  try { bytes = readFileSync(fd, 'utf8') } finally { closeSync(fd) }
  if (bytes && !bytes.endsWith('\n')) throw new Error('Interrupted memory write; manual reconciliation required')
  const entries = bytes.trim() ? bytes.trimEnd().split('\n').map(line => JSON.parse(line)) : []
  let previous = null
  for (const [index, entry] of entries.entries()) {
    const { digest, ...record } = entry
    if (record.sequence !== index + 1 || record.previous !== previous || digest !== hash(JSON.stringify(record))) throw new Error('Corrupted memory chain')
    if (!['abort', 'cleanup', 'error'].includes(record.experiment) || !['correct', 'ignore-signal', 'cleanup-leak', 'swallow-error'].includes(record.scenario)) throw new Error('Invalid memory catalog identity')
    if (!Array.isArray(record.evidence) || record.evidence.length < 1) throw new Error('Missing evidence references')
    for (const artifact of record.evidence) {
      if (typeof artifact.path !== 'string' || path.isAbsolute(artifact.path) || artifact.path.split(/[\\/]/).includes('..')) throw new Error('Unsafe evidence reference')
      const file = path.join(evidenceRoot, artifact.path)
      const relative = path.relative(realpathSync(evidenceRoot), realpathSync(file))
      if (relative.startsWith('..') || path.isAbsolute(relative) || lstatSync(file).isSymbolicLink() || hash(readFileSync(file)) !== artifact.sha256) throw new Error('Missing or corrupted evidence')
    }
    previous = digest
  }
  return entries
}
export function appendMemory(file, previous, data) {
  const record = { sequence: previous.length + 1, previous: previous.at(-1)?.digest ?? null, ...data }
  const entry = { ...record, digest: hash(JSON.stringify(record)) }
  const fd = openRegularMemory(file, constants.O_WRONLY | constants.O_CREAT | constants.O_APPEND)
  try { appendFileSync(fd, JSON.stringify(entry) + '\n') } finally { closeSync(fd) }
  return entry
}

function openRegularMemory(file, flags) {
  if (typeof constants.O_NOFOLLOW !== 'number') throw new Error('Memory requires no-follow filesystem support')
  // O_NOFOLLOW also refuses dangling symlinks and final-component replacement races.
  // Nonblocking open lets fstat reject a FIFO without waiting for another process.
  const fd = openSync(file, flags | constants.O_NOFOLLOW | constants.O_NONBLOCK, 0o600)
  try {
    if (!fstatSync(fd).isFile()) throw new Error('Memory must be a regular file')
    return fd
  } catch (error) { closeSync(fd); throw error }
}
