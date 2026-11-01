# Tooling comparison and reuse decision

Reviewed 2026-10-28 against current official repository READMEs. This is a scope comparison, not a benchmark or an exhaustive competitive survey.

Keep this project as a focused, reviewable Supabase filesystem-upload cancellation case study. Its useful contribution is the concrete adapter-level oracle and the evidence connecting a pinned failing implementation to a small patch and regression tests. Broad storage compatibility, traffic generation, network fault injection and generated test-case infrastructure already have dedicated tools.

## What overlaps and what to reuse

| Tool and verified primary source | Documented capability and overlap | Reuse decision and boundary |
|---|---|---|
| [Ceph S3 compatibility tests](https://github.com/ceph/ceph/blob/0fab663780ab76bb88aead23d15e930b826151a9/src/test/rgw/s3-tests/README.rst) | Boto2/Boto3 tests against an S3-like service, configured with endpoint and credentials; individual tests and marker filtering; also STS and IAM tests. Overlaps with checking storage behavior through a public protocol. | If S3 compatibility becomes a separate task, select relevant existing tests and distinguish Ceph extensions from promised Supabase behavior. Do not build another general S3 conformance suite. An endpoint test alone does not observe this adapter's source destruction, staging directory or pre-aborted in-process call. |
| [MinIO Warp](https://github.com/minio/warp/blob/f72a7315e2d010159cca7679613e9bd86a13fdcf/README.md) | Concurrent S3 workloads, distributed clients, object-size variation and saved per-request benchmark data. Overlaps with the lab's interest in upload performance. | Reuse for an explicitly scoped S3 endpoint workload if needed later; it does not replace the current filesystem-adapter microbenchmark or establish patch causality. Do not build a general S3 load generator or distributed benchmark coordinator. Its README says the selected bucket is wiped before and after runs, so any future use requires a dedicated disposable target. |
| [Grafana k6](https://github.com/grafana/k6/blob/8ba085f9e15cb059ba82a1ef91e76d056da63d99/README.md) | Scripted load generation, multiple protocols, checks, thresholds, workload scenarios and metrics export. Overlaps with repeatable HTTP-level validation and performance experiments. | Reuse for future request-level workloads and explicit response/latency checks. Keep the small native reproducer for inspecting filesystem state and source lifetime. Do not build another scenario scheduler, thresholds engine or metrics-export platform. |
| [Toxiproxy](https://github.com/Shopify/toxiproxy/blob/49299d8838525126e09c85ebe0ba89940a3261e5/README.md) | TCP proxy with programmable connection faults, including latency, bandwidth limits, timeout, reset and byte-limit disconnection; deterministic and randomized fault application. Overlaps with testing interrupted transfers. | Reuse if a follow-up needs repeatable network faults through an HTTP or database connection. Keep direct signal control for the present in-process adapter test: a TCP fault and an `AbortSignal` are different triggers. Do not build a generic network-fault proxy. |
| [fast-check](https://github.com/dubzzz/fast-check/blob/7da25f4e259c1262c9830166c5043041b47be967/packages/fast-check/README.md) | JavaScript/TypeScript property testing, shrinking, counterexample replay, model-based testing and asynchronous scheduling for finding races. Overlaps with exploring cancellation timing and lifecycle invariants. | If evidence later justifies generated cases, reuse its generation/shrinking/replay machinery and supply the storage-specific model and assertions. The current two failure modes and five controls need no new dependency. Do not build a custom property-testing or shrinking engine. |

The old [ceph/s3-tests notice](https://github.com/ceph/s3-tests/blob/5b3987116eca0b4b8fa57d6b10f3db57bab196b6/README.rst) explicitly says development moved into `ceph/ceph`. New reuse work should start at the current location above.

The boundaries in the final column are engineering judgments from each documented scope and the local source; they are not claims that those tools cannot be extended to test related behavior.

## Defensible differentiation

The present artifact combines a pinned Supabase implementation, real files and native extended attributes, controlled cancellation before and during transfer, assertions about source destruction and destination/staging state, and regression-only failures before applying the production fix. The reproducer repeats native observations three times per variant and requires exactly two failing tests before five pass after the fix. See the [runner](../experiments/reproduce.mjs), [native probe](../experiments/file-upload-cancellation.ts) and [case study](../reports/file-upload-cancellation.md).

That integration and explicit expected result are the clearest reason to retain this lab. None of the inspected READMEs supplies that particular Supabase oracle. This is a precise case-study distinction, not evidence of a novel testing technique, an unserved market, tool adoption or uniqueness across all existing tests.

The strongest positioning is: **a reproducible investigation of cancellation semantics in one Supabase Storage backend, with a reviewable fix and bounded evidence**. Avoid positioning it as a general storage test framework, production corruption finding, hosted-service diagnosis or performance improvement. The [performance report](../reports/performance.md) leaves successful-upload equivalence unproven; adopting another load tool would not by itself clear that uncertainty.

## Search and validation limits

The review inspected the five official READMEs linked above and local README, reproducer, probe and validation documentation. GitHub-native read tools retrieved the sources; links pin the inspected repository revisions. The fast-check README was resolved through its `.github/README.md` symlink to the package README. No installation, benchmark, Docker workload or tool integration was performed for this comparison.

This bounded review did not enumerate every test, extension, open issue, fork, commercial product or unpublished maintainer work. Documented capabilities were verified; absence of a matching example is not proof that none exists. Future implementation or CLI/API instructions should be checked against current official documentation before use.
