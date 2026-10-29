# Investigating File Upload Cancellation in Supabase Storage

## Finding and scope

`FileBackend.uploadObject` receives an optional signal but ignores it. An already-aborted call publishes a file and returns success. Aborting an active transfer leaves the source live; it can continue and publish bytes.

Confirmed on `4134dbba1b94757f400d5d7c09f9382935efd726` through the actual adapter. This concerns the filesystem backend. Hosted-service behavior and endpoint-level impact are not established.

## Why investigate

The shared adapter accepts a signal. `Uploader.upload` passes one through; REST upload routes use the request-body signal. The S3 backend explicitly rejects already-aborted calls and cancels upload I/O. The file backend did neither.

Recent upstream commits improved file publication, cleanup and HEAD cancellation. That made this a bounded, inexpensive experiment. Its relevance is an inference, not a stated maintainer priority or guarantee of acceptance.

## Method

1. Record a clean upstream commit and inspect the upload call chain.
2. Search issues and open/closed PRs for file upload, abort, cancellation and AbortSignal.
3. Inspect #854, including its file adapter at `aa1adc3d3843363d88a2160bd40ced98f014869e`. That upload pipeline also lacks signal options.
4. Add five cases to the existing temporary-file suite, retaining its xattr mock.
5. Run a separate experiment with actual files, native xattrs and no dependency mocks.
6. In a disposable worktree, repeat native before/after observations three times and verify a regression-only patch fails before the production patch makes it pass.

The initial functional oracle did not require randomized testing or a benchmark. Later performance measurements are reported separately below. No public service was tested.

## Correction during self-review

The initial harness used a `data` listener to detect startup. Attaching it put the source into flowing mode before asynchronous file setup attached the pipeline. The empty baseline output was a harness defect, not another Storage finding.

Both reproductions now wait for `resume`, which does not itself start the source. Baseline output is the full synthetic payload `partialremaining`. The native check also records whether abort immediately destroys the source. This is critical self-review, not an independent reviewer or separate model.

## Results

[Original reproduction record](../evidence/reproduction-summary.json) records runtime, timestamp and all six native observations. The [genuine terminal transcript](../evidence/prelaunch/demo-terminal.txt) reran the native and regression sequence. [Reproduction instructions](../docs/reproduction.md) pin source and dependency setup.

| Check | Before | After |
|---|---|---|
| Pre-aborted call | Resolved; file published | Rejected `Aborted`; file absent |
| Active cancellation | Resolved; source live | Rejected `AbortedTerminate`; source destroyed |
| Destination bytes | `partialremaining` | `old` |
| Staged files remaining | None | None |
| Five focused cases | 2 fail, 3 pass | 5 pass |

Tests cover pre-aborted calls, active cancellation with cleanup/preservation, successful transfers/listener cleanup, late cancellation after body completion and ordinary source errors with a live signal.

## Root cause and fix

The signal was accepted but never passed into `pipeline(body, destination)` in [the pinned backend](https://github.com/supabase/storage/blob/4134dbba1b94757f400d5d7c09f9382935efd726/src/storage/backend/file.ts). The fix rejects already-aborted calls before staging, passes `{ signal }` to the pipeline and maps AbortError to `AbortedTerminate` after existing temporary-file cleanup. Error conventions match the S3 upload backend.

The production diff contains eight insertions and one deletion. No dependency, public parameter type, database schema or S3 behavior changes.

## Alternatives and maintainer-facing boundary

| Approach | Decision and evidence |
|---|---|
| Rely on request/source errors alone | Insufficient for the adapter contract: the native signal-only probe resolves before the fix. The separate HTTP disconnect check may already succeed through source-error handling. |
| Manually wire abort listeners to both streams | Adds listener/error-order cleanup responsibilities already handled by the existing pipeline. Reuse the pipeline signal option; the success/error controls check listener cleanup. |
| Check cancellation before metadata/rename too | Rejected: the uploader permits publication after receiving all bytes. The late-abort control preserves that boundary. |
| Refactor backend adapters or optimize performance here | Rejected: neither is needed to reproduce or fix the two cancellation failures; performance attribution remains unresolved. |

The maintenance unit stays two upstream files and no new dependency. The lab owns orchestration and larger evidence, so maintainers can review the production contract and five tests without adopting a research framework. Upstream workflow approval and human review remain separate requirements; no speculative download change belongs in this patch.

## Compatibility and risks

Cancellation applies while the body transfers. After the pipeline completes, metadata and rename intentionally finish even if cancellation arrives. This preserves the uploader's existing completion policy; the late-cancellation test guards that boundary.

Successful calls without a signal retain their behavior. A live signal adds pipeline cancellation handling; listener cleanup and ordinary source-error messages are tested. An independently tested compatibility nuance: a source that itself throws an AbortError, even without a signal, is now classified as AbortedTerminate instead of InternalError. The original error is retained; this matches existing S3 normalization.

The overwrite test deliberately uses the same backend key/version. Higher layers normally create a new version. It does not prove HTTP data loss.

## Validation and limits

The unmodified unit suite passed: 176 files, 3,295 tests. The patched suite passed: 176 files, 3,300 tests. After rebasing onto newer upstream `b11f751a`, final commit `3bbc9717` passed all 3,306 tests in 176 files, plus lint, build and diff checks. The six additional tests came from the intervening upstream merge.

The first sandboxed full run failed with `listen EPERM` while tests opened local servers. Repeating with the required permissions passed. The sandbox failures are retained locally as environment evidence, not attributed to Storage.

At initial publication, lint, build, focused backend/upload tests and native reproductions were executed, but no database integration or containers were run. This was later supplemented by the [five completion activities](completion-2026-10-28.md): a separate agent review, Linux validation and 1,379 passing PostgreSQL integration tests plus real HTTP checks, using an isolated network with no published ports. Hosted traffic remains untested. [Performance attribution remains inconclusive](performance.md); no general speed or no-regression claim is made.

Searches may miss unpublished work or alternate terms. No severity, production incident, performance gain or maintainer acceptance is claimed.

## Current contribution status

As checked 2026-10-29, [upstream #1616](https://github.com/supabase/storage/pull/1616) remains open/draft/unmerged with no returned reviews/comments, and CI/Acceptance require approval. The lab's own fast CI is separate. [Live-review record and exact next actions](next-level.md).


Two upstream files: `file.ts` and its existing `file.test.ts`. The harness and evidence remain in this lab. Invite review of the cancellation boundary; do not bundle other suspected lifecycle gaps into the fix.

## Uitleg in het Nederlands

De uploadfunctie kreeg al een stopsignaal, maar gebruikte het niet bij het kopiëren van de bytes. Daardoor kon een geannuleerde upload doorgaan. We koppelen het signaal aan de bestaande stream-pipeline. Bij annulering stoppen de streams en wordt het tijdelijke bestand opgeruimd. Zodra alle bytes ontvangen zijn, mag de afronding doorgaan. Dat voorkomt dat een succesvol ontvangen upload alsnog onnodig wordt afgebroken.
