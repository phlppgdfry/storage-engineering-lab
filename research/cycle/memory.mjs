import { appendFileSync, existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs'
import path from 'node:path'
import { hash } from '../../scripts/runtime.mjs'
export function readMemory(file, evidenceRoot) {
  if (!existsSync(file)) return []
  if (!lstatSync(file).isFile() || lstatSync(file).isSymbolicLink()) throw new Error('Memory must be a regular file')
  const bytes = readFileSync(file, 'utf8')
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
  appendFileSync(file, JSON.stringify(entry) + '\n', { flag: 'a', mode: 0o600 })
  return entry
}
