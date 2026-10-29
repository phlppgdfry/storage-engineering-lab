import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs'
import { getEventListeners } from 'node:events'
import os from 'node:os'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { assertOwned, cleanupOwned, createOwnedRun, fixtureEnv, redact, runCommand } from '../scripts/runtime.mjs'

function scratch(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'storage-runtime-test-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  return root
}
function own(t) {
  const evidenceParent = scratch(t)
  const owner = createOwnedRun('runtime-test', evidenceParent)
  // Only paths freshly made by this test; cleanup also runs when an assertion fails.
  t.after(() => rmSync(owner.temporary, { recursive: true, force: true }))
  return owner
}
const options = (evidence, extra = {}) => ({ evidence, timeout: 3000, progress: false, ...extra })

test('fixture environment strips ambient credentials, hooks, endpoints and proxy configuration', t => {
  const root = scratch(t)
  writeFileSync(path.join(root, '.env.sample'), 'DATABASE_URL=postgresql://fixture:fixture@tenant_db/db\nAWS_ACCESS_KEY_ID=synthetic\n')
  writeFileSync(path.join(root, '.env.test.sample'), 'NODE_ENV=development\nDATABASE_URL=postgresql://test:test@tenant_db/test\n')
  const parent = { PATH: '/usr/bin:/bin', LANG: 'C', TZ: 'UTC', AWS_ACCESS_KEY_ID: 'ambient-private',
    AWS_SECRET_ACCESS_KEY: 'ambient-secret', DATABASE_URL: 'postgresql://private:secret@example.org/prod',
    NODE_OPTIONS: '--import=/private/hook.mjs', NODE_PATH: '/private/modules', LD_PRELOAD: '/private/preload.so',
    HTTP_PROXY: 'http://private-proxy', HTTPS_PROXY: 'http://private-proxy', OTEL_EXPORTER_OTLP_ENDPOINT: 'https://private-trace',
    GITHUB_TOKEN: 'ambient-github-token', GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'core.sshCommand', GIT_CONFIG_VALUE_0: 'private-hook' }
  const env = fixtureEnv(root, { STORAGE_FILE_BACKEND_PATH: '/synthetic-only' }, parent)
  assert.equal(env.DATABASE_URL, 'postgresql://test:test@tenant_db/test')
  assert.equal(env.AWS_ACCESS_KEY_ID, 'synthetic')
  assert.equal(env.NODE_ENV, 'test')
  assert.equal(env.STORAGE_FILE_BACKEND_PATH, '/synthetic-only')
  assert.equal(env.AWS_EC2_METADATA_DISABLED, 'true')
  assert.equal(env.AWS_SHARED_CREDENTIALS_FILE, '/dev/null')
  assert.equal(env.GIT_CONFIG_GLOBAL, '/dev/null')
  assert.equal(env.OTEL_TRACES_ENABLED, 'false')
  assert.equal(env.LANG, 'C')
  for (const key of ['AWS_SECRET_ACCESS_KEY', 'NODE_OPTIONS', 'NODE_PATH', 'LD_PRELOAD', 'HTTP_PROXY', 'HTTPS_PROXY',
    'OTEL_EXPORTER_OTLP_ENDPOINT', 'GITHUB_TOKEN', 'GIT_CONFIG_COUNT', 'GIT_CONFIG_KEY_0', 'GIT_CONFIG_VALUE_0']) assert.equal(env[key], undefined, key)
  assert.equal(parent.AWS_ACCESS_KEY_ID, 'ambient-private', 'caller environment must remain unchanged')
})

test('owned cleanup removes only its freshly created workspace and leaves evidence', t => {
  const owner = own(t)
  assert.equal(assertOwned(owner), true)
  writeFileSync(path.join(owner.temporary, 'created-by-this-test'), 'disposable')
  cleanupOwned(owner)
  assert.equal(existsSync(owner.temporary), false)
  assert.equal(existsSync(path.join(owner.evidence, 'owner.json')), true)
})

test('tampered owner token refuses cleanup and retains the workspace', t => {
  const owner = own(t)
  const marker = path.join(owner.temporary, '.storage-lab-owner.json')
  writeFileSync(marker, JSON.stringify({ ...owner, token: 'different-run' }))
  assert.throws(() => cleanupOwned(owner), /ownership|identity|marker/i)
  assert.equal(existsSync(owner.temporary), true)
})

test('a workspace replaced with a symlink refuses cleanup without touching its target', t => {
  const owner = own(t), moved = owner.temporary + '-moved'
  renameSync(owner.temporary, moved)
  t.after(() => rmSync(moved, { recursive: true, force: true }))
  symlinkSync(moved, owner.temporary)
  assert.throws(() => cleanupOwned(owner), /symlink|identity/i)
  assert.equal(existsSync(path.join(moved, '.storage-lab-owner.json')), true)
})

test('a symlink ownership marker is rejected even if its JSON happens to match', t => {
  const owner = own(t), marker = path.join(owner.temporary, '.storage-lab-owner.json')
  const external = path.join(owner.evidence, 'external-marker.json')
  writeFileSync(external, readFileSync(marker))
  unlinkSync(marker)
  symlinkSync(external, marker)
  assert.throws(() => assertOwned(owner), /symlink|marker|ownership/i)
  assert.equal(existsSync(external), true)
})

test('runCommand captures a real allowed nonzero outcome and writes evidence', async t => {
  const evidence = scratch(t)
  const result = await runCommand('expected-red', process.execPath, ['-e', 'process.stdout.write("red-out"); process.stderr.write("red-err"); process.exitCode=7'], options(evidence, { allowed: [7] }))
  assert.equal(result.status, 7)
  assert.equal(result.stdout, 'red-out')
  assert.equal(result.stderr, 'red-err')
  assert.match(readFileSync(result.logFile, 'utf8'), /red-out/)
  assert.match(readFileSync(result.logFile, 'utf8'), /red-err/)
})

test('runCommand rejects disallowed exit status with redacted error evidence', async t => {
  const evidence = scratch(t)
  await assert.rejects(runCommand('failure', process.execPath, ['-e', 'process.stderr.write("postgresql://fixture:private-password@tenant_db/db"); process.exit(9)'], options(evidence)), error => {
    assert.match(error.message, /exit 9/)
    assert.match(error.message, /\[redacted\]/)
    assert.equal(error.message.includes('private-password'), false)
    return true
  })
})

test('runCommand spawn failure rejects and removes its signal listener', async t => {
  const evidence = scratch(t), controller = new AbortController()
  await assert.rejects(runCommand('missing-command', path.join(evidence, 'does-not-exist'), [], options(evidence, { signal: controller.signal })), /ENOENT|spawn|not found/)
  await delay(30)
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0)
})

test('runCommand timeout and explicit abort settle, label the cause and remove listeners', async t => {
  const evidence = scratch(t)
  await assert.rejects(runCommand('deadline', process.execPath, ['-e', 'setInterval(()=>{},1000)'], options(evidence, { timeout: 100 })), /timeout after 100 ms/)
  const controller = new AbortController()
  const run = runCommand('interrupted', process.execPath, ['-e', 'setInterval(()=>{},1000)'], options(evidence, { signal: controller.signal }))
  setTimeout(() => controller.abort(), 100)
  await assert.rejects(run, /interrupted/)
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0)
})

test('runCommand redacts credentials split across output chunks before returning or logging', async t => {
  const evidence = scratch(t)
  const script = 'process.stdout.write("authorization: Bearer "); setTimeout(()=>process.stdout.write("private-split-token\\n"),100); setTimeout(()=>{},150)'
  const result = await runCommand('chunk-redaction', process.execPath, ['-e', script], options(evidence))
  for (const text of [result.stdout, result.output, readFileSync(result.logFile, 'utf8')]) {
    assert.equal(text.includes('private-split-token'), false, 'stream boundaries must not bypass redaction')
    assert.match(text, /\[redacted\]/)
  }
})

test('runCommand rejects evidence-file collisions without crashing its caller', t => {
  const evidence = scratch(t), marker = path.join(evidence, 'collision.log')
  writeFileSync(marker, 'previous evidence')
  const module = new URL('../scripts/runtime.mjs', import.meta.url).href
  const script = `import { runCommand } from ${JSON.stringify(module)}; try { await runCommand('collision', process.execPath, ['-e','process.stdout.write("new")'], ${JSON.stringify(options(evidence))}); process.exitCode=2 } catch (error) { process.stdout.write('HANDLED:'+error.message) }`
  let output = ''
  try { output = execFileSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'pipe'] }) }
  catch (error) { assert.fail(`Caller crashed instead of receiving rejection: ${error.stderr}`) }
  assert.match(output, /HANDLED:/)
  assert.equal(readFileSync(marker, 'utf8'), 'previous evidence')
})

test('runCommand timeout also terminates a TERM-resistant descendant after the direct child exits', { skip: process.platform === 'win32', timeout: 6000 }, async t => {
  const evidence = scratch(t), pidFile = path.join(evidence, 'descendant.pid')
  const leaf = 'process.on("SIGTERM",()=>{}); process.stdout.write("READY"); setInterval(()=>{},1000)'
  const parent = `const {spawn}=require('node:child_process'); const fs=require('node:fs'); const child=spawn(process.execPath,['-e',${JSON.stringify(leaf)}],{stdio:['ignore','pipe','ignore']}); child.stdout.once('data',()=>{fs.writeFileSync(${JSON.stringify(pidFile)},String(child.pid));child.stdout.destroy()});process.on('SIGTERM',()=>process.exit(0));setInterval(()=>{},1000)`
  let pid
  t.after(() => { if (pid) { try { process.kill(pid, 'SIGKILL') } catch {} } })
  await assert.rejects(runCommand('descendant-timeout', process.execPath, ['-e', parent], options(evidence, { timeout: 500 })), /timeout/)
  assert.equal(existsSync(pidFile), true, 'descendant must be running before timeout')
  pid = Number(readFileSync(pidFile, 'utf8'))
  await delay(1200)
  let alive = true
  try { process.kill(pid, 0) } catch (error) { if (error.code === 'ESRCH') alive = false; else throw error }
  assert.equal(alive, false, 'TERM-resistant descendant must not survive group cleanup')
})

test('redact handles complete fixture URLs and recognized token forms', () => {
  const result = redact('https://fixture:private-password@example.test/ authorization=Bearer private-bearer ghp_testToken123 sk-proj-testToken456')
  assert.equal(result.includes('private-password'), false)
  assert.equal(result.includes('private-bearer'), false)
  assert.equal(result.includes('ghp_testToken123'), false)
  assert.equal(result.includes('sk-proj-testToken456'), false)
})

test('machine fixture capture preserves valid configuration while its evidence stays redacted', async t => {
  const evidence = scratch(t)
  const config = { DATABASE_URL: 'postgresql://fixture:fixture-password@tenant_db/db' }
  const result = await runCommand('fixture-json', process.execPath, ['-e', `process.stdout.write(${JSON.stringify(JSON.stringify(config))})`], options(evidence, { captureRaw: true }))
  assert.deepEqual(JSON.parse(result.stdout), config)
  assert.equal(readFileSync(result.logFile, 'utf8').includes('fixture-password'), false)
})

test('owned temporary roots stay short even under a nested long TMPDIR', t => {
  const evidence = scratch(t)
  const module = new URL('../scripts/runtime.mjs', import.meta.url).href
  const script = `import {createOwnedRun,cleanupOwned} from ${JSON.stringify(module)}; const owner=createOwnedRun('path-limit',${JSON.stringify(evidence)}); try { if(Buffer.byteLength(owner.temporary+'/tsx-501/123456.pipe')>=104) throw Error('Unix socket path too long'); process.stdout.write('PASS') } finally { cleanupOwned(owner) }`
  const output = execFileSync(process.execPath, ['--input-type=module', '-e', script], { env: { ...fixtureEnv(), TMPDIR: '/tmp/' + 'nested-long-temp/'.repeat(15) }, encoding: 'utf8', timeout: 3000 })
  assert.equal(output, 'PASS')
})
