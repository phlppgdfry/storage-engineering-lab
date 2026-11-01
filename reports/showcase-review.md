# Showcase and research review — 2026-10-29

This review distinguishes public content from local proposals. Initial branch `research/bounded-cycle`, HEAD `b1a94e18572a8213f8da149b2350bcdb7460b322`, clean working tree. Public `main` remains `7318960`; public lab PR #1 head remains `4f98bb5`. All new work in this review is **local only**. No push, merge, release, PR status edit, maintainer contact or Storage Doctor change was performed.

## Public branch and merge recommendation

[Lab PR #1](https://github.com/phlppgdfry/storage-engineering-lab/pull/1) is OPEN, non-draft, MERGEABLE, with no returned comments/reviews and two successful fast checks at `4f98bb5`: [push](https://github.com/phlppgdfry/storage-engineering-lab/actions/runs/40810513903), [PR](https://github.com/phlppgdfry/storage-engineering-lab/actions/runs/40810518097). These are actual hosted lab checks, not upstream tests or the local research prototype.

Inspected scope: 65 changed files, focused on reproducibility, ownership/fixture/provenance controls, evidence, tests and presentation. No source change in the upstream checkout. The largest changed public file is 17,116 bytes; no large media or ignored raw evidence is included. The retained raw regression logs and failed attempts are intentional reproducibility evidence; generated manifests/JSON are checked, not unnecessary build outputs. Some audit/review history overlaps, but deleting it would lose decision/failure provenance; no new report hierarchy or framework is needed. [Targeted scan](../evidence/showcase/publication-scan.json) found no high-confidence token/private-key matches; this is not exhaustive secret certification. Synthetic fixtures/redaction tokens are intentional. The workflow has read-only contents permission, pinned actions and no persisted checkout credentials.

A **real fresh public clone** of `prelaunch/reproducibility-rc` at `4f98bb5` executed offline check, all **36 public-branch tests**, doctor and native demo; every command and owned cleanup exited zero. [Record](../evidence/showcase/public-quickstart.json), [actual demo output](../evidence/showcase/public-demo.txt). Native dependencies were reused from the verified pinned Storage checkout; this does not claim a fresh native dependency installation or a new full Linux/PostgreSQL run. macOS arm64, Node **24.22.2**. Existing hosted CI uses pinned Node 24.21.0; both are within the documented24.x scope.

Recommendation: **READY WITH DOCUMENTATION LIMITATIONS** for the existing reproducibility scope. No new blocking runtime defect was found in that public scope. Before merging, update the stale authoritative publication/CI language in readiness/quality/launch docs and review the improved landing page/case study. The historical dated tables must remain historical. Local fixes to the synthetic prototype do not block PR#1 because that prototype is absent from it. Download research must also remain separate. Do not merge this entire local research branch into the publication PR.

A concrete docs-only update is prepared on local branch **`showcase/presentation-rc`**, head `c9006dcd4df099a25b33de26e6281335b5d3db36`, based directly on public `4f98bb5`. Eleven files change; it excludes the new HTTP experiment/intervention and synthetic prototype. Its offline check and all36tests pass; a final documentation-only scope correction also passes the offline check. [Branch record](../evidence/showcase/presentation-branch.json).

Exact external steps still required: review `git diff prelaunch/reproducibility-rc...showcase/presentation-rc`; explicitly authorize the fast-forward publication `git push origin showcase/presentation-rc:prelaunch/reproducibility-rc`; inspect GitHub CI on that new head; then explicitly approve merging PR#1. These are prepared commands, **not executed**. If choosing to merge the existing head instead, accept its documented stale status language; current green CI does not make those sentences accurate. No automatic merge is justified.

## Showcase changes prepared locally

README now presents contract → code path → root cause → patch → red/green tests → evidence → upstream status. It includes a compact architecture diagram, a quickstart naming the actually published branch, links to the genuine transcript, clear local/public separation and unfavorable performance observations. The case study adds source-pinned references, alternatives and maintainer-facing boundaries. [Portfolio preparation](../docs/technical-interview-preparation.md) includes a proposed GitHub description, factual contribution summary,60-second demo narration, five-minute walkthrough and ten technical interview questions. These are prepared text, not posts or edits to repository settings.

## Upstream #1616

Live read-only review: [#1616](https://github.com/supabase/storage/pull/1616) OPEN/DRAFT/MERGEABLE, unmerged, one commit `3bbc9717`, two intended files; no returned issue comments/reviews or inline comments. The body is already focused enough: root cause, boundary after receiving bytes, AbortError compatibility, five tests, historical validation and performance uncertainty. **No description edit or production patch change is required now.**

CI and Acceptance still conclude `action_required`; title lint passes. Current upstream master is `dcbb8eb78fd389a51ba0e6477fde0c02f6466986`; inspected `file.ts`, renderer and request-signal plugin have no intervening changes from the relevant base. The upload bug therefore remains technically relevant; no conflict-driven rebase or broad refactor is warranted. Searches for MD5 cancellation/download disconnect did not establish a competing fix. Prior #1615 covers HEAD/delete cancellation; #854 remains an overlapping broad adapter proposal. Search absence is not proof of exclusive ownership.

The existing performance conclusion remains **INCONCLUSIVE**. Source-byte production on cancellation is distinct from normal-upload throughput. The130 original groups are preserved; unstable identical-code controls make more sampling on the same host poor use of the research budget. No new normal-upload benchmark or equivalence claim was made.

Maintainer guidance could later be useful, under explicit approval, on this narrow question: “Should filesystem GET stop in-flight MD5 before response headers when the existing disconnect signal aborts, consistently with HEAD?” Attach the local reproducer and explain that Fastify already handles post-header stream cleanup. This is a draft question only; no guidance request or publicity message was sent. Keep this separate from upload #1616.

## HTTP disconnect and MD5: result and counterfactual

Commands (pinned source checkout/dependencies from the reproduction guide):

```sh
node scripts/download-probe.mjs --http ../supabase-storage
node scripts/download-probe.mjs --http --intervention ../supabase-storage
```

Each invocation owns a detached worktree at exact upstream `dcbb8eb7` and runs three worker repetitions, each with five cases. The route uses actual Fastify, the actual RequestSignals plugin, actual AssetRenderer and actual FileBackend/native xattrs. It matches the real GET route's `request.signals.disconnect.signal` but bypasses authentication/database object lookup, CDN and proxy layers. No read-path throttling, fake data events or synthetic filesystem delay is added. Native `open`, abort, `bytesRead`, `closed` and descriptor state are observed.

| Case | Original current upstream | Diagnostic intervention |
|---|---|---|
| Normal GET | 200; all 16 MiB, payload MD5/ETag and Content-Length match | Same controls pass |
| Disconnect before headers during MD5 | Real disconnect signal at64 KiB; hash still reads16 MiB in all 3 repetitions | Hash stops at64 KiB; no returned response-body stream |
| Disconnect during full body | 200; partial client/server reads; body closes before full 16 MiB | Same partial-read controls pass |
| Disconnect during range | 206; correct 1 MiB length/content-range; stream closes before full range | Same controls pass |
| Native HEAD control | Actual AbortError, signal aborted, native hash stops at0 bytes | Same control passes |
| Resources | Every measured stream closed, `fd === null`; route settles | Same cleanup result |

[Original observations](../evidence/showcase/http-original.json) · [Intervention observations](../evidence/showcase/http-intervention.json). Timings/partial socket chunks can vary; no universal64 KiB cancellation bound is claimed. Logical bytes read are not physical disk I/O, CPU time, production cost or a hosted-service saving.

Causal explanation: the shared adapter accepts a signal; the renderer forwards it; `FileBackend.getObject` drops it before calling `etag`, even though MD5/HEAD already support cancellation. The [diagnostic patch](../experiments/download-md5-intervention.patch) only forwards that argument in an owned worktree and removes continued full hashing under the same oracle. It is an intervention for causal attribution, **not a complete production fix**: it does not define all pre-abort, pending metadata, mtime, range or error-normalization behavior.

Classification: **CONFIRMED continued pre-header MD5 work after an actual local disconnect**, with architectural evidence of a missed cancellation path. No persistent descriptor leak, data loss, HTTP protocol violation, hosted incident or maintainer-agreed defect is claimed. HTTP permits connection teardown without specifying the internal hash cancellation contract. The real route's disconnect signal and existing HEAD support motivate a focused upstream contract question and regression work. Post-header cleanup is a negative result for the blanket “downloads leak streams” hypothesis: Fastify destroys these bodies successfully.

Reliability: download wrapper now wires SIGINT/SIGTERM through the existing process-group cancellation helper. A deliberately interrupted actual worker returns exit1/FAIL with **owned cleanup PASS**; [retained failure](../evidence/showcase/interruption.json). The30-second worker deadline bounds socket waits/server shutdown too. SIGKILL cannot guarantee in-process finally; no claim to that guarantee is made.

## Independent critical review and corrections

A separate agent session inspected the prototype and independently reproduced two correctness/safety problems before changes:

1. `existsSync` treated a dangling memory symlink as empty history; append followed the symlink and created its target. Fixed with no-follow/nonblocking descriptor opening and a regular-file check, on read and append. Tests check dangling and existing symlinks without modifying their targets.
2. The reviewer accepted bare child `pass` booleans as confirmation. Fixed by validating every observation field/range, deriving pass from the selected invariant and rejecting missing, contradictory or inconsistent evidence. The correct-control outcome must also pass the same invariant.

The independent reviewer ran44/44 tests and reloaded both historical memory records unchanged. Its separate HTTP source review identified weaker HEAD-error and partial-body assertions; the parent strengthened them and reran the actual experiments. This is agent review, not another-model or human review/endorsement. Final review remains bounded; trusted local scripts and Node are outside an OS sandbox.

## Planner evaluation: corrected interpretation

The immutable corpus remains unchanged, hash `fed1527e56a70e73c80522f7688fd3e3d1c41f5ee5687dfc58c1a2e02a1eda17`. Final evaluator executes 33 actual probe cells, two repetitions plus a correct control each:99 fixture executions. Fixed/adaptive/random still report4/6 defective cases,14 selected experiments, mean detection index1.5, zero false positives and inconsistent repetitions. [Full data](../evidence/showcase/evaluation.json).

**Important correction:** two held-out copies of each of three one-probe-only mutant families, equal unit budgets and two selected probes force every ordering to the same effectiveness score. The evaluator now scores all six possible rankings on actual observations and reports **one distinct score, NONDISCRIMINATING**. Equality here is not evidence of general planner equivalence or a meaningful negative superiority trial. Previous observations remain retained; this corrects their interpretation rather than erasing them.

Keep fixed as the lowest-maintenance default. No self-improvement or adaptive benefit is established. Do not invent a second corpus to chase a win. A future versioned evaluation needs independently selected workload frequencies/costs or stateful information-gain opportunities, locked before policy tuning and separated from calibration. That is a future research gate, not a prerequisite for publishing the proven upload investigation.

## Current gates and exact next milestone

44/44 local tests pass, the real public quickstart passes, historical130-group data validates, and new evidence is checksummed. Full Linux/PostgreSQL suites remain dated prior executions. No new broad database/platform matrix or security certification is claimed. All public proposals, source-intervention patches and curated research evidence remain local until approval.

Next engineering milestone: write focused getObject regression/control cases on current upstream for the supported cancellation boundary, then assess whether a separate small fix is warranted. Preserve full/range and successful/HEAD controls and original/fixed native/HTTP behavior. Before any upstream submission, recheck overlap/intent and get explicit publication authorization. Normal-upload performance requires a stable independent measurement environment before reopening equivalence claims.

Final retained checks: [44-test log](../evidence/showcase/tests.log), [offline result](../evidence/showcase/offline-check.json), [checksums](../evidence/showcase/manifest.json). The offline artifact records its exact execution snapshot; subsequent curated copies add files without altering the130historical groups. Historical completion evidence has no diff from7318960. Source checkout remains clean at3bbc9717, and only original worktrees remain. No research service runs in the background.
