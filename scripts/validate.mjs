import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { LAB } from './config.mjs'
import { assertOwned, cleanupOwned, createOwnedRun, fixtureEnv, git, interruptController, requireRuntime, runCommand, sourceCheckout } from './runtime.mjs'
import { prepareSource } from './source.mjs'

const help = `Usage: npm run validate -- [--mode smoke|linux|integration|benchmark] [--checkout PATH] [--json]
  smoke        Build a pinned image, verify its actual source tree, native checks and red/green regression (default).
  linux        Smoke plus full upstream unit suite, lint and build.
  integration  PostgreSQL 17 integration + real HTTP checks; requires --allow-integration.
  benchmark    Timed adapter microbenchmark; requires --allow-benchmark. No performance clearance implied.
Creates unique private local Docker resources; removes only resources bearing this run's ownership token.
Builds use network/registry downloads. Runtime network is internal with no host ports. Logs: evidence/local/.`
let owner, source, checkout, env, project, image, configFile, started = false, buildAttempted = false, dispose
let serial = 0
const result = { status: 'FAIL', stages: [] }
try {
  const { values } = parseArgs({ options: { help: { type: 'boolean' }, mode: { type: 'string', default: 'smoke' }, checkout: { type: 'string' }, json: { type: 'boolean' }, 'allow-integration': { type: 'boolean' }, 'allow-benchmark': { type: 'boolean' } } })
  if (values.help) { console.log(help); process.exit(0) }
  requireRuntime()
  if (!['smoke', 'linux', 'integration', 'benchmark'].includes(values.mode)) throw new Error('Unknown --mode. Use --help.')
  if (values.mode === 'integration' && !values['allow-integration']) throw new Error('Integration applies migrations to new disposable databases. Pass --allow-integration to opt in.')
  if (values.mode === 'benchmark' && !values['allow-benchmark']) throw new Error('Benchmark consumes local CPU/disk for several minutes. Pass --allow-benchmark to opt in.')
  checkout = sourceCheckout(values.checkout)
  owner = createOwnedRun(`validate-${values.mode}`)
  project = `storage-lab-${randomBytes(8).toString('hex')}`
  image = `storage-lab-rc:${project.slice(12)}`
  const interrupts = interruptController(); dispose = interrupts.dispose
  env = fixtureEnv(undefined, { HOME: process.env.HOME, ...Object.fromEntries(Object.entries(process.env).filter(([k]) => /^DOCKER_(HOST|CONTEXT|CONFIG|TLS_VERIFY|CERT_PATH)$/.test(k))) })
  const docker = (label, args, options = {}) => runCommand(`${String(++serial).padStart(2, '0')}-${label}`, 'docker', args, { env, evidence: owner.evidence, timeout: 60_000, signal: interrupts.signal, ...options })
  const context = (await docker('context', ['context', 'show'])).stdout.trim()
  const inspectedEndpoint = JSON.parse((await docker('endpoint', ['context', 'inspect', context, '--format', '{{json .Endpoints.docker.Host}}'])).stdout)
  const endpoint = process.env.DOCKER_CONTEXT ? inspectedEndpoint : (process.env.DOCKER_HOST || inspectedEndpoint)
  if (!endpoint.startsWith('unix://')) throw new Error('Only a local Unix-socket Docker daemon is supported. Select your local context explicitly; remote daemons are refused.')
  // Freeze the inspected target so Docker CLI environment precedence cannot change it.
  delete env.DOCKER_CONTEXT
  env.DOCKER_HOST = endpoint
  result.context = { name: context, endpoint }
  for (const [kind, args] of [['container', ['ps', '-aq']], ['network', ['network', 'ls', '-q']], ['volume', ['volume', 'ls', '-q']]]) {
    if ((await docker(`collision-${kind}`, [...args, '--filter', `label=com.docker.compose.project=${project}`])).stdout.trim()) throw new Error('Project collision: no resources were changed.')
  }
  source = prepareSource(checkout, owner)
  Object.assign(env, { STORAGE_SOURCE_DIR: source, STORAGE_LAB_DIR: LAB, STORAGE_EVIDENCE_DIR: owner.evidence, STORAGE_LAB_IMAGE: image, STORAGE_LAB_RUN: project })
  const compiled = JSON.parse((await docker('compile', ['compose', '--env-file', '/dev/null', '-p', project, '-f', path.join(LAB, 'validation/compose.yml'), 'config', '--format', 'json'], { captureRaw: true })).stdout)
  for (const service of Object.values(compiled.services)) {
    if (service.container_name || service.ports?.length) throw new Error('Unsafe compiled config: explicit container name or published port.')
    service.labels = { ...service.labels, 'storage.lab.owner': owner.token }
    service.restart = 'no'
  }
  compiled.networks.default = { ...compiled.networks.default, internal: true, labels: { 'storage.lab.owner': owner.token } }
  for (const volume of Object.values(compiled.volumes ?? {})) { if (volume.external) throw new Error('External volume refused.'); volume.labels = { ...volume.labels, 'storage.lab.owner': owner.token } }
  configFile = path.join(owner.evidence, 'compose.json')
  writeFileSync(configFile, JSON.stringify(compiled, null, 2) + '\n', { flag: 'wx' })
  const composeArgs = ['compose', '--env-file', '/dev/null', '-p', project, '-f', configFile]
  result.mode = values.mode; result.project = project; result.evidence = owner.evidence
  buildAttempted = true
  await docker('build', ['build', '--label', `storage.lab.owner=${owner.token}`, '-t', image, '-f', path.join(LAB, 'validation/Dockerfile'), source], { timeout: 900_000 })
  result.image = JSON.parse((await docker('image', ['image', 'inspect', image])).stdout)[0].Id
  result.stages.push('pinned fresh source image built with locked npm dependencies')
  const compose = (label, args, options) => docker(label, [...composeArgs, ...args], options)
  started = true
  if (values.mode === 'integration') {
    await compose('services', ['up', '-d', '--wait', '--wait-timeout', '180', 'tenant_db', 'multitenant_db', 'pg_bouncer', 'multitenant_pgbouncer', 'rustfs', 'rustfs_setup', 'imgproxy', 'rest-catalog'], { timeout: 240_000 })
    await compose('integration', ['run', '--rm', '--no-deps', 'runner', 'node', '/lab/validation/integration.mjs'], { timeout: 900_000 })
    await compose('http', ['run', '--rm', '--no-deps', 'runner', 'node', 'node_modules/tsx/dist/cli.mjs', '--tsconfig', 'tsconfig.json', '/lab/validation/http-file.ts'], { timeout: 120_000 })
  } else {
    const script = values.mode === 'benchmark' ? '/lab/benchmarks/run.mjs' : '/lab/validation/linux.mjs'
    await compose('runner', ['run', '--rm', '--no-deps', 'runner', 'node', script, ...(values.mode === 'smoke' ? ['--smoke'] : values.mode === 'benchmark' ? ['--timed'] : [])], { timeout: values.mode === 'smoke' ? 180_000 : 900_000 })
  }
  result.stages.push(`${values.mode} runner exited successfully`)
  result.status = 'PASS'
} catch (error) { result.error = error.message; process.exitCode = 1 }
finally {
  if (owner) {
    try {
      assertOwned(owner)
      if (started && configFile) {
        // Validate ownership of every project object before destructive Compose teardown.
        const docker = (label, args) => runCommand(`cleanup-${label}`, 'docker', args, { env, evidence: owner.evidence, timeout: 60_000 })
        for (const [kind, listArgs] of [['container', ['ps', '-aq']], ['network', ['network', 'ls', '-q']], ['volume', ['volume', 'ls', '-q']]]) {
          const ids = (await docker(`list-${kind}`, [...listArgs, '--filter', `label=com.docker.compose.project=${project}`])).stdout.trim().split(/\s+/).filter(Boolean)
          if (ids.length) {
            const objects = JSON.parse((await docker(`inspect-${kind}`, [kind, 'inspect', ...ids])).stdout)
            if (objects.some(object => (object.Config?.Labels ?? object.Labels)?.['storage.lab.owner'] !== owner.token)) throw new Error(`Refusing teardown: ${kind} owner mismatch. Inspect retained evidence manually.`)
          }
        }
        await docker('down', ['compose', '--env-file', '/dev/null', '-p', project, '-f', configFile, 'down', '--volumes', '--remove-orphans', '--timeout', '10'])
      }
      if (buildAttempted && image) {
        const inspected = await runCommand('cleanup-image-inspect', 'docker', ['image', 'inspect', image], { env, evidence: owner.evidence, allowed: [0, 1], progress: false })
        if (inspected.status === 0) {
          if (JSON.parse(inspected.stdout)[0].Config.Labels['storage.lab.owner'] !== owner.token) throw new Error('Refusing image cleanup: owner mismatch.')
          await runCommand('cleanup-image-remove', 'docker', ['image', 'rm', image], { env, evidence: owner.evidence })
        }
      }
      if (source && existsSync(source)) git(checkout, ['worktree', 'remove', '--force', source])
      cleanupOwned(owner)
      result.cleanup = 'own containers/network/volumes/image tag and temporary source removed; evidence retained'
    } catch (error) { result.status = 'FAIL'; result.cleanupError = error.message; process.exitCode = 1 }
    writeFileSync(path.join(owner.evidence, 'summary.json'), JSON.stringify(result, null, 2) + '\n')
  }
  dispose?.()
}
console.log(JSON.stringify(result, null, 2))
