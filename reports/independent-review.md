# Onafhankelijke review — FileBackend upload cancellation

**Verdict: READY** voor de onderzochte bijdrage. Geen ernstige of blokkerende fout aangetroffen. De fix is klein, reproduceert een bestaand adapterprobleem en respecteert de bestaande atomische publicatie. De volledige onafhankelijke unit-run was niet volledig groen: twee ongewijzigde ECS HTTP-tests faalden onder gedeelde belasting; de geïsoleerde herhaling van die volledige ECS-suite slaagde met 8/8 tests. Dat onderscheid blijft onderdeel van dit verdict.

Reviewdatum: 28 oktober 2026. Onderzochte commit: `3bbc971796fe9907a030c4fc70a07d440930d7b2`; directe parent: `b11f751abe0fdd6c7f56d3a858b5527f683b7a37`. Runtime: macOS, Node `v24.21.0`, Vitest `5.0.5`.

Deze review is uitgevoerd door een aparte agentsessie met eigen bronanalyse en eigen experimenten. Dit is geen claim van een ander model of menselijke review. Het labrapport `reports/file-upload-cancellation.md` is pas gelezen nadat de diff, adapter, call sites, foutconventies en relevante lokale history zelfstandig waren onderzocht. Het bestaande reproducer-script is niet gebruikt voor de eigen experimenten.

## Bronanalyse en ernstige concerns

Er zijn geen severe concerns of vereiste codewijzigingen gevonden.

De productiewijziging telt acht toevoegingen en één verwijdering in `src/storage/backend/file.ts`; daarnaast komen vijf tests bij. De oude methode accepteert een signal maar geeft dat niet door aan de stream-pipeline. De nieuwe vroegtijdige check voorkomt alle staging voor een vooraf afgebroken signal. Het doorgeven van `{ signal }` maakt tijdens de overdracht zowel bron als bestemming afbreekbaar. De bestaande catch verwijdert het stagingbestand voordat een `AbortError` wordt omgezet naar `AbortedTerminate`. Omdat metadata en rename pas na succesvolle pipeline volgen, raakt een afgebroken overdracht de oude bestemming niet.

Onderzocht: `Uploader.upload`, REST create/update-routes, S3 `put-object` en diens buitenste pipeline, `RequestSignals`, de S3 uploadadapter, backend-errorconstructie, error-rendering en connection-close-afhandeling. REST geeft het request-body signal door. De uploader voltooit pas na een geslaagde backendupload en plant cleanup bij een fout. `AbortedTerminate` zet het bestaande connection-close-metadataflag; het is geen nieuwe foutcode of nieuwe HTTP-status. Pre-abort `Aborted` en actieve abort `AbortedTerminate` volgen de bestaande S3-conventie.

De cancellationgrens ligt bij het afronden van de body-pipeline. Daarna lopen metadata en rename door. Dit is expliciet getest in de bijdrage en passend bij het request-body signal: een latere response-disconnect hoeft de al ontvangen body niet terug te draaien. Het is geen garantie dat iedere REST/S3-request na ieder mogelijk disconnectmoment identiek afloopt; de buitenste routepipeline kan eveneens annuleren.

Het multipart-completionpad roept `uploadObject` zonder signal aan; deze wijziging voegt daar geen cancellationbeleid toe. Dat is een bestaande grens en geen regressie van deze bijdrage.

De aangeleverde actieve-cancellationtest wacht op `resume`, wat de bron niet voortijdig in flowing mode zet. Dat is geschikt om een actieve pipeline te herkennen, maar bewijst op zichzelf niet dat de partiële bytes al fysiek zijn geschreven. Mijn afzonderlijke experiment wacht daarom op een werkelijk stagingbestand met 64 KiB inhoud voordat het annuleert.

## Zelfstandige experimenten en resultaten

Alles draaide in een eigen detached worktree `/private/tmp/storage-independent-review`, met een symlink naar bestaande dependencies. Alleen tracked `.env.sample` en `.env.test.sample` zijn naar de tijdelijke worktree gekopieerd. Hoofdcheckout en bestaande labbestanden zijn niet aangepast. De eigen tests gebruiken de echte FileBackend, filesystem en native xattrs, zonder dependency mocks.

| Eigen experiment | Parent | Commit |
| --- | --- | --- |
| Vooraf geannuleerd signal met eigen Error-reason | HTTP-metadata 200; bestand `new` gepubliceerd | `Aborted`; root blijft leeg |
| Acht annuleringen na aantoonbaar geschreven 64 KiB | Bron blijft live; volledige 64 KiB plus `tail` vervangt `prior` | Bron direct destroyed; `AbortedTerminate`; `prior` blijft staan |
| Staging na iedere actieve annulering | Geen restant na voltooide baseline | Geen restant na afgebroken patch |
| 1 MiB deterministische binaire payload, met en zonder live signal | SHA-256 en echte metadata correct | SHA-256 en echte metadata correct |
| Bron gooit EIO met live signal | Originele foutmelding; oude object behouden; stage weg | Zelfde gedrag; signallistener opgeruimd |
| Bron gooit zelf `AbortError`, zonder signal | `InternalError` met bronfout als `originalError` | `AbortedTerminate` met dezelfde bronfout als `originalError` |

Alle eigen verwachtingen zijn op beide versies geslaagd: aanvankelijk 4/4 tests per versie en na toevoeging van de foutclassificatiecase 5/5 per versie. De baselineverwachtingen beschrijven bewust het oude ongewenste gedrag; dit is geen claim dat de regressietests op de parent slagen.

De vijf ingediende cancellationtests zijn daarnaast tegen alleen de oorspronkelijke `file.ts` uitgevoerd. Uitslag: **2 failures, 3 passes, 152 overgeslagen**. De twee failures zijn precies voorafgaande en actieve annulering; de oorspronkelijke adapter retourneert daar succes. De rest van de worktree bleef gelijk, waardoor de productiewijziging de enige onderzochte variabele was. De twee upstream bronbestanden zijn tussen deze runs hersteld naar de exacte commit; geen handgeschreven equivalent van de adapter is getest.

## Testcommando's en echte uitslagen

Commando's hieronder zijn uitgevoerd vanuit de tijdelijke worktree. Voor de baseline is uitsluitend `src/storage/backend/file.ts` uit de exacte parent teruggezet. `REVIEW_BASELINE=1` schakelt alleen de verwachtingen van mijn eigen testbestand om.

1. `npm run test:unit -- src/storage/backend/file.test.ts src/http/error-handler.connection.test.ts src/internal/errors/render.test.ts`
   - Eerste poging vóór sample-env: twee suites konden niet laden door `PGRST_JWT_SECRET is undefined`; render-tests 3/3 groen.
   - Met sample-env binnen sandbox: 167 pass, 50 failures door `listen EPERM 127.0.0.1`, geen aangetoonde productiefout.
2. `npm run test:unit -- src/storage/backend/file.test.ts src/http/error-handler.connection.test.ts src/internal/errors/render.test.ts src/storage/backend/independent-review.test.ts`
   - Buiten sandbox met localhost-listenrechten: **4 bestanden, 221/221 geslaagd**, exit 0. Eigen suite bevatte toen vier cases.
3. `REVIEW_BASELINE=1 npm run test:unit -- src/storage/backend/independent-review.test.ts`
   - Exacte parentadapter: **4/4 geslaagd**, exit 0, met observaties zoals in de tabel.
4. `npm run test:unit -- src/storage/backend/file.test.ts -t 'FileBackend uploadObject signal'`
   - Exacte parentadapter met ingediende regressietests: **2 fail / 3 pass**, exit 1, overige 152 skipped.
5. `OTEL_METRICS_ENABLED=false npm run test:unit`
   - Commitadapter, eigen vier cases inbegrepen, buiten sandbox: **176 bestanden geslaagd / 1 gefaald; 3308 tests geslaagd / 2 gefaald van 3310**, exit 1, 63,20 seconden.
   - Alleen `src/internal/cluster/ecs.http.test.ts` faalde: `cancels a partial SDK response and resumes polling with the real client` door de 5000ms-timeout; `cancels a stalled continuation page without publishing the partial count` omdat `stalledResponse?.destroyed` nog undefined was.
6. `OTEL_METRICS_ENABLED=false npm run test:unit -- src/internal/cluster/ecs.http.test.ts --maxWorkers=1`
   - Buiten sandbox, geïsoleerde herhaling: **8/8 geslaagd**, exit 0, 9,20 seconden. De hoofdtaak meldde gelijktijdige Docker/npm/native compilatie. Gedeelde belasting is een plausibele verklaring voor de eerdere timingfailures, geen bewezen oorzaak. De twee tests importeren de gewijzigde FileBackend niet.
7. `OTEL_METRICS_ENABLED=false npm run test:unit -- src/storage/backend/independent-review.test.ts`, daarna `REVIEW_BASELINE=1 OTEL_METRICS_ENABLED=false npm run test:unit -- src/storage/backend/independent-review.test.ts`
   - Na toevoeging van de `AbortError`-zonder-signal-case: **5/5 geslaagd op commit en parent**, exit 0.
8. `npm run build`: **exit 0** (TypeScript plus build).
9. `node_modules/.bin/biome check src/storage/backend/file.ts src/storage/backend/file.test.ts`: **2 bestanden gecontroleerd, geen wijzigingen, exit 0**.
10. `git diff --check b11f751abe0fdd6c7f56d3a858b5527f683b7a37 3bbc971796fe9907a030c4fc70a07d440930d7b2`: **exit 0**.

## Geverifieerde claims, preciseringen en ontbrekend bewijs

Geverifieerd: de concrete cancellationbug bestaat ook op de directe parent; pre-abort maakt na de patch niets aan; annulering tijdens echte diskoverdracht vernietigt de bron en behoudt het oude object; staging wordt verwijderd; succesvolle payloads en native metadata blijven correct; abortlisteners worden opgeruimd; gewone bronfouten blijven herkenbaar. De vijf ingediende tests onderscheiden de twee defecte baselinepaden van de patch.

Niet-blokkerende precisering van het labrapport: de zin dat calls zonder signal normaal gedrag behouden is juist voor succesvolle overdrachten, maar te absoluut voor foutclassificatie. Een bron die zelf `Error(name='AbortError')` gooit, wordt ook zonder signal genormaliseerd naar `AbortedTerminate`, waar de parent `InternalError` gaf. Dit is concreet getest. De oorspronkelijke fout blijft bewaard en het nieuwe gedrag volgt de bestaande S3-normalisatie. Ik zie hierin geen blocker; beperk de claim tot succesvolle overdrachten en gewone niet-abortfouten, of documenteer deze normalisatie.

Lokale history onderzocht: `d94a5aae` introduceerde staged writes; `222c56b4` verbeterde setup-retries; `4134dbba` voegde HEAD-cancellation en per-key delete toe maar laat uploadcancellation ontbreken; `b11f751a` wijzigt S3 metadata en bevat de fix niet. De lokaal aanwezige `upstream/master` staat op de exacte parent. Lokale logs en remote refs geven geen tweede equivalente uploadfix aan. Dat bewijst niet dat er geen ongepubliceerde of nieuwere overlappende PR bestaat. Er zijn geen remote updates opgehaald of GitHub-issues/PR's opnieuw geraadpleegd; de zoekclaims en #854-verwijzing uit het labrapport zijn daarom niet zelfstandig extern bevestigd.

Niet zelfstandig bewezen: een volledig groene suite onder dezelfde omstandigheden als de eerdere labrun; historische totalen van die eerdere runs; Linux/native-xattrgedrag; PostgreSQL-integratie; endpointniveau met echte database; productie-impact, performancewinst, incidenternst of maintaineracceptatie. Linux- en integratiebewijs ontbreken in deze review, maar de gerichte adapterevidentie is voldoende voor deze begrensde codewijziging. Er is geen productie- of cloudtraffic gestart; localhost-tests en eerder geconfigureerde lokale telemetry zijn geen cloudvalidatie. Voor de latere volledige run is metrics expliciet uitgeschakeld.

Na vastlegging van de resultaten is de eigen tijdelijke worktree opgeruimd. De zelfstandig geschreven testbron staat hieronder zodat de experimenten controleerbaar blijven zonder een los script in de bijdrage op te nemen.

## Appendix: eigen testbron

Sla deze bron in een disposable checkout op als `src/storage/backend/independent-review.test.ts`; gebruik tracked sample-env en de bestaande unitconfig. De test rekent op macOS native xattr-ondersteuning zoals de uitgevoerde omgeving.

```typescript
import * as fsp from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { getEventListeners } from 'node:events'
import os from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'
import { getConfig } from '../../config'
import { FileBackend } from './file'
import { withOptionalVersion } from './adapter'

const baseline = process.env.REVIEW_BASELINE === '1'
let root: string
let backend: FileBackend
beforeEach(async () => {
  root = await fsp.mkdtemp(path.join(os.tmpdir(), 'storage-native-independent-'))
  vi.stubEnv('STORAGE_FILE_BACKEND_PATH', root)
  getConfig({ reload: true })
  backend = new FileBackend()
})
afterEach(async () => {
  vi.unstubAllEnvs()
  getConfig({ reload: true })
  await fsp.rm(root, { recursive: true, force: true })
})
const upload = (body: Readable, signal?: AbortSignal) =>
  backend.uploadObject('bucket', 'nested/object', 'v1', body, 'application/octet-stream', 'no-cache', signal)
const objectFile = () => path.join(root, withOptionalVersion('bucket/nested/object', 'v1'))

it('native pre-abort creates no files, even with custom reason', async () => {
  const controller = new AbortController()
  controller.abort(new Error('custom cancellation reason'))
  const result = await upload(Readable.from(Buffer.from('new')), controller.signal).then(
    value => ({ value }), error => ({ error })
  )
  if (baseline) {
    expect(result).toHaveProperty('value.httpStatusCode', 200)
    expect(await fsp.readFile(objectFile(), 'utf8')).toBe('new')
  } else {
    expect(result).toHaveProperty('error.code', 'Aborted')
    expect(await fsp.readdir(root)).toEqual([])
  }
})

it('native abort after disk has received 64KiB keeps prior object, repeated eight times', async () => {
  for (let round = 0; round < 8; round++) {
    await upload(Readable.from(Buffer.from('prior')))
    const controller = new AbortController()
    const first = Buffer.alloc(64 * 1024, round + 1)
    const tail = Buffer.from('tail')
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    const body = Readable.from((async function* () {
      yield first
      await gate
      yield tail
    })())
    const result = upload(body, controller.signal).then(value => ({ value }), error => ({ error }))
    const directory = path.dirname(objectFile())
    const deadline = Date.now() + 3000
    let observed = false
    while (Date.now() < deadline) {
      const files = await fsp.readdir(directory)
      for (const file of files.filter(name => name.endsWith('.tmp'))) {
        if ((await fsp.stat(path.join(directory, file))).size === first.length) observed = true
      }
      if (observed) break
      await new Promise(resolve => setTimeout(resolve, 1))
    }
    controller.abort(new Error('stop after disk write'))
    const destroyed = body.destroyed
    release()
    const outcome = await result
    expect(observed).toBe(true)
    if (baseline) {
      expect(outcome).toHaveProperty('value.httpStatusCode', 200)
      expect(destroyed).toBe(false)
      expect(await fsp.readFile(objectFile())).toEqual(Buffer.concat([first, tail]))
    } else {
      expect(outcome).toHaveProperty('error.code', 'AbortedTerminate')
      expect(destroyed).toBe(true)
      expect(await fsp.readFile(objectFile(), 'utf8')).toBe('prior')
    }
    expect(await fsp.readdir(directory)).toEqual([path.basename(objectFile())])
    expect(getEventListeners(controller.signal, 'abort')).toHaveLength(0)
  }
})

it('native binary success, no-signal and live-signal, keeps bytes and real metadata', async () => {
  const payload = Buffer.alloc(1024 * 1024)
  for (let index = 0; index < payload.length; index++) payload[index] = index % 251
  for (const signal of [undefined, new AbortController().signal]) {
    const result = await upload(Readable.from([payload.subarray(0, 13), payload.subarray(13)]), signal)
    expect(result.size).toBe(payload.length)
    expect(result.mimetype).toBe('application/octet-stream')
    expect(result.cacheControl).toBe('no-cache')
    const digest = (value: Buffer) => createHash('sha256').update(value).digest('hex')
    expect(digest(await fsp.readFile(objectFile()))).toBe(digest(payload))
    if (signal) expect(getEventListeners(signal, 'abort')).toHaveLength(0)
  }
})

it('native source I/O failure keeps previous object and cleans stage with live signal', async () => {
  await upload(Readable.from('prior'))
  const controller = new AbortController()
  const body = Readable.from((async function* () {
    yield Buffer.alloc(65536)
    throw Object.assign(new Error('independent I/O failure'), { code: 'EIO' })
  })())
  await expect(upload(body, controller.signal)).rejects.toThrow('independent I/O failure')
  expect(await fsp.readFile(objectFile(), 'utf8')).toBe('prior')
  expect(await fsp.readdir(path.dirname(objectFile()))).toEqual([path.basename(objectFile())])
  expect(getEventListeners(controller.signal, 'abort')).toHaveLength(0)
})

it('documents a source-originated AbortError without a supplied signal', async () => {
  const sourceError = Object.assign(new Error('source self-aborted'), { name: 'AbortError' })
  const body = Readable.from((async function* () {
    yield 'some bytes'
    throw sourceError
  })())
  const result = await upload(body).then(value => ({ value }), error => ({ error }))
  expect(result).toHaveProperty('error.code', baseline ? 'InternalError' : 'AbortedTerminate')
  expect(result).toHaveProperty('error.originalError', sourceError)
  expect(await fsp.readdir(path.dirname(objectFile()))).toEqual([])
})
```
