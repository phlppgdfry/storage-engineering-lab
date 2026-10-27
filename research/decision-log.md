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
