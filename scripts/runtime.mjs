import { spawn, spawnSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { closeSync, openSync, writeSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { parseEnv } from 'node:util'
import { ADAPTER, CRITICAL, LAB, LOCK_HASH } from './config.mjs'

export const hash = bytes => createHash('sha256').update(bytes).digest('hex')
export function requireRuntime() {
  if (Number(process.versions.node.split('.')[0]) !== 24) throw new Error(`Supported runtime is Node 24.x; found ${process.version}. Select Node 24, then retry.`)
  if (!['darwin', 'linux'].includes(process.platform)) throw new Error(`Native experiments support macOS/Linux; ${process.platform} is not verified. Use Linux Docker.`)
}
export function fixtureEnv(root, overrides = {}, parent = process.env) {
  const env = {}
  for (const key of ['PATH', 'TMPDIR', 'TMP', 'TEMP', 'LANG', 'LC_ALL', 'TZ']) if (parent[key]) env[key] = parent[key]
  env.PATH = `${path.dirname(process.execPath)}${path.delimiter}${env.PATH ?? '/usr/bin:/bin'}`
  if (root) {
    for (const file of ['.env.sample', '.env.test.sample']) Object.assign(env, parseEnv(readFileSync(path.join(root, file), 'utf8')))
  }
  // Ambient credentials, NODE_OPTIONS, URLs, proxies and tracing never cross this boundary.
  Object.assign(env, { NODE_ENV: 'test', NO_COLOR: '1', CI: '1',
    OTEL_METRICS_ENABLED: 'false', PROMETHEUS_METRICS_ENABLED: 'false', OTEL_TRACES_ENABLED: 'false',
    AWS_EC2_METADATA_DISABLED: 'true', AWS_SHARED_CREDENTIALS_FILE: '/dev/null', AWS_CONFIG_FILE: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_TERMINAL_PROMPT: '0' }, overrides)
  return env
}
export function git(root, args) {
  const r = spawnSync('git', ['-c', 'core.hooksPath=/dev/null', '-C', root, ...args], {
    encoding: 'utf8', timeout: 30_000, maxBuffer: 16 * 1024 * 1024, env: fixtureEnv(),
  })
  if (r.error || r.status !== 0) throw new Error(`Git ${args[0]} failed: ${redact(r.stderr || r.error?.message || 'unknown error')}`)
  return r.stdout
}
export function sourceCheckout(value) {
  const requested = path.resolve(value ?? path.join(LAB, '../supabase-storage'))
  if (!existsSync(requested)) throw new Error(`Storage checkout not found: ${requested}. Follow docs/reproduction.md; pass --checkout PATH.`)
  const root = realpathSync(requested)
  if (path.resolve(git(root, ['rev-parse', '--show-toplevel']).trim()) !== root) throw new Error('--checkout must name the root of the Storage repository.')
  return root
}
export function verifyDependencies(checkout) {
  const lockBytes = readFileSync(path.join(checkout, 'package-lock.json'))
  if (hash(lockBytes) !== LOCK_HASH) throw new Error('Source lockfile differs from the pinned study. Create the documented pinned checkout; do not install at an arbitrary HEAD.')
  const lock = JSON.parse(lockBytes)
  const modules = path.join(checkout, 'node_modules')
  const hidden = path.join(modules, '.package-lock.json')
  if (!existsSync(hidden)) throw new Error('Installed dependency metadata missing. Run the documented npm 11.12.1 ci in the pinned Storage checkout.')
  const installed = JSON.parse(readFileSync(hidden, 'utf8'))
  let entries = 0
  for (const [key, entry] of Object.entries(installed.packages ?? {})) {
    if (!key.startsWith('node_modules/')) continue
    if (entry.version !== lock.packages[key]?.version) throw new Error(`Installed dependency version drift: ${key}. Reinstall with npm ci at the pinned revision.`)
    entries++
  }
  if (!entries) throw new Error('Installed dependency metadata is empty; run npm ci.')
  const versions = {}
  for (const [name, expected] of Object.entries(CRITICAL)) {
    const file = path.join(modules, name, 'package.json')
    if (!existsSync(file)) throw new Error(`Missing ${name}; install the pinned Storage dependencies.`)
    versions[name] = JSON.parse(readFileSync(file, 'utf8')).version
    if (versions[name] !== expected) throw new Error(`Expected ${name}@${expected}; found ${versions[name]}. Reinstall with pinned npm ci.`)
  }
  return { modules, entries, versions, lockSha256: LOCK_HASH, installedMetadataSha256: hash(readFileSync(hidden)) }
}
// A short canonical system-temp root also keeps macOS Unix IPC paths below sun_path limits.
const workspaceRoot = () => realpathSync('/tmp')
export function createOwnedRun(kind, evidenceParent = path.join(LAB, 'evidence/local')) {
  mkdirSync(evidenceParent, { recursive: true })
  const evidence = realpathSync(mkdtempSync(path.join(evidenceParent, `${kind}-`)))
  const temporary = realpathSync(mkdtempSync(path.join(workspaceRoot(), 'storage-lab-')))
  const owner = { schema: 1, token: randomUUID(), kind, temporary, evidence, createdAt: new Date().toISOString() }
  writeFileSync(path.join(temporary, '.storage-lab-owner.json'), JSON.stringify(owner), { flag: 'wx' })
  writeFileSync(path.join(evidence, 'owner.json'), JSON.stringify(owner, null, 2) + '\n')
  return owner
}
export function assertOwned(owner) {
  if (!owner?.temporary || path.dirname(owner.temporary) !== workspaceRoot() || !path.basename(owner.temporary).startsWith('storage-lab-') || lstatSync(owner.temporary).isSymbolicLink() || realpathSync(owner.temporary) !== owner.temporary) throw new Error('Refusing cleanup: workspace identity/symlink check failed.')
  const marker = path.join(owner.temporary, '.storage-lab-owner.json')
  if (!lstatSync(marker).isFile() || lstatSync(marker).isSymbolicLink()) throw new Error('Refusing cleanup: ownership marker must be a regular file, not a symlink.')
  const saved = JSON.parse(readFileSync(marker, 'utf8'))
  if (saved.token !== owner.token || saved.temporary !== owner.temporary || saved.kind !== owner.kind) throw new Error('Refusing cleanup: ownership marker does not match this run.')
  return true
}
export function cleanupOwned(owner) {
  assertOwned(owner)
  rmSync(owner.temporary, { recursive: true, force: false })
}
export function redact(value) {
  return String(value).replace(/(https?:\/\/|postgres(?:ql)?:\/\/)([^\s/:]+):([^\s@]+)@/gi, '$1$2:[redacted]@')
    .replace(/(authorization\s*[:=]\s*(?:bearer\s+)?)[^\s",}]+/gi, '$1[redacted]')
    .replace(/\b(?:ghp_|github_pat_|sk-proj-)[A-Za-z0-9_\-]+/g, '[redacted]')
}
export async function runCommand(label, command, args, { cwd, env = fixtureEnv(), evidence, allowed = [0], timeout = 60_000, signal, progress = true, captureRaw = false } = {}) {
  if (!/^[a-z0-9-]+$/i.test(label)) throw new Error('Invalid command evidence label.')
  if (progress) console.error(`[RUN] ${label}`)
  const logFile = evidence ? path.join(evidence, `${label}.log`) : null
  // Open exclusively before starting any child; collisions reject without side effects.
  const fd = logFile ? openSync(logFile, 'wx') : null
  let stdout = '', stderr = '', failure, captured = 0
  let forced, forceDone = Promise.resolve(), timer, onAbort
  try {
    const result = await new Promise((resolve, reject) => {
      const child = spawn(command, args, { cwd, env, shell: false, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] })
      const kill = reason => {
        failure ??= reason
        if (!child.pid) return
        const send = type => { try { process.kill(process.platform === 'win32' ? child.pid : -child.pid, type) } catch {} }
        send('SIGTERM')
        if (!forced) forceDone = new Promise(done => {
          // Keep this deadline even if the direct child exits; grandchildren share its group.
          forced = setTimeout(() => { send('SIGKILL'); done() }, 1000)
        })
      }
      onAbort = () => kill('interrupted')
      signal?.addEventListener('abort', onAbort, { once: true })
      timer = setTimeout(() => kill(`timeout after ${timeout} ms`), timeout)
      const emit = (channel, value) => {
        const text = redact(value)
        if (fd !== null && !failure) {
          try { writeSync(fd, text) } catch (error) { kill(`evidence write failed: ${error.code ?? error.message}`) }
        }
        // Raw capture is opt-in only for machine-readable fixture configuration; logs stay redacted.
        if (channel === 'stdout') stdout += captureRaw ? value : text; else stderr += captureRaw ? value : text
      }
      // Per-channel line buffers prevent output chunk boundaries bypassing redaction.
      // Evidence is bounded; this is best-effort sanitization, not a secret scanner.
      for (const channel of ['stdout', 'stderr']) {
        const stream = child[channel]
        stream.setEncoding('utf8')
        let pending = ''
        stream.on('data', text => {
          captured += Buffer.byteLength(text)
          if (captured > 16 * 1024 * 1024) { kill('output exceeded 16 MiB evidence limit'); return }
          pending += text
          const end = pending.lastIndexOf('\n')
          if (end !== -1) { emit(channel, pending.slice(0, end + 1)); pending = pending.slice(end + 1) }
        })
        stream.once('end', () => { if (pending) emit(channel, pending); pending = '' })
      }
      child.once('error', reject)
      child.once('close', (status, exitSignal) => resolve({ status, exitSignal }))
      if (signal?.aborted) onAbort()
    })
    clearTimeout(timer)
    await forceDone
    if (failure || !allowed.includes(result.status)) throw new Error(`${label}: ${failure ?? `exit ${result.status}${result.exitSignal ? ` (${result.exitSignal})` : ''}`}. Evidence: ${logFile ?? 'no log'}\n${redact(stderr.slice(-1600))}`)
    return { ...result, stdout, stderr, output: stdout + stderr, logFile }
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
    await forceDone
    if (fd !== null) closeSync(fd)
  }
}
export function interruptController() {
  const controller = new AbortController()
  const abort = () => controller.abort()
  process.once('SIGINT', abort); process.once('SIGTERM', abort)
  return { signal: controller.signal, dispose: () => { process.off('SIGINT', abort); process.off('SIGTERM', abort) } }
}
export function assertVariant(root, allowed) {
  const observed = hash(readFileSync(path.join(root, ADAPTER)))
  if (!Object.values(allowed).includes(observed)) throw new Error('Unexpected adapter source hash; refusing to mutate an unverified source tree.')
  return observed
}
