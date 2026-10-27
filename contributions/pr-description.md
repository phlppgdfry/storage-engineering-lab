`FileBackend.uploadObject` accepts an `AbortSignal` but never uses it. An already-aborted call still writes and returns success, and aborting an active transfer does not stop its source. Pass the signal to the existing staging pipeline, reject pre-aborted calls and use the same abort error conventions as the S3 upload backend.

Cancellation after the body finishes still allows metadata/rename to complete, preserving the uploader's completion policy. The change is limited to the file backend and its existing tests.

## Validation

- Five focused cases cover cancellation before/during transfer, successful transfers, source failure, cleanup and cancellation after body completion. Two fail on the original code.
- A [native reproducer](https://github.com/phlppgdfry/storage-engineering-lab/blob/6c8d6360b2127a2dc7b8a7bcb7bbcf24e7879be8/experiments/file-upload-cancellation.ts) uses real filesystem metadata and no mocks; [original and fixed outcomes](https://github.com/phlppgdfry/storage-engineering-lab/blob/6c8d6360b2127a2dc7b8a7bcb7bbcf24e7879be8/evidence/reproduction-summary.json) were confirmed three times each.
- Full unit suite: **3,306 tests passed across 176 files** on `3bbc9717`, based on upstream `b11f751a`.
- `npm run lint`, `npm run build` and `git diff --check upstream/master...HEAD`: passed.
- PostgreSQL integration tests were not run; no database or HTTP protocol changes are included.

Related work checked: #1615 adds file HEAD/deletion cancellation; the file upload pipeline at the fetched head of #854 does not apply a signal. No specific existing issue is claimed as fixed.

This demonstrates an adapter contract defect; it does not establish hosted-service data loss or a security vulnerability. Prepared with AI assistance; the reported tests and native experiments were executed locally.
