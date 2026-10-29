import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync, copyFileSync, existsSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { hash } from '../scripts/runtime.mjs'
import { order, review } from '../research/cycle/policy.mjs'
import { readMemory, appendMemory } from '../research/cycle/memory.mjs'
import { probe } from '../research/cycle/fixture.mjs'

function fixture(t) { const root = mkdtempSync(path.join(os.tmpdir(), 'cycle-test-')); t.after(() => rmSync(root, { recursive: true, force: true })); return root }

test('safe mutations reproduce only their own invariant; controls pass twice', async t => {
  const root = fixture(t)
  for (const scenario of ['correct', 'ignore-signal', 'cleanup-leak', 'swallow-error']) {
    for (const kind of ['abort', 'cleanup', 'error']) {
      const result = { observations: [await probe(scenario, kind, root), await probe(scenario, kind, root)], control: await probe('correct', kind, root) }
      const defect = scenario === 'ignore-signal' && kind === 'abort' || scenario === 'cleanup-leak' && kind === 'cleanup' || scenario === 'swallow-error' && kind === 'error'
      assert.equal(review(result), defect ? 'CONFIRMED_SYNTHETIC' : 'REFUTED_FOR_FIXTURE')
    }
  }
})
test('review rejects missing evidence, bad control and inconsistent repetitions', () => {
  assert.equal(review({}), 'INCONCLUSIVE')
  assert.equal(review({ observations: [{ pass: false }, { pass: true }], control: { pass: true } }), 'INCONCLUSIVE')
  assert.equal(review({ observations: [{ pass: false }, { pass: false }], control: { pass: false } }), 'INCONCLUSIVE')
})
test('feedback changes priorities only; random selection is replayable and unknown policies refuse', () => {
  assert.deepEqual(order('fixed'), ['abort', 'cleanup', 'error'])
  assert.equal(order('adaptive', [{ experiment: 'abort', classification: 'INCONCLUSIVE' }])[0], 'cleanup')
  assert.deepEqual(order('random', [], 83), order('random', [], 83))
  assert.throws(() => order('sh -c arbitrary'))
})
test('memory preserves previous entries, rejects missing artifacts, tampering and torn writes', t => {
  const root = fixture(t), file = path.join(root, 'memory.jsonl'), artifact = path.join(root, 'result.json')
  writeFileSync(artifact, 'actual evidence')
  const data = { experiment: 'abort', scenario: 'correct', evidence: [{ path: 'result.json', sha256: hash(readFileSync(artifact)) }] }
  const first = appendMemory(file, [], data)
  const second = appendMemory(file, [first], data)
  assert.equal(second.previous, first.digest)
  assert.equal(readMemory(file, root).length, 2)
  const original = readFileSync(file)
  writeFileSync(artifact, 'tampered')
  assert.throws(() => readMemory(file, root), /evidence/)
  writeFileSync(artifact, 'actual evidence')
  writeFileSync(file, original.toString().replace('"abort"', '"cleanup"'))
  assert.throws(() => readMemory(file, root), /chain/)
  writeFileSync(file, original.subarray(0, original.length - 1))
  assert.throws(() => readMemory(file, root), /Interrupted/)
})
test('unsafe catalog or path inputs cannot become executed commands', async t => {
  const root = fixture(t)
  await assert.rejects(probe('correct; touch marker', 'abort', root), /Unknown/)
  const cli = spawnSync(process.execPath, ['scripts/research-cycle.mjs', '--scenario', '$(touch marker)'], { encoding: 'utf8' })
  assert.notEqual(cli.status, 0)
  assert.match(cli.stderr, /Unknown synthetic scenario/)
  const unknown = spawnSync(process.execPath, ['scripts/research-cycle.mjs', '--iterations', '100'], { encoding: 'utf8' })
  assert.notEqual(unknown.status, 0)
})
test('frozen corpus identity prevents unrecorded evaluation tuning', () => {
  assert.equal(hash(readFileSync('research/cycle/corpus.json')), 'fed1527e56a70e73c80522f7688fd3e3d1c41f5ee5687dfc58c1a2e02a1eda17')
})


test('one-cycle CLI stops duplicates, concurrent/crashed locks and corrupt evidence before execution', t => {
  const root = fixture(t)
  for (const directory of ['scripts', 'research/cycle']) mkdirSync(path.join(root, directory), { recursive: true })
  for (const file of ['scripts/research-cycle.mjs', 'scripts/config.mjs', 'scripts/runtime.mjs', 'research/cycle/fixture.mjs', 'research/cycle/policy.mjs', 'research/cycle/memory.mjs']) copyFileSync(file, path.join(root, file))
  const git = args => { const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' }); assert.equal(result.status, 0, result.stderr) }
  git(['init', '-q']); git(['add', '.']); git(['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'test fixture'])
  const execute = () => spawnSync(process.execPath, ['scripts/research-cycle.mjs'], { cwd: root, encoding: 'utf8', timeout: 10000 })
  const parent = path.join(root, 'evidence/local')
  mkdirSync(parent, { recursive: true })
  writeFileSync(path.join(parent, 'cycle.lock'), 'interrupted owner')
  assert.notEqual(execute().status, 0)
  assert.equal(existsSync(path.join(parent, 'cycle-memory.jsonl')), false)
  rmSync(path.join(parent, 'cycle.lock'))
  for (let i = 0; i < 3; i++) { const result = execute(); assert.equal(result.status, 0, result.stderr) }
  const memoryFile = path.join(parent, 'cycle-memory.jsonl')
  const before = readFileSync(memoryFile, 'utf8')
  assert.equal(before.trim().split('\n').length, 3)
  assert.match(execute().stderr, /No untried/)
  assert.equal(readFileSync(memoryFile, 'utf8'), before)
  const record = JSON.parse(before.split('\n')[0])
  rmSync(path.join(parent, record.evidence[0].path))
  const failure = execute()
  assert.notEqual(failure.status, 0)
  assert.equal(readFileSync(memoryFile, 'utf8'), before)
  assert.equal(existsSync(path.join(parent, 'cycle.lock')), false)
})
