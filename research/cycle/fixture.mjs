import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Readable, Writable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

export const scenarios = Object.freeze(['correct', 'ignore-signal', 'cleanup-leak', 'swallow-error'])
export const probes = Object.freeze(['abort', 'cleanup', 'error'])
// Safe known mutations of a synthetic transfer, never Supabase production code.
export async function probe(scenario, kind, parent) {
  assert(scenarios.includes(scenario) && probes.includes(kind), 'Unknown catalog entry')
  const root = await mkdtemp(path.join(parent, 'fixture-'))
  const stage = path.join(root, 'stage')
  try {
    const controller = new AbortController()
    const source = kind === 'error'
      ? new Readable({ read() { this.destroy(new Error('synthetic-source-error')) } })
      : Readable.from([Buffer.alloc(65536), Buffer.alloc(65536)])
    let bytes = 0, rejected = false
    const destination = new Writable({ write(chunk, encoding, done) {
      bytes += chunk.length
      if (kind !== 'error') controller.abort()
      done()
    } })
    await writeFile(stage, 'staged synthetic bytes')
    try {
      await pipeline(source, destination, scenario === 'ignore-signal' ? {} : { signal: controller.signal })
    } catch {
      rejected = scenario !== 'swallow-error' || kind !== 'error'
    }
    if (scenario !== 'cleanup-leak') await rm(stage)
    const remains = await readFile(stage).then(() => true, e => { if (e.code === 'ENOENT') return false; throw e })
    const pass = kind === 'abort' ? rejected && bytes < 131072 : kind === 'cleanup' ? !remains : rejected
    return { pass, rejected, bytes, stageRemains: remains }
  } finally { await rm(root, { recursive: true, force: true }) }
}
if (process.argv[1]?.endsWith('/fixture.mjs')) {
  const [scenario, kind, parent] = process.argv.slice(2)
  const observations = []
  for (let i = 0; i < 2; i++) observations.push(await probe(scenario, kind, parent))
  const control = await probe('correct', kind, parent)
  console.log(JSON.stringify({ observations, control }))
}
