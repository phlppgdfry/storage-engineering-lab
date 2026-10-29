# Storage Engineering Lab

**Investigating File Upload Cancellation in Supabase Storage.** A native reproduction, a small proposed fix and inspectable evidence for one filesystem-upload cancellation contract.

Independent contributor research with AI assistance. [Upstream PR #1616](https://github.com/supabase/storage/pull/1616) was **open and draft** when checked on 2026-10-29. Maintainer acceptance and upstream CI approval remain separate gates. The reproducibility update is published for review in [lab PR #1](https://github.com/phlppgdfry/storage-engineering-lab/pull/1), with passing fast GitHub checks. [Execution record](reports/next-level.md).

## Problem → solution → evidence

`FileBackend.uploadObject` accepted an `AbortSignal` without applying it to the byte-transfer pipeline. The proposed fix checks pre-aborted signals and passes the signal into the existing pipeline.

| Experiment | Original | Proposed fix |
|---|---|---|
| Already-aborted signal | Publishes the upload | Rejects before creating an object |
| Abort during transfer | Source stays live; upload succeeds | Destroys source and rejects |
| Existing adapter destination | Continued transfer replaces bytes | Previous bytes preserved; staging cleaned |

Five regression/control tests give **2 failures before / 5 passes after**. Native probes use real files and extended attributes. The overwrite assertion tests the adapter; higher layers normally allocate a new version. Hosted-service impact is not established. Cancellation after all body bytes arrive can still finish publication.

## Reproduce

With Node **24.x**, a prepared pinned Storage checkout and native xattr support:

```sh
npm run doctor -- --checkout ../supabase-storage
npm run reproduce -- --checkout ../supabase-storage
```

[Real terminal demo](evidence/prelaunch/demo-terminal.txt) · [Complete setup and pinned installation](docs/reproduction.md) · [Troubleshooting](docs/troubleshooting.md)

For dependency-free offline inspection, run `npm run check` and `npm test`. Managed Linux/PostgreSQL commands are in the setup guide. The runner creates owned disposable resources and retains evidence locally.

## Validated results

- **36 lab tests** passed; **130 retained measurement groups** checked for consistency.
- Existing Supabase Linux suite: **3,304 passed, 2 root-permission skips**; lint/build passed.
- PostgreSQL 17 integration: **1,379 passed across 57 files**, plus **five real HTTP checks**.
- A fresh local export passed check, tests, doctor and the actual native reproduction.

These are scoped executions, not a complete platform matrix. [Exact commands, evidence and failed attempts](reports/quality-gates.md) · [Separate-agent review](reports/prelaunch-final-review.md)

**Performance remains inconclusive:** all five timed 4 MiB/concurrency-1 pairs were slower with the fix (median paired observation −16.70%), while identical-code controls varied substantially. No causal regression magnitude, equivalence or speedup is established. [Performance assessment](reports/performance-final.md)

The pinned upstream dependencies have known advisories. Use disposable synthetic local fixtures; this is not a production deployment. [Security](SECURITY.md) · [Audit](reports/audit.md)

## Inspect the work

[Case study](reports/file-upload-cancellation.md) · [Production patch](experiments/fix.patch) · [Regression tests](experiments/regression.patch) · [Architecture](docs/architecture.md) · [Engineering impact](reports/engineering-impact.md) · [Release readiness](reports/release-readiness.md)

[Roadmap](docs/roadmap.md) · [Research registry](research/hypotheses.json) · [Contributing](CONTRIBUTING.md). The project focuses on one reproducible cancellation investigation. The published investigation uses fixed priorities. A [local experimental extension](reports/next-level.md) tests bounded synthetic research cycles; adaptive selection has shown no advantage over fixed/random baselines.

Apache-2.0; derived patches preserve Supabase attribution. [LICENSE](LICENSE) · [NOTICE](NOTICE)
