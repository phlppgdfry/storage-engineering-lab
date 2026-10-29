# Durable local release-candidate log

## Scope and publication boundary

User requested an implementation-oriented local upgrade across audit, reproducibility, tests, research credibility, DX and launch preparation. No pushing, public posting, upstream changes/status edits or releases without new approval. Existing evidence must be preserved.

## Completed

- Baseline and live PR status checked from files/API; source fetched read-only.
- Clean local branch: `prelaunch/reproducibility-rc`; starting lab commit `7318960`.
- Initial audit and priorities recorded. Separate agents reviewed source/measurement risks and primary-source tooling alternatives.

## Current work

Implement P0 ownership, environment and provenance controls; add meaningful fast tests, then harden wrappers/documentation. Keep the upstream patch unchanged unless a confirmed new correctness problem appears.

## Exact next steps

1. Add shared small safety/process/source helpers and CLI help/doctor; refactor reproduction around pinned worktrees and fixture-only child environments.
2. Add managed Docker lifecycle with unique owned projects and guarded local-only destinations. Harden existing manual scripts against accidental invocation.
3. Add checker/tests/CI, registry validation and evidence/reference checks. Verify fresh clone/install/reproduction and fault paths.
4. Finalize performance-final using preserved data and independent review; do not invent a no-regression result.
5. Write concise docs, launch drafts, quality/readiness matrix and engineering/interview report; have separate agent review final changes, fix justified findings and rerun affected checks.
6. Finish with Dutch executive summary, actual commands/results and GO/CONDITIONAL GO/NO-GO; leave everything local.

## Implementation progress

- Added owned workspace, environment isolation, bounded process/log handling, doctor and native wrapper. Separate review found four helper flaws; fixed and13runtime tests passed. A later review added7endpoint/daemon/write-error tests and found an early rejected-daemon cleanup call; fixed with a build-attempt gate, all7pass.
- Added pinned clean build context, source hash + reconstructed Git-tree attestation, guarded container scripts, unique private Compose resources and ownership-checked teardown.
- Added strict evidence/registry validation,13evidence tests, deterministic next-experiment recommendation and proposed pinned/read-only fast CI. No AI platform/UI justified.
- Fresh host native reproduction passed three before/after repetitions and exact red2/green5. A sandbox IPC refusal is retained separately.
- First Docker attempt failed because redaction changed machine-readable fixture configuration; fixed raw internal capture with sanitized logs. Second:3304unit passes/2root skips, native3+3/red2green5; lint failed only on compact generated provenance JSON. Pretty-format fix prepared; Linux rerun required.
- Current integration run building. Final reports/docs/README written locally; quality/readiness are explicitly interim until remaining executions finish.

## Final local candidate state

- Functional work complete locally. Lab remains uncommitted on `prelaunch/reproducibility-rc`; upstream clean at3bbc9717 and only its original worktree remains.
- Final fast suite36/36pass; offline checks validate130measurement groups,5hypotheses, historical and new manifest integrity, links and JavaScript syntax. Independent final reviewer reran36/36 and checks and issued READY WITH LIMITATIONS.
- Linux final GZKQIw PASS: fresh pinned source/dependency image, native3+3/red2green5,3304unitpass/2rootskips,lint/build,cleanup.
- Integration ZDTxyl PASS: migrations/seed,newPG17,1379tests/57files,5realHTTPchecks,cleanup.
- Fresh exported candidate REleao PASS: check/tests/doctor/realnative3+3 with exactred2green5. It is a local export, not a published RCclone, and reuses host dependencies; freshLinuxinstall separatelyverified.
- Nested TMPDIR realtsx failure found in the first export; fixed short canonical system-temp root and regressiontested, successful actualexport repeated. All faileddevelopmentruns remain in curatedretainedfailures plus rawlocal logs.
- Curated sanitized execution records are in evidence/prelaunch with integritymanifest; historical evidence/completion unchanged. Securityadvisoryaudit:24affectedupstreampackages13high11moderate; no productioncertification. Highconfidencesecretscan96files/4localcommits nomatches at that checkpoint, explicitlylimited.
- Read-only finalDockerlisting found no ownedcontainers/networks/volumes remaining. Sourceworkingtree clean; no publication/push/PRedit/statuschange/contact/release occurred.
- Verdict CONDITIONAL GO for the focusedresearch upgrade after explicitpublicationapproval. Performanceequivalence remains INSUFFICIENT EVIDENCE; upstreamCI/humanreview, newhostedfastworkflow and broaderplatform/securitymatrix remain external/unverified. Exact nextactions are in reports/release-readiness.md. No more local featurework is justified by currentevidence.

## Latest continuation request

README shortened to the problem, minimal reproduction, proposed solution and evidence, retaining performance and dependency limitations. The user has now authorized publication of the lab upgrade on a reviewable branch and observation of GitHub CI; that publication has not yet occurred. A real terminal demo, read-only upstream feedback check and a decisive H002 investigation remain next. The bounded autonomous research-agent idea is explicitly deferred; it is not implemented. Exact private continuation context and authorization boundaries are stored in ignored `evidence/local/CONTINUE-HERE.md`.
