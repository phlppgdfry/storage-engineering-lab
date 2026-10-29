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
