import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { LAB } from './config.mjs'
import { createOwnedRun, cleanupOwned, hash, git } from './runtime.mjs'
import { probe } from '../research/cycle/fixture.mjs'
import { order, review } from '../research/cycle/policy.mjs'
const corpusBytes = readFileSync(path.join(LAB, 'research/cycle/corpus.json'))
const corpusHash = hash(corpusBytes)
assert.equal(corpusHash, 'fed1527e56a70e73c80522f7688fd3e3d1c41f5ee5687dfc58c1a2e02a1eda17', 'Frozen evaluation corpus changed; refuse evaluation')
const corpus = JSON.parse(corpusBytes)
const owner = createOwnedRun('cycle-evaluation')
const started = performance.now()
const matrix = [], history = [], results = []
try {
  for (const split of ['training', 'evaluation']) {
    for (const [index, scenario] of corpus[split].entries()) {
      for (const experiment of corpus.probes) {
        const begin = performance.now()
        const observations = []
        for (let i = 0; i < corpus.repeats; i++) observations.push(await probe(scenario, experiment, owner.temporary))
        const control = await probe('correct', experiment, owner.temporary)
        const classification = review({ observations, control })
        const row = { split, index, scenario, experiment, observations, control, classification, elapsedMs: performance.now() - begin }
        matrix.push(row)
        if (split === 'training') history.push(row)
      }
    }
  }
  for (const policy of ['fixed', 'adaptive', 'random']) for (const seed of corpus.seeds) {
    const ranking = order(policy, policy === 'adaptive' ? history : [], seed)
    let found = 0, falsePositives = 0, attempts = 0, detectionIndex = 0, costMs = 0, unreliable = 0
    for (const [index, scenario] of corpus.evaluation.entries()) {
      for (const [step, experiment] of ranking.slice(0, corpus.budget).entries()) {
        const row = matrix.find(r => r.split === 'evaluation' && r.index === index && r.experiment === experiment)
        attempts++; costMs += row.elapsedMs
        if (row.classification === 'INCONCLUSIVE') unreliable++
        if (row.classification === 'CONFIRMED_SYNTHETIC') {
          if (scenario === 'correct') falsePositives++; else { found++; detectionIndex += step + 1 }
          break
        }
      }
    }
    results.push({ policy, seed, ranking, confirmedFixtures: found, totalDefectiveFixtures: 6, falsePositives, attempts, meanDetectionIndex: found ? detectionIndex / found : null, replayedProbeCostMs: costMs, unreliable })
  }
  const mean = policy => results.filter(r => r.policy === policy).reduce((sum, r) => sum + r.confirmedFixtures, 0) / corpus.seeds.length
  const improved = mean('adaptive') > mean('fixed') && mean('adaptive') > mean('random') && results.filter(r => r.policy === 'adaptive').every(r => r.falsePositives === 0 && r.unreliable === 0)
  const summary = { sourceSha: git(LAB, ['rev-parse', 'HEAD']).trim(), codeHashes: Object.fromEntries(['research/cycle/fixture.mjs', 'research/cycle/policy.mjs', 'scripts/evaluate-cycle.mjs'].map(n => [n, hash(readFileSync(path.join(LAB, n)))])), recordedAt: new Date().toISOString(), corpusHash, node: process.version, platform: process.platform, arch: process.arch, matrix, results, adaptiveImproved: improved, decision: improved ? 'Experimental synthetic benefit only; real-world improvement NOT ESTABLISHED' : 'Keep fixed planner; adaptive superiority NOT DEMONSTRATED', elapsedMs: performance.now() - started, methodology: 'Each matrix cell actually executed twice plus a correct control. Policies replay the same frozen observations for fair experiment budgets. Probe costs are descriptive shared observations, not independent scheduler timings.' }
  cleanupOwned(owner)
  summary.cleanup = 'PASS'
  writeFileSync(path.join(owner.evidence, 'evaluation.json'), JSON.stringify(summary, null, 2) + '\n', { flag: 'wx' })
  console.log(JSON.stringify({ evidence: path.relative(LAB, owner.evidence), adaptiveImproved: improved, meanConfirmed: { fixed: mean('fixed'), adaptive: mean('adaptive'), random: mean('random') }, decision: summary.decision, observations: matrix.length, cleanup: summary.cleanup }, null, 2))
} catch (error) { cleanupOwned(owner); throw error }
