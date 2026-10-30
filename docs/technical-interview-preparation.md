# Technical interview preparation

Use the code and evidence to explain decisions. This is a case study, not proof of a job level, hiring outcome or independent unaided authorship. AI assistance was used. [Engineering impact](../reports/engineering-impact.md) summarizes the demonstrated work and its limits.

**What was actually wrong?** `FileBackend.uploadObject` accepted an optional signal but omitted it from the body-to-staging pipeline. At the pinned baseline, pre-aborted calls published a file and active cancellation left the source live. Native observations and exactly two failing regression cases established this adapter-contract defect.

**Why is the fix small?** The adapter already staged bytes and cleaned up errors before publishing by rename. The patch adds a pre-abort check, supplies `{ signal }` to the existing pipeline and maps `AbortError` to an existing error convention. It does not redesign storage publication, add a database schema or change the S3 backend. See [fix](../experiments/fix.patch).

**Where does cancellation stop applying?** At completion of the body-transfer pipeline. Metadata and rename then finish, consistent with the uploader's policy for already-received bytes. The late-cancellation test guards that boundary. This is not a promise about every endpoint/disconnect timing or multipart completion, which supplies no signal on that path.

**Why use both native experiments and unit tests?** Existing unit fixtures mock xattrs, so the separate native probe exercises actual xattrs and files. Regression/control cases make the behavior maintainable. The native probe, tests and broader HTTP checks answer related but different questions; no single layer proves hosted-service behavior.

**What mistake changed the investigation?** An early harness used a `data` listener that put the stream into flowing mode before asynchronous setup attached the pipeline. That produced misleading output. The corrected probe waits for `resume`; a separate review also waits until 64 KiB is actually present in staging. `resume` alone does not prove bytes reached the file. See [case-study correction](../reports/file-upload-cancellation.md) and [review](../reports/independent-review.md).

**Does the overwrite case prove user data corruption?** No. It intentionally uses the same adapter key/version; higher layers normally generate a new version. The real HTTP disconnect check is regression assurance and may already have been protected by existing source-error handling on the parent. Neither establishes a hosted-service incident.

**What compatibility nuance did review find?** A source that independently throws an error named `AbortError` is normalized to `AbortedTerminate` even without a supplied signal; previously it became `InternalError`. The original error is preserved. Successful no-signal transfers retain their behavior, but claiming all no-signal behavior is unchanged would be too broad.

**What does the performance work prove?** The synthetic cancelled workload generated 128 KiB of source bytes per operation after the fix versus 4 MiB before. It does not measure physical disk/network savings. Successful-upload equivalence remains unproven: one workload slowed consistently, then identical-code controls showed large variability. Neither regression attribution nor zero overhead is established. See [retained results](../reports/performance.md).

**How independent was the review?** A separate agent session inspected source and wrote its own experiments before reading the main case study. That adds a separate reasoning path and test oracle. It is not evidence of another model or human maintainer review. Its broad suite had two ECS timing failures; an isolated ECS rerun passed. Keep both results visible.

**What remains unproven?** Human acceptance/merge, hosted production impact, normal-upload performance equivalence, the full database/runtime/architecture matrix and operating this change under production load. This artifact alone does not establish people leadership, production incident command, large-system design ownership or a particular seniority level. Current RC checks must be read from [quality gates](../reports/quality-gates.md), separately from earlier results.

**What would you do next?** Close concrete safety/provenance and first-user workflow gates, retain inconclusive performance evidence, and respond to actual maintainer feedback if it arrives. Reuse existing tools for broader S3/load/fault/property testing rather than expanding this patch into a platform. See [roadmap](roadmap.md) and [comparison](tooling-comparison.md).

## Focused learning plan from the remaining gaps

1. Completed locally: trace and test actual pre-header HTTP disconnect through request signals, renderer and file MD5, including cleanup controls. Next: independently review the current GET candidate and validate its Linux/hosted matrix; the minimal route does not establish full auth/database/CDN or production behavior.
2. Explain PostgreSQL transaction/version publication and trigger-aborted writes at current upstream #1600; construct one isolated failure/rollback trace before proposing database changes. Existing integration passes do not prove database design expertise.
3. Design a normal-upload equivalence study on a stable host: predeclare a practical margin (for example 5% only if justified), randomize paired order, demonstrate stable identical-code controls first, preserve raw observations and report INCONCLUSIVE if precision is inadequate.
4. Practice S3 multipart/TUS lease and distributed-failure reasoning using existing upstream regressions. This project has not demonstrated operating those protocols at production scale.
5. Obtain actual human review and respond to specific comments. Agent checks are useful evidence but do not demonstrate maintainer endorsement or professional incident leadership.

## Portfolio text (prepared locally, not posted)

**GitHub description:** Reproducible Supabase Storage cancellation research: native before/after probes, focused regression tests, a draft upstream fix and inspectable evidence.

**Case-study summary:** Traced an accepted upload abort signal through a filesystem backend, reproduced two contract failures, proposed an eight-insertion/one-deletion production change and added five regression/control cases. Verified native cleanup and broader Linux/PostgreSQL behavior while preserving unfavorable and inconclusive performance results. The contribution remains a draft, not an accepted upstream change. A follow-up local HTTP experiment isolates continuing MD5 work after disconnect; it is separate from the upload patch.

**Factual contribution:** One draft PR, [supabase/storage#1616](https://github.com/supabase/storage/pull/1616), one production commit at `3bbc9717`, two changed files, five tests. No merged contribution or maintainer endorsement is claimed. The research repository and its own PR are separate from Supabase's repository. AI assistance and agent review are disclosed.

## 60-second demonstration

Prepare dependencies using [the reproduction guide](reproduction.md). Run `node scripts/demo.mjs ../supabase-storage`; the script's duration depends on the host, so the narration is a target, not a recording-duration claim. Use the existing genuine transcript if setup is unavailable; do not pretend it is a live run.

| Time | Show / explain |
|---|---|
| 0–10 s | README contract: an accepted signal should stop the body-transfer pipeline. Publication after the last byte is a separate boundary. |
| 10–25 s | Actual native BEFORE output and two expected regression failures. Cancellation still resolves and publishes. |
| 25–40 s | Actual patch: pre-abort guard, pipeline signal, abort-error normalization after staging cleanup. |
| 40–50 s | Actual native AFTER and five passing tests: source destroyed, old destination preserved, staging empty. |
| 50–60 s | State draft upstream status, unresolved normal-upload performance and no hosted-impact claim. |

If execution takes longer, show the full result and extend the explanation; do not hide a meaningful failure or splice fabricated output.

## Five-minute engineering walkthrough

| Time | Discussion and evidence |
|---|---|
| 0:00–0:45 | Contract and call path: upload route → request-body signal → Uploader → FileBackend → staging pipeline. Use the README diagram and pinned source. |
| 0:45–1:30 | Oracle: pre-abort, active transfer, old destination/staging/source lifecycle. Explain why a `data` listener once broke the harness and why `resume` alone does not prove a disk write. |
| 1:30–2:15 | Patch alternatives: reuse pipeline cancellation rather than bespoke listeners; preserve metadata/rename after body completion. Explain AbortError normalization compatibility. |
| 2:15–3:00 | Regression red/green versus actual xattrs versus HTTP/PostgreSQL checks; distinguish historical runs, current quickstart and hosted CI approval. |
| 3:00–3:45 | Performance method: 130 groups preserved; reduced source production is not physical I/O; unfavorable paired observations plus unstable sham controls leave normal-upload attribution inconclusive. |
| 3:45–4:30 | Download follow-up: real client disconnect before headers versus post-header Fastify cleanup. MD5 keeps reading; all descriptors close. A local diagnostic signal-forwarding intervention tests the causal explanation. |
| 4:30–5:00 | Maintenance and credibility: small upstream patch; no speculative bundled fix; bounded synthetic agent remains experimental. Its balanced evaluation cannot distinguish ordering policies. |

## Ten challenging questions to practice

1. What interleavings exist between pre-abort checking, staging creation and pipeline listener registration? Which resource does each failure path own?
2. Why may rename legitimately complete after the client disconnects, and where does that decision belong in the uploader/backend contract?
3. Can a stream's `destroyed` property prove its descriptor has closed? How do the experiments distinguish `destroyed`, `closed` and `fd === null`?
4. Which observation would disprove the claim that the missing pipeline signal caused the original failures? Why is red/green stronger than only testing the fixed code?
5. Why does observing `data` change a stream experiment, whereas `open` or `resume` can answer different lifecycle questions without proving the same facts?
6. Why does passing a signal into `getObject` matter before headers, even when Fastify cleans up a streamed response after socket close?
7. How could version indirection invalidate an apparent same-key overwrite/data-loss claim? Which higher-layer experiment would be required?
8. What would justify a 5% performance-equivalence margin, and what stable control/precision requirements would you predeclare before collecting more samples?
9. Why can a hash chain detect accidental/torn evidence changes but not authenticate an attacker-controlled rewrite of the entire history? How does no-follow opening change the filesystem threat model?
10. Why does the balanced three-family, two-probe evaluation force every ordering to detect four cases? What separate versioned, independently specified corpus would be necessary before evaluating adaptive value?

Good answers should reference this repository's actual code and limitations. They do not substitute for production operational experience or human code review.

## 2026-10-30 verified extension

The local GET candidate is now `8eceb9` on frozen9d15cdc9, separate from the published upload contribution. Nineteen cases give10failed/9passed before and pass after; the current full-suite rerun passes3441tests/182files. The first failure also occurred on untouched baseline; a separate real-config test-fixture mitigation passes3422baseline and3441composite cases. Explain both the failure and the mitigation, including the unproven module-cache mechanism. The lab artifact reader also has a real final-path replacement regression and descriptor-based correction. [Exact evidence and current gates](../reports/advanced-engineering.md). No additional upstream acceptance or production experience is implied.
