# Decision log

## D001 — Start small

Use one fork and one local lab. Reuse upstream Vitest rather than building an independent benchmark framework. No performance claims without a measured bottleneck.

## D002 — Avoid occupied work

Do not reproduce earlier advice as new contributions: Accept-Ranges (#1490), custom list metadata (#952), case-insensitive S3 metadata (#1462), conditional HEAD (#1608), TUS stale leases (#1546), overlapping renewals (#1545), and orphan scratch tables (#1538) already have open PRs in the retrieved snapshot.

## D003 — Inspect lifecycle contracts

Compare cancellation behavior between backend implementations, alongside the recent file HEAD cancellation fix (#1615). A broad open adapter refactor (#854) overlaps in area and must be inspected before claiming an unaddressed fix. Its fetched diff contains upload `pipeline(body, destFile)` without cancellation options; it is not evidence that upload cancellation is implemented there.

## D004 — Match upstream tool versions

The global npm 12 rejects Git dependencies by default. Use upstream's npm 11.12.1 locally through npx rather than rewriting package-lock.json or changing the user's global installation.

## D005 — Test the test

A `data` listener in the initial harness put the input in flowing mode before asynchronous file setup attached the pipeline. Replace it with a `resume` observer and verify actual baseline payload bytes. Do not turn a harness defect into a second product finding. The revised native experiment confirms immediate source destruction on abort after the fix, across three before/after repetitions.

## D006 — Preserve completed-body publication

Apply cancellation only to the transfer pipeline. Do not add signal checks during metadata or rename: upstream deliberately completes publication after receiving the body. A focused late-abort control test guards this boundary.

## D007 — Recheck moving upstream

During investigation upstream advanced to `b11f751a`, merging case-insensitive metadata PR #1462. This changes only S3 handler code/tests. Rebase the small contribution onto it and run final validation again. Earlier snapshots describe what was open when retrieved, not permanent status.

## D008 — Avoid unnecessary infrastructure

Keep detailed full-suite and raw search logs under ignored `evidence/local/`; publish focused evidence and a compact upstream-overlap record. No Docker containers, migrations, performance CI, custom benchmark platform or profile-marketing edits are needed for this first contribution.

## Local prelaunch candidate, 2026-10-28

The registry now uses a schema and explicit evidence/source/next-action fields while preserving legacy statuses/evidence. H001 is UPSTREAM SUBMITTED, not accepted or merged. Other items remain hypotheses, with overlap/defer dispositions separate from technical resolution. Offline validation checks references and prevents statuses from silently replacing evidence.

The fixed baseline for next-experiment choice is priority ascending then ID, excluding submitted/terminal/held/deferred work. It currently recommends H002 only to define and test a native read-cancellation oracle; no second defect is claimed. New evidence or changed upstream state can update priorities with a recorded reason. No adaptive system was implemented: no measured benefit over this simple baseline exists, and allowing an agent to rewrite evaluation criteria would undermine credibility.

The quality upgrade stays separate from the upstream production patch. Targeted regression/failure-injection tests address demonstrated orchestration risks. A broad property/stateful/differential/mutation framework was rejected for this narrow finding without a documented coverage gap; red/green verification against the actual original implementation remains the functional oracle. No UI or autonomous publication was justified. See current audit/quality/readiness reports for actual executions and limitations.

## D009 — Publish proven work before local autonomy

Published the already-authorized RC and genuine demo on an own-repository review PR; observed hosted checks rather than inferring success. Kept new H002 experiments and research-cycle work on a separate local branch. No upstream enlargement or outreach without technical reason and authorization. [Milestone evidence](../reports/next-level.md).

## D010 — Reject unsupported adaptive benefit

Implemented a bounded fixed-catalog prototype using Node primitives, JSONL and existing process/ownership helpers, with no new dependency. Froze the evaluation before running it. Fixed, adaptive and random all detect 4/6 known synthetic cases under the declared budget; keep fixed default and preserve the negative result. This is no evidence of real-world self-improvement. [Decision, alternatives and risks](cycle/ADR.md).

## D011 — Distinguish continued hashing from stream leaks

Actual local HTTP experiments on current upstream establish continued pre-header MD5 work, while Fastify closes partial full/range response streams correctly. Preserve both findings. Use a minimal signal-forwarding intervention only to test causality; do not claim a complete production fix or HTTP-standard violation. [Evidence and boundary](../reports/showcase-review.md).

## D012 — Treat a nondiscriminating evaluation as inconclusive

Independent review found the frozen balanced corpus forces every two-probe ranking to the same effectiveness score. Preserve corpus/results, report this limitation programmatically across all6rankings, and reject general equivalence/self-improvement claims. A separately justified, versioned corpus is a future prerequisite for testing planner benefit. Do not tune workload frequencies to obtain a win.

## D013 — Separate current GET correction from the historical upload study

Upstream advanced to Node26/npm12 and new lifecycle/undici code. Keep old source, lock,130groups and upload branch unchanged. Prepare a new GET-only branch on211b2beb using fresh locked dependencies. Reject a manual abort-listener framework and abandoned promise races; use boundary checks and existing native stream/MD5 signal support. Exact current-base red10/green19 controls,171file tests,3410unit tests and real HTTP variants support local review. In-flight stat/xattrs remain cooperative, not instantly cancellable. Linux/DB/provider/human/hosted gates remain explicit. [Current audit](../reports/advanced-engineering.md).

## D014 — Open and read the same artifact descriptor

A deterministic test reproduced final-path replacement after artifact validation. Reuse the existing no-follow/nonblocking regular-file opener and hash its descriptor, rather than reading the path again. No memory schema change, dependency or privileged filesystem helper. The same-UID adversarial parent-directory problem remains outside private-root trust assumptions; do not claim complete TOCTOU immunity or a remote Supabase exploit. [Red/green evidence](../evidence/advanced/artifact-race-green.log).

## D015 — Freeze moving upstream and separate fixture reliability from GET correctness

After validating211/e1, upstream advanced to9d15cdc9 with native env loading and dependency changes. Preserve the first green series and validate the same GET correction on a new local branch8eceb9, not by rewriting history. A lifecycle-disabled failure appeared in both broad untouched baseline and candidate, while isolated baseline and bounded candidate repeat passed. Retain all outcomes; the first class/handler hypothesis was not supported. A one-file real-config fixture mitigation9a76025 keeps every assertion and production file unchanged, passes3422baseline cases, and an explicit reversible GET+fixture overlay passes3441pluslint/build. Exact Vitest/cache/order mechanics remain unproven. Keep the fixture patch separate; no extra PR or outreach without approval.
## D016 — Close development with a separately approved portfolio release candidate (2026-10-31)

Problem/context: existing research was locally validated but publication units and final release gates needed an explicit boundary. Alternatives: keep polishing, automatically enlarge PR#1, or prepare a separate full portfolio candidate. Decision: preserve all existing branches; prepare `release/portfolio-rc`/version1.0.0 locally, retaining the eleven-file presentation-only unit as a separate option. Evidence: current Linux GET/fixture/HTTP, upload Linux, clean-clone demo, manifests, dependency audit and redacted secret scans in `evidence/closure`. Tradeoff: full candidate publication needs broader review than PR#1's smaller update. Consequence: no further features required; hosted checks and separately authorized merge/tag/release remain genuine blockers. Upstream acceptance is independent. No benchmark or planner claim is upgraded.

## D017 — Label path-only redactions without rewriting historical results (2026-10-31)

Problem: final candidate inspection found absolute personal checkout prefixes in five already-public historical logs. Alternatives: leave them in the release, rewrite published history, or redact only the release presentations while preserving original bytes. Decision: retain byte-identical originals in existing Git objects and ignored local preservation; label the five path-only transformations and record both hashes/blob identities. Evidence: evidence/closure/historical-path-redactions.json and candidate scan. No assertions, outcome lines or measurement datasets changed. Risk: prior public history still contains the old paths; redaction is not retroactive erasure or universal secret certification. Consequence: cleaner release presentation without a force push or loss of historical provenance.
