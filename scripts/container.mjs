import { spawnSync } from 'node:child_process'
import { lstatSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { ADAPTER, FILE_HASHES, FIXED, FIXED_TREE, LOCK_HASH } from './config.mjs'
import { fixtureEnv, hash, requireRuntime } from './runtime.mjs'

export const ROOT = '/workspace/storage'
export const ENDPOINTS = {
  DATABASE_URL: 'postgresql://postgres:postgres@tenant_db:5432/postgres',
  DATABASE_POOL_URL: 'postgresql://postgres:postgres@pg_bouncer:6432/postgres',
  DATABASE_MULTITENANT_URL: 'postgresql://postgres:postgres@multitenant_db:5432/postgres',
  DATABASE_MULTITENANT_POOL_URL: 'postgresql://postgres:postgres@multitenant_pgbouncer:6432/postgres',
  VECTOR_DATABASE_URL: 'postgresql://postgres:postgres@tenant_db:5432/postgres',
  STORAGE_S3_ENDPOINT: 'http://rustfs:9000', STORAGE_S3_PRIVATE_ASSET_ENDPOINT: 'http://rustfs:9000',
  IMGPROXY_URL: 'http://imgproxy:8080', ICEBERG_CATALOG_URL: 'http://rest-catalog:8181/v1',
}
export function assertLocalEndpoints(env) {
  for (const [key, value] of Object.entries(ENDPOINTS)) if (env[key] !== value) throw new Error(`Refusing non-fixture ${key}. Use npm run validate; no production endpoints are supported.`)
}
export function containerEnv(parent = process.env) {
  const env = fixtureEnv(ROOT, { ...ENDPOINTS, DB_INSTALL_ROLES: 'true', STORAGE_LAB_DISPOSABLE: parent.STORAGE_LAB_DISPOSABLE, STORAGE_LAB_RUN: parent.STORAGE_LAB_RUN })
  // An explicitly supplied remote endpoint is an error, never silently ignored.
  for (const key of Object.keys(ENDPOINTS)) if (parent[key] !== undefined && parent[key] !== ENDPOINTS[key]) throw new Error(`Unexpected ${key}; use the managed isolated runner.`)
  assertLocalEndpoints(env)
  return env
}
export function assertDisposable() {
  requireRuntime()
  if (process.platform !== 'linux' || process.cwd() !== ROOT || process.env.STORAGE_LAB_DISPOSABLE !== '1' || !/^storage-lab-[a-f0-9]{16}$/.test(process.env.STORAGE_LAB_RUN ?? '')) throw new Error('Use npm run validate. This script requires the managed disposable Linux container.')
  const marker = path.join(ROOT, '.storage-lab-source.json')
  if (!lstatSync(marker).isFile() || lstatSync(marker).isSymbolicLink()) throw new Error('Missing regular source manifest; rebuild using npm run validate.')
  const identity = JSON.parse(readFileSync(marker, 'utf8'))
  if (identity.schema !== 1 || identity.commit !== FIXED || identity.tree !== FIXED_TREE || identity.lockSha256 !== LOCK_HASH) throw new Error('Unrecognized source manifest; rebuild the pinned image.')
  if (hash(readFileSync(path.join(ROOT, 'package-lock.json'))) !== LOCK_HASH || hash(readFileSync(path.join(ROOT, ADAPTER))) !== FILE_HASHES.fixed) throw new Error('Pinned lockfile/adapter mismatch.')
  const seen = new Set()
  for (const file of identity.files) {
    if (typeof file.path !== 'string' || file.path.startsWith('/') || file.path.split('/').includes('..') || /[\r\n\0]/.test(file.path) || seen.has(file.path)) throw new Error('Unsafe source manifest path.')
    seen.add(file.path)
    const stat = lstatSync(path.join(ROOT, file.path))
    if (!stat.isFile() || stat.isSymbolicLink() || hash(readFileSync(path.join(ROOT, file.path))) !== file.sha256) throw new Error(`Source file mismatch: ${file.path}`)
  }
  // Reconstruct Git's tree in a temporary index. A forged list or changed manifest
  // cannot turn arbitrary source into the known upstream tree identity.
  const temp = mkdtempSync(path.join(os.tmpdir(), 'storage-source-check-'))
  try {
    const gitDir = path.join(temp, 'git'), paths = path.join(temp, 'paths')
    const env = fixtureEnv()
    const run = args => {
      const result = spawnSync('git', args, { cwd: ROOT, env, encoding: 'utf8', timeout: 60_000 })
      if (result.status !== 0 || result.error) throw new Error(`Source tree verification failed: ${result.stderr || result.error?.message}`)
      return result.stdout.trim()
    }
    run(['init', '--bare', gitDir])
    writeFileSync(paths, identity.files.map(file => file.path).join('\0') + '\0')
    const opts = [`--git-dir=${gitDir}`, `--work-tree=${ROOT}`, '-c', 'core.autocrlf=false', '-c', 'core.filemode=true']
    run([...opts, 'add', '--force', `--pathspec-from-file=${paths}`, '--pathspec-file-nul'])
    if (run([...opts, 'write-tree']) !== FIXED_TREE) throw new Error('Tracked source does not reconstruct the pinned Git tree.')
  } finally { rmSync(temp, { recursive: true, force: true }) }
  return { commit: identity.commit, tree: identity.tree, files: identity.files.length,
    node: process.version, platform: process.platform, arch: process.arch, kernel: os.release(),
    cpuMax: readFileSync('/sys/fs/cgroup/cpu.max', 'utf8').trim(), memoryMax: readFileSync('/sys/fs/cgroup/memory.max', 'utf8').trim() }
}
