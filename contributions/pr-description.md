`FileBackend.uploadObject` accepts an `AbortSignal` but never uses it. An already-aborted call still writes and returns success, and aborting an active transfer does not stop its source. Pass the signal to the existing staging pipeline, reject pre-aborted calls and use the existing S3 upload abort error conventions.

Cancellation after the body finishes still allows metadata/rename to complete. As in the S3 adapter, a source-thrown `AbortError` is normalized to `AbortedTerminate`, even without a supplied signal; the original error is retained. Only the file backend and its existing test file change.

## Validation

- Five focused cases; the two cancellation cases fail on the original implementation. Native before/after experiments use real xattrs and no adapter mocks.
- macOS unit suite: **3,306 passed**. Linux arm64: **3,304 passed / 2 root-permission skips**; all **157 file tests pass as non-root**, including those permission cases. Lint/build pass.
- PostgreSQL 17 standard integration suite: **1,379 passed across 57 files**. Five extra real HTTP + PostgreSQL + native-file checks pass, including disconnect after a partial staging write.
- A [separate agent review](https://github.com/phlppgdfry/storage-engineering-lab/blob/main/reports/independent-review.md) found no blocking correctness issue and ran independent native experiments. Its broad run had two unchanged ECS timing failures; the isolated ECS suite then passed 8/8. This is not a claim of human or different-model review.
- [Commands, environment and evidence](https://github.com/phlppgdfry/storage-engineering-lab/blob/main/reports/completion-2026-10-28.md) are recorded against `3bbc9717`.

## Performance limitation — remains draft

The cancellation workload consistently produces 128 KiB of source bytes per operation instead of 4 MiB. This is not a physical-I/O or production-speed claim.

**Successful-upload performance equivalence is not established.** One timed workload showed a median paired slowdown of 16.70%; follow-up identical-code controls also varied substantially, so neither a regression nor its absence can be reliably attributed to the patch. All observations, including unfavorable ones, are retained in the [performance report and independent method review](https://github.com/phlppgdfry/storage-engineering-lab/blob/main/reports/performance.md). No speculative optimization was added to hide the uncertainty.

Related work checked: #1615 covers file HEAD/deletion cancellation; the upload pipeline at the inspected head of #854 does not apply a signal. No specific existing issue is claimed as fixed.

This establishes an adapter contract defect, not hosted-service data loss or a security vulnerability. AI assistance was used; reported experiments and tests were executed locally. Upstream CI approval and maintainer review remain separate.
