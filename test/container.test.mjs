import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ENDPOINTS, assertDisposable, assertLocalEndpoints } from '../scripts/container.mjs'

const lab = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

test('fixture endpoint guard requires every exact endpoint and refuses remote or missing values', () => {
  assert.doesNotThrow(() => assertLocalEndpoints({ ...ENDPOINTS }))
  for (const key of Object.keys(ENDPOINTS)) {
    assert.throws(() => assertLocalEndpoints({ ...ENDPOINTS, [key]: 'https://example.invalid/remote' }), /Refusing non-fixture/)
    const missing = { ...ENDPOINTS }; delete missing[key]
    assert.throws(() => assertLocalEndpoints(missing), /Refusing non-fixture/)
  }
})

test('container validation refuses this unmanaged host before touching source or services', () => {
  if (process.platform === 'linux' && process.cwd() === '/workspace/storage') return
  assert.throws(() => assertDisposable(), /managed disposable Linux container/)
})

// This is a fake Docker CLI, not a daemon or network experiment. The fixture
// stops on the first collision probe, before any source worktree/build/service.
function validateWithFakeDocker(t, { contextEndpoint, ambientHost, ambientContext }) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'storage-final-review-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const scripts = path.join(root, 'scripts'), bin = path.join(root, 'bin'), source = path.join(root, 'source')
  for (const directory of [scripts, bin, source]) mkdirSync(directory)
  for (const name of ['config.mjs', 'runtime.mjs', 'source.mjs', 'validate.mjs']) copyFileSync(path.join(lab, 'scripts', name), path.join(scripts, name))
  const init = spawnSync('git', ['init', '--quiet', source], { encoding: 'utf8' })
  assert.equal(init.status, 0, init.stderr)
  const trace = path.join(root, 'docker-trace.jsonl')
  const executable = `#!${process.execPath}
import { appendFileSync } from 'node:fs'
const args = process.argv.slice(2)
appendFileSync(${JSON.stringify(trace)}, JSON.stringify({args, context:process.env.DOCKER_CONTEXT, host:process.env.DOCKER_HOST})+'\\n')
if (args[0]==='context' && args[1]==='show') console.log('fixture-context')
else if (args[0]==='context' && args[1]==='inspect') console.log(JSON.stringify(${JSON.stringify(contextEndpoint)}))
else if (args[0]==='ps') console.log('deliberate-fixture-collision')
else if (args[0]==='image' && args[1]==='inspect') process.exitCode=1
else { console.error('unexpected fake Docker command'); process.exitCode=88 }
`
  // Use CommonJS in the extensionless executable without package metadata.
  writeFileSync(path.join(bin, 'docker'), executable.replace("import { appendFileSync } from 'node:fs'", "const { appendFileSync } = require('node:fs')"), { mode: 0o755 })
  const env = { PATH: `${bin}${path.delimiter}${process.env.PATH}`, HOME: root }
  if (ambientHost !== undefined) env.DOCKER_HOST = ambientHost
  if (ambientContext !== undefined) env.DOCKER_CONTEXT = ambientContext
  const result = spawnSync(process.execPath, [path.join(scripts, 'validate.mjs'), '--checkout', source], { env, encoding: 'utf8', timeout: 10000 })
  assert.equal(result.error, undefined)
  assert.equal(result.status, 1, result.stderr)
  return { result: JSON.parse(result.stdout), calls: existsSync(trace) ? readFileSync(trace, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [] }
}

test('explicit local Docker context wins over a remote DOCKER_HOST and freezes local commands', t => {
  const { result, calls } = validateWithFakeDocker(t, { contextEndpoint: 'unix:///fixture/local.sock', ambientHost: 'tcp://example.invalid:2375', ambientContext: 'fixture-context' })
  assert.match(result.error, /Project collision/)
  const probe = calls.find(call => call.args[0] === 'ps')
  assert(probe)
  assert.equal(probe.host, 'unix:///fixture/local.sock')
  assert.equal(probe.context, undefined)
})

test('explicit remote Docker context is rejected without any daemon command or image cleanup', t => {
  const { result, calls } = validateWithFakeDocker(t, { contextEndpoint: 'ssh://example.invalid', ambientHost: 'unix:///fixture/local.sock', ambientContext: 'fixture-context' })
  assert.match(result.error, /local Unix-socket/)
  assert.deepEqual(calls.map(call => call.args[0]), ['context', 'context'])
})

test('remote DOCKER_HOST is rejected without any daemon command or image cleanup', t => {
  const { result, calls } = validateWithFakeDocker(t, { contextEndpoint: 'unix:///fixture/default.sock', ambientHost: 'tcp://example.invalid:2375' })
  assert.match(result.error, /local Unix-socket/)
  assert.deepEqual(calls.map(call => call.args[0]), ['context', 'context'])
})

test('local DOCKER_HOST wins over a remote default context when DOCKER_CONTEXT is unset', t => {
  const { result, calls } = validateWithFakeDocker(t, { contextEndpoint: 'ssh://example.invalid', ambientHost: 'unix:///fixture/local.sock' })
  assert.match(result.error, /Project collision/)
  assert.equal(calls.find(call => call.args[0] === 'ps')?.host, 'unix:///fixture/local.sock')
})

test('an evidence write failure in an output callback rejects under control rather than crashing', t => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'storage-logfailure-review-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const runtimeUrl = new URL('../scripts/runtime.mjs', import.meta.url).href
  const childCode = `
    import fs from 'node:fs'
    import { syncBuiltinESMExports } from 'node:module'
    import { runCommand } from ${JSON.stringify(runtimeUrl)}
    fs.writeSync = () => { throw Object.assign(new Error('simulated disk full'), {code:'ENOSPC'}) }
    syncBuiltinESMExports()
    try {
      await runCommand('write-failure', process.execPath, ['-e', 'console.log("first line");setInterval(()=>{},1000)'], {
        evidence:${JSON.stringify(root)},timeout:2500,progress:false
      })
      process.exitCode=2
    } catch(error) { console.log('HANDLED:'+error.message) }
  `
  const run = spawnSync(process.execPath, ['--input-type=module', '-e', childCode], { encoding: 'utf8', timeout: 6000 })
  assert.equal(run.error, undefined)
  assert.equal(run.status, 0, run.stderr)
  assert.match(run.stdout, /HANDLED:write-failure: evidence write failed: ENOSPC/)
})

test('native probe removes its own temporary data when source import fails', t => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'storage-nativecleanup-review-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const fakeCheckout = path.join(root, 'checkout')
  mkdirSync(path.join(fakeCheckout, 'src'), { recursive: true })
  writeFileSync(path.join(fakeCheckout, 'src/config.ts'), 'throw new Error("controlled fixture import failure")\n')
  const sentinel = path.join(root, 'keep-this.txt')
  writeFileSync(sentinel, 'outside probe-owned data')
  const result = spawnSync(process.execPath, [path.join(lab, 'experiments/file-upload-cancellation.ts'), fakeCheckout], {
    env: { PATH: process.env.PATH, TMPDIR: root, TMP: root, TEMP: root }, encoding: 'utf8', timeout: 5000,
  })
  assert.equal(result.error, undefined)
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /controlled fixture import failure/)
  assert.equal(readFileSync(sentinel, 'utf8'), 'outside probe-owned data')
  // A remaining probe directory would be a cleanup regression even though the
  // outer test owns this fixture and could remove it at teardown.
  const listing = spawnSync(process.execPath, ['--input-type=module', '-e', `import{readdirSync}from'node:fs';console.log(JSON.stringify(readdirSync(${JSON.stringify(root)})))`], { encoding: 'utf8' })
  assert.equal(listing.status, 0)
  assert.deepEqual(JSON.parse(listing.stdout).sort(), ['checkout', 'keep-this.txt'])
})
