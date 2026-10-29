import { readdirSync, readFileSync, realpathSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseEvidence, validateBenchmarkDataset, summarizePairedDataset, validateSummary, validateManifest } from './evidence.mjs'
import { safeArtifactPath } from './evidence.mjs'

export const REGISTRY_STATUSES = Object.freeze(['PROPOSED', 'INVESTIGATING', 'REPRODUCED', 'REFUTED', 'ALREADY ADDRESSED', 'VERIFIED', 'UPSTREAM SUBMITTED', 'CLOSED'])
export function validateRegistry(registry, { exists = () => true } = {}) {
  const require = (condition, message) => { if (!condition) throw new Error(`research registry: ${message}`) }
  const text = (value, label) => require(typeof value === 'string' && value.trim().length > 0, `${label}: nonempty text required`)
  require(registry && registry.schemaVersion === 1, 'unsupported schemaVersion; expected 1')
  require(Array.isArray(registry.statuses) && JSON.stringify(registry.statuses) === JSON.stringify(REGISTRY_STATUSES), 'statuses must match the canonical vocabulary')
  require(Array.isArray(registry.hypotheses) && registry.hypotheses.length > 0, 'hypotheses must be a nonempty array')
  text(registry.selectionPolicy, 'selectionPolicy')
  const ids = new Set()
  for (const item of registry.hypotheses) {
    require(item && /^H\d{3}$/.test(item.id), 'each hypothesis requires an Hnnn id')
    require(!ids.has(item.id), `duplicate id ${item.id}`); ids.add(item.id)
    const label = item.id
    for (const field of ['title', 'legacyStatus', 'legacyEvidence', 'nextAction']) text(item[field], `${label}.${field}`)
    require(REGISTRY_STATUSES.includes(item.status), `${label}.status: unsupported canonical status`)
    require(['active', 'overlap-hold', 'deferred'].includes(item.disposition), `${label}.disposition: expected active, overlap-hold or deferred`)
    require(Number.isSafeInteger(item.priority) && item.priority > 0, `${label}.priority: positive integer required`)
    require(item.source && /^https:\/\/github\.com\/[^/]+\/[^/]+$/.test(item.source.repository ?? ''), `${label}.source.repository: GitHub repository URL required`)
    require(/^[a-f0-9]{40}$/.test(item.source.commit ?? ''), `${label}.source.commit: full pinned Git identity required`)
    require(Array.isArray(item.source.paths) && item.source.paths.length > 0, `${label}.source.paths: required`)
    item.source.paths.forEach(safeArtifactPath)
    require(Array.isArray(item.evidence) && item.evidence.length > 0, `${label}.evidence: nonempty references required`)
    const evidencePaths = new Set()
    for (const reference of item.evidence) {
      const name = safeArtifactPath(reference?.path)
      require(!evidencePaths.has(name), `${label}.evidence: duplicate path ${name}`); evidencePaths.add(name)
      require(['experiment', 'regression', 'source-review', 'decision', 'upstream-status'].includes(reference.kind), `${label}.evidence.kind: unsupported kind`)
      require(exists(name), `${label}.evidence: missing file ${name}`)
    }
    if (['REPRODUCED', 'VERIFIED', 'UPSTREAM SUBMITTED'].includes(item.status)) require(item.evidence.some(ref => ['experiment', 'regression'].includes(ref.kind)), `${label}: status requires executed experiment/regression evidence`)
    if (item.status === 'UPSTREAM SUBMITTED') {
      require(/^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+$/.test(item.upstream?.url ?? ''), `${label}.upstream.url: pull request required`)
      require(['open', 'closed'].includes(item.upstream.state) && typeof item.upstream.draft === 'boolean' && typeof item.upstream.merged === 'boolean', `${label}.upstream: explicit observed state/draft/merged required`)
      require(/^\d{4}-\d{2}-\d{2}$/.test(item.upstream.observedAt ?? ''), `${label}.upstream.observedAt: date required`)
      require(evidencePaths.has(item.upstream.observationEvidence), `${label}.upstream: observationEvidence must reference retained evidence`)
    }
  }
  return { hypotheses: ids.size, recommendation: recommendNext(registry) }
}
export function recommendNext(registry) {
  const candidates = registry.hypotheses.filter(item => item.disposition === 'active' && ['PROPOSED', 'INVESTIGATING', 'REPRODUCED'].includes(item.status)).sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id, 'en'))
  return candidates.length ? { id: candidates[0].id, nextAction: candidates[0].nextAction, method: 'Priority ascending, then ID; excludes held, deferred, submitted and terminal work. Recommendation is not a confirmed finding.' } : null
}

const help = 'Usage: node scripts/check.mjs [--json] [--help]\nOffline, read-only checks: public JSON/gzip, retained benchmark arithmetic, artifact integrity, local Markdown file targets and JavaScript syntax. Excludes .git, node_modules and evidence/local. Does not execute benchmarks, access network or certify performance equivalence.'
function strippedMarkdown(text) {
  return text.replace(/^[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^[ \t]*\1[^\n]*$/gm, '').replace(/`+[^`\n]*`+/g, '')
}
export function markdownTargets(text) {
  const clean = strippedMarkdown(text), targets = []
  for (const match of clean.matchAll(/!?\[[^\]\n]*\]\(\s*(<[^>]+>|[^\s)]+)(?:\s+["'][^\n]*?["'])?\s*\)/g)) targets.push(match[1].replace(/^<|>$/g, ''))
  for (const match of clean.matchAll(/^\s{0,3}\[[^\]\n]+\]:\s*(<[^>]+>|\S+)/gm)) targets.push(match[1].replace(/^<|>$/g, ''))
  return targets
}
export function checkRepository(root) {
  root = realpathSync(root)
  const errors = [], warnings = [], files = []
  const attempt = (label, action) => { try { return action() } catch (error) { errors.push(`${label}: ${error.message}`); return undefined } }
  function contained(file) {
    const resolved = realpathSync(file), relative = path.relative(root, resolved)
    if (relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error('symlink/target escapes repository')
    return resolved
  }
  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name), relative = path.relative(root, file).split(path.sep).join('/')
      if (['.git', 'node_modules'].includes(entry.name) || relative === 'evidence/local') continue
      if (entry.isSymbolicLink()) { attempt(relative, () => contained(file)); continue }
      if (entry.isDirectory()) walk(file)
      else if (entry.isFile()) files.push(relative)
    }
  }
  attempt('file inventory', () => walk(root))
  const parsed = new Map()
  for (const name of files) {
    if (name.endsWith('.json') || name.endsWith('.json.gz')) attempt(name, () => parsed.set(name, parseEvidence(readFileSync(path.join(root, name)), { gzip: name.endsWith('.gz'), label: name })))
    else if (name.endsWith('.gz')) attempt(name, () => parseEvidence(readFileSync(path.join(root, name)), { gzip: true, label: name }))
    if (/\.(mjs|cjs|js)$/.test(name)) attempt(name, () => {
      const result = spawnSync(process.execPath, ['--check', path.join(root, name)], { encoding: 'utf8', timeout: 10000, env: { PATH: process.env.PATH ?? '' } })
      if (result.error || result.status !== 0) throw new Error(result.error?.message ?? result.stderr.trim())
    })
    if (name.endsWith('.md')) for (const target of markdownTargets(readFileSync(path.join(root, name), 'utf8'))) {
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(target)) continue
      attempt(`${name} -> ${target}`, () => {
        const decoded = decodeURIComponent(target.split(/[?#]/)[0])
        if (!decoded) return
        const destination = path.resolve(path.dirname(path.join(root, name)), decoded)
        const relative = path.relative(root, destination)
        if (relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error('local link escapes repository; use a portable repository target')
        if (!existsSync(destination)) throw new Error('missing local link target; create the file or correct the link')
        contained(destination)
      })
    }
  }
  const manifestName = 'evidence/completion/manifest.json', manifest = parsed.get(manifestName)
  if (!manifest) errors.push(`${manifestName}: required completion manifest is missing or invalid`)
  else attempt(manifestName, () => validateManifest(manifest, name => readFileSync(contained(path.join(root, name)))))
  for (const [name, value] of parsed) if (name !== manifestName && /^evidence\/.*\/manifest\.json$/.test(name)) attempt(name, () => validateManifest(value, artifact => readFileSync(contained(path.join(root, artifact)))))
  const registry = attempt('research/hypotheses.json', () => validateRegistry(parsed.get('research/hypotheses.json'), { exists: name => existsSync(path.join(root, name)) && Boolean(contained(path.join(root, name))) }))
  let measuredGroups = 0
  for (const kind of ['exploratory', 'timed', 'steady']) {
    const name = `evidence/completion/performance-${kind}.json.gz`, raw = parsed.get(name)
    if (!raw) { errors.push(`${name}: required retained dataset is missing or invalid`); continue }
    attempt(name, () => {
      const result = validateBenchmarkDataset(raw, { kind }); measuredGroups += result.rows; warnings.push(...result.warnings)
      if (kind !== 'steady') {
        const summaryName = `evidence/completion/performance-${kind}-summary.json`
        if (!parsed.has(summaryName)) throw new Error(`${summaryName}: required summary missing or invalid`)
        validateSummary(parsed.get(summaryName), summarizePairedDataset(raw, { kind }), summaryName)
      }
    })
  }
  if (manifest && measuredGroups) attempt('completion performance counts', () => {
    if (manifest.steps?.performance?.measuredGroups !== measuredGroups || manifest.steps?.performance?.datasets !== 3) throw new Error('manifest dataset/group counts disagree with validated retained evidence')
  })
  return { ok: errors.length === 0, scope: 'Offline evidence consistency and lab syntax; not a benchmark rerun or performance approval.', filesChecked: files.length, measuredGroups, registry: registry ?? null, errors, warnings }
}
function main() {
  const args = process.argv.slice(2), unknown = args.filter(arg => !['--json', '--help'].includes(arg))
  if (args.includes('--help') && unknown.length === 0) { console.log(help); return }
  if (unknown.length) {
    const result = { ok: false, errors: [`Unknown argument(s): ${unknown.join(', ')}. Use --help.`] }
    console[args.includes('--json') ? 'log' : 'error'](args.includes('--json') ? JSON.stringify(result, null, 2) : result.errors[0]); process.exitCode = 1; return
  }
  if (Number(process.versions.node.split('.')[0]) < 24) { console.error('Node 24 or newer is required. Select Node 24 and rerun.'); process.exitCode = 1; return }
  const result = checkRepository(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'))
  if (args.includes('--json')) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(`${result.ok ? 'PASS' : 'FAIL'}: ${result.filesChecked} public files inspected; ${result.measuredGroups} retained measurement groups validated.`)
    for (const error of result.errors) console.error(`ERROR: ${error}`)
    for (const warning of result.warnings) console.log(`NOTE: ${warning}`)
    console.log(result.scope)
  }
  if (!result.ok) process.exitCode = 1
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
