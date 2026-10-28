# Linux and database integration validation

Contribution: `3bbc971796fe9907a030c4fc70a07d440930d7b2`, based on `b11f751a`. These checks supplement the original macOS runs; they are not results from Supabase's GitHub Actions.

## Environment and isolation

- Linux arm64, Debian 12, LinuxKit kernel 7.0.14; Node 24.21.0, npm 11.12.1.
- Linux dependencies installed independently from the pinned lockfile; no Darwin `node_modules` copied into the container.
- Four CPU / 3 GiB runner limit. Temporary Docker project `storage-lab-validation` uses a private network with no published ports.
- PostgreSQL 17, PgBouncer, RustFS, imgproxy and Iceberg use upstream service definitions, with isolated names, paths and memory limits.
- Existing host PostgreSQL on port 5432 and unrelated containers were left alone. Only this disposable project's containers, network and generated volumes were removed afterward.

See `validation/README.md` for actual commands, `validation/compose.yml` for the isolated configuration and the curated evidence for image identities and exact results.

## Linux native reproduction

The original upload implementation is restored by reversing the exact production patch in a disposable container. The native experiment uses real files and Linux xattrs, three repetitions per implementation. The original code incorrectly publishes a pre-aborted upload and continues the active transfer. The fixed code rejects, destroys the source, keeps the previous file and leaves no temporary file.

With the five submitted regression/control cases present, the original implementation has exactly two failures and three passes. Applying the production patch makes all five pass.

## Unit, lint and build

The full Linux unit suite passed: **176 files, 3,304 passed and 2 skipped** out of 3,306. The skipped tests are existing filesystem-permission tests guarded by `process.getuid() !== 0`, not failed or silently ignored cancellation cases.

An additional container runs the complete file-backend test file as the non-root `node` user: **157/157 passed**, including those permission cases. This is an additional targeted run, not a claim that the entire suite was rerun without root.

Linux `npm run lint` and `npm run build` both returned zero. Original macOS validation of all 3,306 unit tests remains separately recorded.

## Standard PostgreSQL integration suite

The test stack received real migrations and the tracked synthetic test seed, each with exit zero. Then upstream's unmodified `npm run test:integration` passed: **57 files, 1,379 tests**, exit zero, approximately 272 seconds.

The upstream suite deliberately mixes real service interactions with mocks in some cases. Do not describe every one of those tests as an entirely unmocked end-to-end operation.

## Additional real HTTP check

A separate check starts the actual application against the isolated PostgreSQL database and native file backend, without adapter/database mocks. It verifies:

1. Bucket creation through the actual route and database.
2. Upload/download integrity for a binary payload, native metadata and MD5 ETag.
3. Range status, bytes and Content-Range.
4. Conditional retrieval returning 304.
5. A client disconnect after at least 64 KiB has reached a real staging file: the stage is removed and the existing object is still readable with the original bytes.

All five checks passed. This is regression assurance for the full route. It does not establish that the parent HTTP path was broken: existing source-error handling may already protect that specific disconnect scenario.

## Limits

This covers Linux arm64 and the standard PostgreSQL 17 configuration. It does not replace the upstream PostgreSQL 13–18, OrioleDB, Multigres or acceptance-runtime matrix, and it is not evidence of hosted-service behavior. Independent review and performance results are separate reports. No production or public load testing occurred.
