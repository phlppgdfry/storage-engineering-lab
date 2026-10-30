# Status

Gestart op 2026-10-27. Deze pagina wordt bijgewerkt na daadwerkelijke uitvoering.

## Gecontroleerd

- GitHub connector en GitHub CLI melden beide account `phlppgdfry`.
- Officiële repository lokaal gekloond; oorspronkelijke working tree schoon.
- Baseline: `4134dbba1b94757f400d5d7c09f9382935efd726`.
- Fork aangemaakt op https://github.com/phlppgdfry/storage.
- Remotes: `origin` = eigen fork; `upstream` = officiële repository.
- README, LICENSE, SECURITY.md, package scripts, Vitest-configuraties, CI en PR-titleworkflow gelezen. Geen lokale CONTRIBUTING.md, AGENTS.md of PR-template aangetroffen bij de eerste inventarisatie.
- CI gebruikt lint/build, unit coverage en database-integratietests, onder meer PostgreSQL 13–18, OrioleDB en Multigres.
- Context7-documentatie over S3-compatibiliteit geraadpleegd. Niet iedere AWS-functionaliteit is een beloofde Supabase-functionaliteit; verschillen zijn niet automatisch bugs.

## Omgeving

- macOS arm64, Node 24.21.0, globale npm 12.1.0.
- Upstream verwacht npm 11.12.1. Eerste `npm ci` met npm 12 faalde met `EALLOWGIT` op de vastgezette pg-boss Git-dependency.
- Vervolginstallatie gebruikt `npx --yes npm@11.12.1 ci --no-audit --no-fund`; geen globale npm-wijziging en geen lockfilewijziging.
- Docker Desktop was gestopt, is gestart; daemon antwoordt met versie 29.9.2.

## Eerste onderzoeksronde afgerond

- H001 bevestigd in de echte lokale bestandsbackend: geannuleerde uploads konden doorgaan en succes melden.
- Vijf regressie-/controletests toegevoegd. Vóór de fix: twee falen, drie slagen. Na de fix: vijf slagen.
- Apart native experiment zonder mocks: drie identieke metingen vóór en drie na de fix.
- Eén reproduceercommando werkt: `npm run reproduce` in deze labmap; maakt en verwijdert een eigen tijdelijke worktree.
- Volledige schone baseline buiten de sandbox: **176 bestanden, 3.295 tests geslaagd**.
- Fix op oorspronkelijke baseline: **176 bestanden, 3.300 tests geslaagd**.
- Upstream schoof tijdens het onderzoek op naar `b11f751abe0fdd6c7f56d3a858b5527f683b7a37`; branch hierop bijgewerkt.
- Definitieve branch: `fix/file-upload-cancellation`, commit `3bbc971796fe9907a030c4fc70a07d440930d7b2`.
- Definitieve volledige suite op die commit: **176 bestanden, 3.306 tests geslaagd**. Het verschil met de eerdere 3.300 komt door nieuwe upstream-tests.
- Definitieve lint, build en `git diff --check upstream/master...HEAD` slagen. Storage-working-tree schoon.
- Productiewijziging: 8 insertions, 1 deletion. Vijf tests in het bestaande testbestand; totaal twee gewijzigde upstream-bestanden.
- Bij de eerste publicatie waren database-integratietests nog niet uitgevoerd. De latere afronding staat hieronder. Geen hosted-service-test of algemene performanceclaim.

## Review en vervolg

Kritische zelfreview staat in `research/self-review.md`; een fout in de eerste testharness is gecorrigeerd en opnieuw gevalideerd. Bij de eerste publicatie was er nog geen onafhankelijke review. Later is een aparte agentsessie uitgevoerd, zoals hieronder vastgelegd. Een menselijke maintainerreview is nog niet geclaimd.

H002 en H003 blijven hypotheses. H004 overlapt met bestaand werk. H005 is uitgesteld. We hebben geen vijf bevestigde bugs gevonden en doen die claim ook niet.

De onderzoeksrepo bevat een rapport, compacte bewijsbestanden, reproduceerbare patches en een voorbereide PR-beschrijving. Ruwe volledige logs en zoekresultaten staan onder genegeerd `evidence/local/`.

## Vijf gevraagde afrondingsstappen — 28 oktober

De gebruiker koos expliciet de vijf ontbrekende afrondingsstappen, niet H001–H005. Zie `reports/completion-2026-10-28.md` voor bewijs en beperkingen.

1. Aparte agentreview met eigen bronanalyse en native experimenten: geen blokkerend correctnessprobleem, verdict READY binnen die scope. Dit was geen ander model of menselijke reviewer. Brede run: 3.308 pass en twee bestaande ECS-timingfailures; geïsoleerde ECS-suite daarna 8/8 pass.
2. Echte PostgreSQL 17-migraties en seed: pass. Volledige standaardintegratie: 57 bestanden, 1.379 tests pass. Vijf extra HTTP-controles met echte DB en native bestanden pass, waaronder een disconnect na gedeeltelijk schrijven.
3. Linux arm64: 176 unitbestanden, 3.304 pass / twee root-permissieskips, lint/build pass. Complete file-backendtests als niet-root: 157/157 pass. Native reproductie driemaal vóór/na en regressies red/green bevestigd.
4. Performanceonderzoek: 130 meetgroepen in drie bewaarde datasets. Cancellationbronbytes consistent 4 MiB naar 128 KiB per operatie. Normale uploads: INSUFFICIENT EVIDENCE voor attributie of afwezigheid van regressie; de oorspronkelijke vertraging en onstabiele shamcontrole blijven zichtbaar. Geen performance-goedkeuring geclaimd.
5. Maintainerprioriteiten: honderd recent bijgewerkte PR's en zeven geselecteerde discussies, menselijke feedback onderscheiden van bots. Geen officiële roadmap of acceptatiekans afgeleid.

De productiecommit blijft `3bbc9717`. Alleen lab-hulpmiddelen, bewijs en rapportage zijn toegevoegd. De tijdelijke integratiestack en eigen testvolumes zijn opgeruimd; de lokale Linux-image blijft beschikbaar. De PR blijft draft en upstream CI meldt nog `action_required`.

## Publicatie

Publicatie is expliciet goedgekeurd door de gebruiker en uitgevoerd:

- Onderzoeksrepo: https://github.com/phlppgdfry/storage-engineering-lab (publiek).
- Fork: https://github.com/phlppgdfry/storage.
- Bijdragebranch: `phlppgdfry/storage:fix/file-upload-cancellation`, commit `3bbc9717` gepusht.
- Draft-PR: https://github.com/supabase/storage/pull/1616.
- Op GitHub gecontroleerd: open, draft, mergeable, één commit, alleen de twee bedoelde bestanden. Niet gemerged.
- GitHub Actions CI en Acceptance melden `action_required`; de lokale testresultaten zijn afzonderlijk vastgelegd. Dit is geen geslaagde upstream-CI-run.
- De GitHub-connector kon geen PR openen door een integratie-403; de bestaande CLI-login kon dat wel. Geen extra authenticatie of overdracht van tokens gebruikt.
- AI-assistentie staat vermeld in de PR. Er zijn geen losse issues, commentaren, reviewer-verzoeken of berichten geplaatst.

## Volgende mijlpaal — 29 oktober 2026

De bestaande lab-upgrade is gepubliceerd op `prelaunch/reproducibility-rc` in [eigen PR #1](https://github.com/phlppgdfry/storage-engineering-lab/pull/1), niet gemerged. Push- en PR-fast-CI zijn daadwerkelijk geslaagd, ook op documentatiecommit `4f98bb5`. De echte terminaldemo herhaalde native gedrag en red2/green5. Upstream #1616 blijft open/draft/mergeable zonder feedback; CI/Acceptance `action_required`.

Nieuw werk staat afzonderlijk lokaal op `research/bounded-cycle`: native downloadannulering driemaal gereproduceerd op huidige upstream `dcbb8eb7`, zonder FD-lek of bewezen HTTP-impact; experimentele een-cyclus-runner met vaste catalogus en hashgeheugen; vaste/adaptieve/random evaluatie elk 4/6 synthetische defectgevallen, dus geen gemeten adaptief voordeel. 43 labtests slagen. [Uitvoering, resultaten en vervolgoracle](../reports/next-level.md). Historische resultaten blijven historisch; Storage Doctor onaangeroerd.

## Showcase-review — 29 oktober

De publieke reviewbranch is nu ook vanuit een echte schone publieke kloon gecontroleerd: check,36tests,doctor en native demo slagen. De nieuwe lokale uitbreiding heeft44geslaagde tests. Aparte agentreview reproduceerde twee prototypefouten; symlink-geheugentoegang en onvolledig beoordelingsbewijs zijn gecorrigeerd. De planner-evaluatie blijkt niet onderscheidend: iedere ordening moet4/6vinden.

Drie daadwerkelijke HTTP-proeven bevestigen MD5-werk na disconnect vóór headers; een lokale diagnostische signaaldoorgifte stopt dit vroeg. Volledige/range-responsstreams ruimen wel op; geen descriptorlek. Onderbreking met SIGINT geeft de bedoelde FAIL met cleanupPASS. Alle nieuwe wijzigingen blijven lokaal; geen push/merge/PR-edit/bericht. [Actueel verslag en vervolgstappen](../reports/showcase-review.md).

## Advanced review — 30 oktober 2026

Upstream schoof naar211b2beb met Node26/npm12. Historische bron/dependencies/130groepen blijven intact. Een afzonderlijke lokale GET-fix op `fix/file-download-cancellation` (`e1e033c`) voegt19gerichte controles toe; de oorspronkelijke code faalt10keer en slaagt9keer. De fix passeert171file-tests,3410unit-tests in180bestanden,lint en build. Echte HTTP-varianten omvatten header-only/late/server-close en slow-consumer-backpressure. De bestaande uploadpatch is afzonderlijk op huidige Node26basis gevalideerd: red2/green5 en native3+3.

Het lab sluit een gereproduceerde artifact-symlinkrace met descriptor-gebaseerde reads;45labtests slagen. Geen nieuwe publicatie,merge,PR-edit of communicatie. Huidige GO-beslissingen, inventaris, bewijs en resterende gates staan in [het engineeringrapport](../reports/advanced-engineering.md).

### Frozen latest baseline9d15cdc9

A further upstream advance was checked separately. GET candidate8eceb9: lint/build/HTTPPASS; full unit first3440pass+1lifecyclefailure, bounded repeat3441pass. Untouched baseline also fails that lifecycle test. Separate unchanged-assertion real-config fixture correction9a76025 passes3422baseline tests; explicit GET+fixture overlay passes3441with lint/build and was reversed. Failures and refuted hypotheses remain retained. This is not a claim that all unmodified-baseline runs passed. [Details and exact current commits](../reports/advanced-engineering.md).
