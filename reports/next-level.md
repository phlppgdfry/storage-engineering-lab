# Next milestone — execution record

Started 2026-10-29. Initial lab branch `prelaunch/reproducibility-rc`, HEAD `731896020e5e159a85bdf3c51413faa4955d9d6e`. All pre-existing RC changes preserved. Public `main` matched that HEAD; no public RC branch existed. Storage checkout clean at `3bbc971796fe9907a030c4fc70a07d440930d7b2`. Storage Doctor is outside this task and untouched.

## Outcomes and acceptance

| Outcome | Success criterion | Current evidence |
|---|---|---|
| A: publish | Own-repository reviewable PR, actual hosted fast checks observed | User authorization restored from complete local handoff; [PR #1](https://github.com/phlppgdfry/storage-engineering-lab/pull/1), hosted push and PR workflows PASS |
| B: upstream quality | Live feedback, diff, conflict and workflow review; focused next action | [Current review below](#upstream-review) |
| C: next discovery | Current source/overlap checked, executable oracle repeated and classified | [Native signal gap reproduced](../evidence/next-level/download.json); HTTP disconnect remains unconfirmed |
| D: research loop | One bounded local cycle, immutable evaluation, simple baselines and failure tests | Local experimental cycle and [frozen evaluation](../evidence/next-level/evaluation.json); no measured superiority |
| E: engineering record | Concise case study, real demonstration, explicit limits | [Case study](file-upload-cancellation.md), [demo](../evidence/prelaunch/demo-terminal.txt), [interview preparation](../docs/technical-interview-preparation.md) |

## Executed now

- `npm run check`: PASS, 111 public files, 130 retained groups, one retained failed-warmup warning.
- `npm test`: 36/36 PASS, zero skipped. `git diff --check`: PASS.
- Real terminal execution via macOS `/usr/bin/script`: `node scripts/demo.mjs ../supabase-storage`, exit 0. Native one-before/one-after, exact regression red2/green5, owned cleanup PASS. Full logs retained locally under `evidence/local/reproduce-ycIxuq/`. The public transcript removes only the recorder's initial control characters and normalizes CRLF; displayed regression lines are explicitly excerpts. No invented output or video. [Transcript](../evidence/prelaunch/demo-terminal.txt).
- Curated new records inspected: 88 KiB before demo, no large artifact. A retained failure still exposed an unnecessary long host-temp path; replaced that path with a placeholder and updated its integrity entry. Historical completion evidence untouched. Token-shaped matches are intentional redaction-test fixtures, not credentials. Existing targeted scan remains scoped, not certification.
- Expensive completed Linux/integration runs were not repeated without a source-change reason. Their actual evidence and limitations remain in [quality gates](quality-gates.md).

## Upstream review

Read-only GitHub checks on 2026-10-29: [PR #1616](https://github.com/supabase/storage/pull/1616) OPEN, DRAFT, MERGEABLE, unmerged; head `3bbc9717`, base `b11f751a`; one commit and two intended files (production +8/−1, tests +125). No issue comments, reviews or inline review comments returned. Description already explains reproduction, late-abort boundary, source AbortError normalization, historical test results and unfavorable/inconclusive performance.

PR-title workflow passed. [CI](https://github.com/supabase/storage/actions/runs/40587294139) and [Acceptance](https://github.com/supabase/storage/actions/runs/40587294201) still conclude `action_required`. Check-rollup alone omits these runs, so the workflow API was also inspected. No upstream test CI success is claimed.

Current upstream master is `dcbb8eb78fd389a51ba0e6477fde0c02f6466986` (database-trigger handling). Fetch completed; `file.ts` has no intervening diff from the PR base; adapter changes concern async shutdown. No conflict-driven rebase or patch enlargement is justified. Existing related work includes merged #1615 (HEAD/delete cancellation), #1598 (shared backend shutdown) and #1510 (database leases/orphan streams). Search results are a bounded overlap check, not exhaustive proof of absence.

Recommended upstream action: keep the current focused draft, await actual maintainer feedback/workflow approval, resolve normal-upload uncertainty only with a stable controlled environment. No upstream push, edit, ready transition or maintainer message performed.

## Publication boundary

Existing handoff explicitly authorizes this lab upgrade branch, own-repository PR and CI, including the genuine demo. It excludes unsolicited social posts, upstream changes/status transitions and releases. No history rewrite or force push. New research-agent experiments will remain local and separate until scoped review; they do not gate this useful publication.

Published commit `11da683d8d4fa3132a5c1d26efaddff2b68304ea` on the authorized branch; [own-repository PR #1](https://github.com/phlppgdfry/storage-engineering-lab/pull/1) opened, not merged. Actual GitHub [push CI](https://github.com/phlppgdfry/storage-engineering-lab/actions/runs/40810417938) and [PR CI](https://github.com/phlppgdfry/storage-engineering-lab/actions/runs/40810433134) both completed SUCCESS. Inspected job steps confirm checkout, Node setup, offline check and tests succeeded. These are fast lab checks, not upstream CI or a rerun of Linux/PostgreSQL.

The staged whitespace check initially flagged literal nested test-log EOF and patch-context spaces in the transcript; retained output unchanged and extended the existing evidence whitespace attributes. This was a presentation check, not a functional failure.

Next exact command: `git switch -c research/bounded-cycle` after publication record commit; implement isolated H002 and the small local-only prototype there. No automatic merge or upstream action.


## H002 — download cancellation (local only)

Classification: **CONFIRMED within the native adapter signal contract**, recorded as REPRODUCED in the registry. **SUSPECTED** for wasted work under an actual HTTP disconnect; **no evidence of a descriptor leak**. No fix written or submitted.

At current upstream `dcbb8eb78fd389a51ba0e6477fde0c02f6466986`, shared `adapter.ts:getObject` accepts a signal and `renderer/asset.ts:getAsset` passes the request signal, but `file.ts:getObject` does not accept/forward it. Full and range read streams are created without it. MD5 helpers already support a signal for HEAD (#1615), while `getObject` calls `etag` without one. Default configured etag algorithm is MD5 (`src/config.ts`); there is no inspected documented exemption for downloads. This is source context, not the sole confirmation oracle.

`node scripts/download-probe.mjs ../supabase-storage` executed three identical native observations in an owned detached current-upstream worktree: after signal abort, full reads consumed **4,194,304 bytes**, range reads **1,048,576 bytes**; MD5 aborted at native `open` still read **4,194,304 bytes** and resolved. All streams closed. The consumer-destroy controls closed with zero bytes read. [Actual observations/source tree](../evidence/next-level/download.json). The open-event observer does not itself make the stream flow. This avoids the earlier upload harness mistake. Native files/xattrs are real; current source reused historical pinned dependencies, so this is not a fresh install on the current lock.

Alternative explanations matter: the real renderer rejects already-aborted requests and destroys bodies when abort is noticed after `getAsset`; Fastify may destroy streaming bodies on socket close. Reading a returned body despite cancelling its signal is an explicit adapter probe, not a faithful browser disconnect. Thus neither a socket-level leak nor hosted impact is established. Current file-backend tests cover HEAD cancellation, not the demonstrated getObject path. No production corruption or security finding is inferred.

Overlap checked live: #854 remains open at unchanged `aa1adc3d3843363d88a2160bd40ced98f014869e`; #1615 covers HEAD/deletes, #1598 backend shutdown and #1510 leases/orphan streams. GitHub searches for download cancellation, abort PRs, MD5 cancellation and download-abort issues did not establish another implementation of this exact gap. Searches can miss synonyms/unpublished work. No issue or maintainer message was sent.

Next oracle: real local HTTP socket closes while MD5 is pending before headers; use response-close signal, observe bytes read at abort and after promise settlement, repeat, require explicit consumer-destroy control. Stop if already covered or the declared contract intentionally excludes pre-header work; classify INCONCLUSIVE if disconnect occurs after hash completion. Do not conflate this with post-header cleanup or expand #1616.

## Bounded research cycle — local experimental result

Implemented `scripts/research-cycle.mjs` plus a fixed catalog, actual synthetic stream mutations, deterministic skeptical checks and hash-chained JSONL memory. Commands: `node scripts/research-cycle.mjs --help`; `node scripts/research-cycle.mjs` (one fixed-policy invocation); `node scripts/evaluate-cycle.mjs`. Definitions, source HEAD plus code hashes, raw output, results, environment, checksums and cleanup are retained locally. Code hashes identify uncommitted overlays; HEAD alone is not claimed as the new implementation revision. [Pre-execution decision and limits](../research/cycle/ADR.md).

The two actual cycle invocations each ran exactly one experiment: ignored-signal abort confirmed in the synthetic mutant; cleanup on that mutant refuted. Both observations are preserved separately in [the evidence manifest](../evidence/next-level/manifest.json), and raw append-only memory remains under ignored `evidence/local/cycle-memory.jsonl`. During implementation the named source-error mutation initially threw from the destination; skeptical inspection corrected it to throw from the actual source before final evaluation. Earlier evaluation/run evidence remains local, not erased. Commands cannot be supplied by hypothesis prose, a GitHub comment or an evidence bundle. No LLM/API, autonomous publication, daemon, production connection or paid service is used.

This prototype learns only selection statistics from prior verified outcomes; it cannot design novel experiments, semantically judge upstream intent, or execute arbitrary research commands. It currently exercises synthetic mutations, separate from the manually selected native H002 investigation. Repository code is trusted local executable code; allowlists are not an OS sandbox. Time/output/payload limits are enforced by the catalog/process runner; no kernel CPU/RAM/network containment is promised. SIGKILL/power loss can leave a lock or RUNNING evidence; it refuses automatic recovery/retry. Inspect the exact owned run and reconcile manually, never delete unrelated files.

The evaluation corpus was hashed before execution and is hard-pinned by the evaluator/test. Three calibration cases, eight held-out cases (six known mutant cases, two correct), two probes per case, two repetitions plus a correct control per probe, five declared random seeds. Actual matrix contains **33 probe cells / 99 fixture executions**. Policies replay the same observations under equal budgets; this is not fifteen independent end-to-end scheduler runs. [Raw matrix and scores](../evidence/next-level/evaluation.json).

| Metric | Fixed | Adaptive (training only) | Randomized (five seeds) |
|---|---:|---:|---:|
| Known defective cases detected | 4/6 | 4/6 | 4/6 for every seed |
| Selected experiments (8 held-out cases) | 14 | 14 | 14 for every seed |
| Mean detection experiment index | 1.5 | 1.5 | 1.5 |
| False positives on correct cases | 0 | 0 | 0 |
| Non-reproducing probe results | 0 | 0 | 0 |

The final matrix execution took about 72 ms on this host; shared measured probe costs are descriptive, not independent planner latency evidence. Every cell has two observations and a passing correct control, with integrity hashes on the retained artifact. Synthetic mechanisms recur across calibration/evaluation, fixture duplicates reduce diversity and sample size is very small. No confidence interval or real-world generalization is claimed. **Adaptive superiority NOT DEMONSTRATED; fixed remains default.** Persistence and changed priorities are not evidence of self-improvement.

## Quality gates for this local extension

| Gate | Verdict | Evidence / limit |
|---|---|---|
| Repository integrity | PASS WITH LIMITATIONS | Publication branch preserved; historical completion manifest validates; Storage checkout clean, owned worktrees removed; new branch remains local |
| Source reproducibility | PASS WITH LIMITATIONS | Exact current upstream SHA/tree in download record; reused dependencies; no fresh current-lock install |
| Experiment safety | PASS WITH LIMITATIONS | Fixed command catalog, one iteration, sanitized env, owned cleanup, deadlines, output cap; trusted code, no OS sandbox |
| Test correctness | PASS | 43/43 lab tests including seven new cycle tests; exact upload demo red2/green5 |
| Evidence consistency | PASS | 130 retained measurement groups and new artifact hashes checked; raw negative results retained |
| Performance methodology | PASS WITH LIMITATIONS | Historical data revalidated, normal-upload performance **INCONCLUSIVE**; no new benchmark claim |
| Documentation | PASS WITH LIMITATIONS | Actual commands, scope and negative adaptive result; final review is self-review, not independent human validation |
| Upstream alignment | PASS WITH LIMITATIONS | Live PR/source/overlap review; upstream CI approval and feedback outstanding |
| Autonomous reliability | PASS WITH LIMITATIONS | Actual cycle runs, fixture controls, damaged/torn memory, missing evidence, duplicate exhaustion, concurrent/crashed lock and injection-input tests; inherited timeout/process-group/ENOSPC tests pass. SIGKILL recovery is manual |
| Release readiness | PASS WITH LIMITATIONS | Published lab fast CI passes; experimental extension stays local; no release/npm or upstream write |

Priorities: P0 preserve evidence/allowlist/cleanup (implemented); P1 actual HTTP MD5 disconnect oracle and response to concrete #1616 feedback; P2 research selection prototype (local, fixed default); P3 optional sanitized evidence-bundle schema only when a real bundle demonstrates value; REJECT continuously running agents, extra services, automatic outreach and further benchmark repetitions on this unstable host.

Next exact command: `node scripts/download-probe.mjs ../supabase-storage` only if changing its oracle; otherwise implement the pre-header HTTP disconnect experiment described above in an owned worktree. Keep this new scope local for review; do not push it as part of lab PR #1 automatically.

## Final skeptical review and handoff

Self-review, not independent human/model review: rechecked that source observers never force the MD5 stream into flowing mode; consumer-destroy controls prevent a false FD-leak claim; evaluation uses training-only adaptive history and fixed hashed rules; all policy scores replay actual repeated observations with controls. Equal scores and limited synthetic diversity justify keeping fixed. Publication PR includes no new research prototype or H002 patch. The complete historical completion directory has no diff from `7318960`, and Storage checkout remains clean at `3bbc9717` with only its original worktree. The published final documentation commit `4f98bb5` also has successful [push](https://github.com/phlppgdfry/storage-engineering-lab/actions/runs/40810513903) and [PR](https://github.com/phlppgdfry/storage-engineering-lab/actions/runs/40810518097) workflows.

Final local test evidence: [43/43 log](../evidence/next-level/tests.log), [offline check](../evidence/next-level/check.json), [integrity manifest](../evidence/next-level/manifest.json). Full original logs, initial evaluations, mutable append-only cycle memory and complete private handoff remain under ignored `evidence/local/`. No service or endless loop is left running; further progress requires another invocation/session.
