import { closeSync, existsSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { LAB } from './config.mjs'
import { cleanupOwned, createOwnedRun, fixtureEnv, git, hash, interruptController, runCommand } from './runtime.mjs'
import { order, review } from '../research/cycle/policy.mjs'
import { readMemory, appendMemory } from '../research/cycle/memory.mjs'
import { scenarios } from '../research/cycle/fixture.mjs'

const { values } = parseArgs({ options: { policy: { type: 'string', default: 'fixed' }, scenario: { type: 'string', default: 'ignore-signal' }, help: { type: 'boolean' } } })
if (values.help) {
  console.log('Usage: node scripts/research-cycle.mjs [--policy fixed|adaptive|random] [--scenario correct|ignore-signal|cleanup-leak|swallow-error]\nExactly one local synthetic experiment; no arbitrary command/path/iteration input, network, upstream action or automatic retry. Memory: evidence/local/cycle-memory.jsonl. See research/cycle/ADR.md.')
} else {
  if (!scenarios.includes(values.scenario)) throw new Error('Unknown synthetic scenario')
  // Validate policy before creating files or acquiring a lock.
  order(values.policy)
  const parent = path.join(LAB, 'evidence/local')
  mkdirSync(parent, { recursive: true })
  const lock = path.join(parent, 'cycle.lock')
  const fd = openSync(lock, 'wx', 0o600)
  const interruption = interruptController()
  let owner
  try {
    const memory = path.join(parent, 'cycle-memory.jsonl')
    const previous = readMemory(memory, parent)
    const selected = order(values.policy, previous).find(id => !previous.some(r => r.scenario === values.scenario && r.experiment === id))
    if (!selected) throw new Error('No untried catalog experiment; stop without retry')
    owner = createOwnedRun('cycle')
    const definition = { experiment: selected, scenario: values.scenario, policy: values.policy, allowedCommand: 'node research/cycle/fixture.mjs <catalog scenario> <catalog probe> <owned directory>', timeoutMs: 5000, maxOutputBytes: 16777216, maxPayloadBytes: 131072, repeats: 2, control: 'correct', stopConditions: ['timeout', 'interrupt', 'missing evidence', 'one experiment complete'] }
    const sourceSha = git(LAB, ['rev-parse', 'HEAD']).trim()
    const codeHashes = Object.fromEntries(['research/cycle/fixture.mjs', 'research/cycle/policy.mjs', 'research/cycle/memory.mjs', 'scripts/research-cycle.mjs'].map(n => [n, hash(readFileSync(path.join(LAB, n)))]))
    writeFileSync(path.join(owner.evidence, 'definition.json'), JSON.stringify({ ...definition, sourceSha, codeHashes, status: 'RUNNING' }, null, 2) + '\n', { flag: 'wx' })
    let result, error, classification = 'INCONCLUSIVE'
    const started = performance.now()
    try {
      const command = await runCommand('fixture', process.execPath, [path.join(LAB, 'research/cycle/fixture.mjs'), values.scenario, selected, owner.temporary], { cwd: owner.temporary, env: fixtureEnv(), evidence: owner.evidence, timeout: definition.timeoutMs, signal: interruption.signal })
      result = JSON.parse(command.stdout)
      classification = review(result, selected)
    } catch (failure) { error = failure.message; process.exitCode = 1 }
    const elapsedMs = performance.now() - started
    // Cleanup is part of the verdict; failed cleanup cannot yield a confirmed record.
    try { cleanupOwned(owner) } catch (failure) { error = failure.message; classification = 'INCONCLUSIVE'; process.exitCode = 1 }
    writeFileSync(path.join(owner.evidence, 'result.json'), JSON.stringify({ classification, result, error, elapsedMs, node: process.version, platform: process.platform, arch: process.arch, exitStatus: error ? 'FAILED' : '0', limitations: ['Synthetic fixture only; no Supabase discovery or independent review'], cleanup: existsSync(owner.temporary) ? 'FAIL' : 'PASS' }, null, 2) + '\n', { flag: 'wx' })
    const evidence = ['definition.json', 'result.json', ...(existsSync(path.join(owner.evidence, 'fixture.log')) ? ['fixture.log'] : [])].map(name => ({ path: path.relative(parent, path.join(owner.evidence, name)), sha256: hash(readFileSync(path.join(owner.evidence, name))) }))
    const entry = appendMemory(memory, previous, { experiment: selected, scenario: values.scenario, classification, sourceSha, codeHashes, recordedAt: new Date().toISOString(), elapsedMs, evidence })
    console.log(JSON.stringify(entry, null, 2))
  } finally {
    interruption.dispose()
    // Also cover failures before child execution/result writing.
    if (owner && existsSync(owner.temporary)) cleanupOwned(owner)
    closeSync(fd)
    unlinkSync(lock)
  }
}
