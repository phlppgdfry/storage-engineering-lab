# Launch preparation

**Lab branch published for review in [PR #1](https://github.com/phlppgdfry/storage-engineering-lab/pull/1); fast GitHub checks passed.** The social/channel texts below remain unpublished drafts. No release, npm publication, upstream PR edit or maintainer contact was performed. [Current execution record](../reports/next-level.md).

Before any future publication, reconcile every claim with [quality gates](../reports/quality-gates.md), resolve required blockers and obtain explicit approval for the concrete destination/content. Recheck PR status immediately before posting. The [prelaunch baseline](../reports/prelaunch-baseline.md) records #1616 as open, draft, not merged, with no returned reviews/comments and CI requiring approval. That is a dated observation, not a continuing status guarantee.

## Release-note draft

Prepared a local reproducibility candidate for Storage Engineering Lab: focused command discovery, source/dependency provenance, disposable-resource ownership, fixture isolation and evidence checks. The final implemented scope and passing checks must be taken from the quality-gate report before this text is used externally.

The underlying contribution remains the same two-file Supabase filesystem-backend cancellation patch at `3bbc9717`. Historical native, regression, Linux and PostgreSQL results remain linked separately. Successful-upload performance equivalence is still unproven. No hosted-service incident, merge or maintainer endorsement is claimed.

## Launch announcement draft

I investigated a small cancellation-contract gap in Supabase Storage's filesystem backend: an accepted signal was not passed into the upload pipeline. The lab includes a native before/after reproduction, five regression/control tests and a small proposed fix. It documents the boundary between receiving bytes and completing publication, plus the limits of the evidence.

The upstream contribution remains a draft, and performance-equivalence claims remain open. AI assistance was used; a separate agent performed additional source analysis and experiments. That is distinct from human maintainer review. Source and evidence: https://github.com/phlppgdfry/storage-engineering-lab.

## Technical article outline

Working title: **Following an upload cancellation signal to the filesystem**.

1. Trace request-body signal → uploader → shared adapter contract → filesystem pipeline.
2. Establish the oracle: pre-abort creates nothing; transfer abort destroys the source, removes staging and preserves the prior adapter destination.
3. Show the first harness mistake: a `data` listener started flowing too early. Explain the corrected `resume` gate and the separate review's actual-written-byte check.
4. Explain the small patch and late-abort boundary; include source-generated `AbortError` normalization.
5. Separate native xattrs, mocked regression tests and HTTP regression assurance. The HTTP check does not prove the parent endpoint was broken.
6. Report performance uncertainty, including unfavorable measurements and unstable identical-code controls.
7. Explain local reproducibility/provenance work and leave CI approval, human review and production impact as separate questions.

Use [the case study](../reports/file-upload-cancellation.md), [separate review](../reports/independent-review.md) and [performance report](../reports/performance.md) as the evidence spine. Do not turn source bytes avoided into physical I/O, cost or hosted-speed savings.

## Channel drafts

**Hacker News title:** A native reproducer for upload cancellation in Supabase's file backend

**HN text:** I put together a focused investigation of an upload method that accepted an abort signal without applying it to its byte-transfer pipeline. The repository includes a native reproduction, a small proposed fix, red/green tests and the limits of subsequent Linux/integration/performance checks. The PR is a draft; hosted-service impact and successful-upload performance equivalence are not established. AI assistance is disclosed in the write-up. https://github.com/phlppgdfry/storage-engineering-lab

**Reddit draft:** I traced a cancellation signal through Supabase Storage to its filesystem upload pipeline and made a native before/after reproducer. The interesting part was defining when cancellation should stop transfer versus allowing already-received bytes to finish publication. The write-up includes a harness mistake, regression/control tests and an inconclusive performance investigation. This is contributor research, with AI assistance, and a draft PR rather than a merged change. https://github.com/phlppgdfry/storage-engineering-lab

Choose a relevant community and inspect its posting rules before proposing publication; no subreddit or account action has been selected or performed.

**LinkedIn draft:** A small backend change made a useful engineering case study: trace a cancellation contract, reproduce it with real files, add tests that fail before the fix, and report what remains uncertain. Storage Engineering Lab documents the investigation and proposed Supabase filesystem-backend fix. The draft PR is separate from human maintainer acceptance; performance equivalence remains unproven. AI assistance and the separate-agent review are disclosed. https://github.com/phlppgdfry/storage-engineering-lab

## Honest terminal demo script

Use the [reproduction guide](reproduction.md) to prepare a disposable pinned checkout and dependencies. Node 24 and native xattr support are required. Replace the placeholder path below; these commands are a demo sequence, not a claim they have already passed in this RC.

```sh
npm run check
npm test
npm run doctor -- --checkout /absolute/path/to/supabase-storage
npm run reproduce -- --checkout /absolute/path/to/supabase-storage
```

Narrate: “The first checks validate this lab. Doctor checks prerequisites and source/dependency identity. Reproduce checks the known baseline behavior, then confirms the regression-only failures before applying the fix and confirming the expected successes.” Show the actual evidence path and summary emitted by that run. Explain that the expected red run is part of the oracle, not a hidden failure.

Do not fabricate terminal output, hide a refusal/failure or present historical integration totals as this demo's work. A short demo does not run optional Docker or benchmark modes. Close by showing the current quality gates and unresolved performance/human-review boundaries.
