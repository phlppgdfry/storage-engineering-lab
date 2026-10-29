export const catalog = Object.freeze([
  { id: 'abort', impact: 3, information: 2, cost: 1, coverage: 1 },
  { id: 'cleanup', impact: 3, information: 2, cost: 1, coverage: 1 },
  { id: 'error', impact: 2, information: 2, cost: 1, coverage: 1 },
])
export function order(policy, history = [], seed = 11) {
  if (!['fixed', 'adaptive', 'random'].includes(policy)) throw new Error('Unsupported policy')
  let state = seed >>> 0
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 2 ** 32 }
  const entries = catalog.map((entry, index) => {
    const previous = history.filter(r => r.experiment === entry.id)
    const hits = previous.filter(r => r.classification === 'CONFIRMED_SYNTHETIC').length
    const failures = previous.filter(r => r.classification === 'INCONCLUSIVE').length
    const score = (entry.impact + entry.information - entry.coverage + (hits + 1) / (previous.length + 2) - failures) / entry.cost
    return { ...entry, index, score, random: random() }
  })
  entries.sort((a, b) => policy === 'fixed' ? a.index - b.index : policy === 'random' ? a.random - b.random : b.score - a.score || a.index - b.index)
  return entries.map(e => e.id)
}
export function review(result) {
  if (!result || !Array.isArray(result.observations) || result.observations.length !== 2 || typeof result.control?.pass !== 'boolean' || result.observations.some(r => typeof r.pass !== 'boolean')) return 'INCONCLUSIVE'
  if (!result.control.pass || JSON.stringify(result.observations[0]) !== JSON.stringify(result.observations[1])) return 'INCONCLUSIVE'
  return result.observations[0].pass ? 'REFUTED_FOR_FIXTURE' : 'CONFIRMED_SYNTHETIC'
}
