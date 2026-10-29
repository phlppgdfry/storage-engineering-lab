# Engineering impact

Storage Engineering Lab is a factual portfolio artifact about one backend lifecycle contract: identify a signal ignored by a filesystem upload pipeline, establish a native oracle, propose a small fix and retain evidence that supports or limits the conclusions. AI assistance was used throughout. This is independent contributor research, not Supabase endorsement.

## Delivered contribution and historical evidence

The production contribution is still `3bbc971796fe9907a030c4fc70a07d440930d7b2`: two upstream files, five added regression/control tests, eight production insertions and one deletion. The fix rejects pre-aborted uploads before staging, cancels active byte transfer and uses existing abort-error conventions. It preserves completion after the body has been received. See [patch](../experiments/fix.patch) and [case study](file-upload-cancellation.md).

| Demonstrated work | Evidence and limit |
|---|---|
| Contract tracing and bounded diagnosis | Request signal → uploader → adapter → staged transfer. The finding is adapter-level; hosted-service impact is not established. |
| Reproducible regression evidence | Native before/after observations repeated three times per variant; two cancellation tests fail before the fix, then all five controls pass. Unit xattrs are mocked; native probes use actual xattrs. |
| Historical cross-platform checks | macOS: 3,306 unit passes. Linux arm64: 3,304 passes/two root-permission skips; all 157 file tests pass in a separate non-root run. These are earlier executions, not new RC runs. |
| Historical integration assurance | PostgreSQL 17: 1,379 standard tests across 57 files, plus five real HTTP/native-file checks. Some standard tests use mocks; the full upstream database/runtime matrix was not run. |
| Review and correction | Separate-agent source analysis and independently written native experiments; documented harness correction and error-normalization nuance. No human or different-model review is implied. |
| Measurement judgment | 130 retained benchmark groups, including unfavorable results and unstable identical-code controls. Source-byte reduction is bounded to a synthetic cancelled workload; successful-upload equivalence remains unproven. |

The [completion report](completion-2026-10-28.md), [Linux/integration report](linux-and-integration.md), [review](independent-review.md) and [performance report](performance.md) retain exact scope and qualifications. The separate review's broad run had two ECS timing failures, followed by an isolated 8/8 rerun; this is not rewritten as an all-green broad run.

## Current local release candidate

The new candidate addresses audit findings in developer safety, provenance, checks and documentation while leaving production commit `3bbc9717` unchanged. It implements owned disposable resources, fixture-only environments, pinned source/dependency identity, useful diagnostics and mechanically checked evidence references. Fresh validation includes 36 lab tests, the native red/green reproduction, 3,304 Linux unit passes/two skips, lint/build and1,379PostgreSQL integration passes plus five HTTP checks. A fresh local export also exercised check/tests/doctor/native. [Current quality gates](quality-gates.md) retain exact records, corrected failures and remaining boundaries. Historical totals above must not be used to fill a missing RC result.

The [dated prelaunch baseline](prelaunch-baseline.md) records PR #1616 as open, draft and not merged, with no reviews/comments returned and upstream CI still `action_required`. Local tests do not replace upstream workflow approval or human acceptance. No public release or npm package has been created for this candidate; launch material is [prepared locally](../docs/launch-plan.md).

## Claims this artifact does not establish

It demonstrates the investigated work and the recorded experiments. It does not establish production impact, general speed/cost savings, zero overhead, global novelty, maintainer endorsement, hiring recognition or a particular engineering level. It also does not independently prove unaided expertise, people leadership, production on-call ownership or large-system operation.

For technical discussion, use [interview preparation](../docs/technical-interview-preparation.md). For the next justified work, use the [roadmap](../docs/roadmap.md) and [tooling reuse decision](../docs/tooling-comparison.md).
