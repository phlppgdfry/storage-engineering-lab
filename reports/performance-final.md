# Final assessment of the retained performance evidence

**Successful-upload performance: INSUFFICIENT EVIDENCE.** The retained experiments establish neither equivalence nor an attributable regression magnitude. The unfavorable 4 MiB/concurrency-1 observation remains visible. The synthetic cancellation workload consistently generates fewer source bytes with the fix; it does not measure physical disk traffic, network savings, production cost or hosted-service behavior.

This assessment independently inspects the actual runner/worker code and all 130 retained measured groups: 50 exploratory, 50 timed and 30 diagnostic groups. It recomputes metrics from the compressed raw files. This separate agent review is not a human review or a claim of a different model. No new performance run was started for this report. Later safety or provenance improvements to the local runner cannot retroactively improve the experimental controls in these historical results.

## Data checked

| Dataset | Design actually used | Evidence |
|---|---|---|
| Exploratory | Five workloads, five original/fixed pairs, fixed request counts; fresh worker per group | [Raw data](../evidence/completion/performance-exploratory.json.gz), [summary](../evidence/completion/performance-exploratory-summary.json) |
| Timed | Same five workloads and pairs; at least four warm-up uploads and 250 ms warm-up, 2 s admission deadline followed by in-flight drain | [Raw data](../evidence/completion/performance-timed.json.gz), [summary](../evidence/completion/performance-timed-summary.json) |
| Diagnostic | Six five-treatment blocks; one repeatedly overwritten 4 MiB destination; signal on/off, actual patch and identical-code sham | [Raw data](../evidence/completion/performance-steady.json.gz) |

All 130 stored adapter hashes match the appropriate exact parent or candidate source obtained from Git: original `b3caa1184247a76f45b7c44322580f191e12c398131ea198f215580439f5c706`, fixed `13aeee850cc7263a87b0fd2431a429e2360d7cd135b98ccf8ce5f1d422cfb710`. This verifies the recorded adapter identity; it does not independently attest every historical dependency, image or runtime setting.

For exploratory and timed groups, operation counts equal both the recorded latency-array length and successes plus aborts. Recomputed throughput and nearest-rank p50/p95/p99 match their recorded values. Regenerating both summaries with `benchmarks/summarize.mjs` yields the committed summaries exactly. No timed group reaches its request cap. All nine artifact hashes and byte sizes in the historical [completion manifest](../evidence/completion/manifest.json) match their files. Integrity against a manifest does not prove authenticity of the historical execution.

## Successful-upload observations

The following values are descriptive run-level summaries, not pooled request percentiles, confidence intervals or performance budgets. A median of per-run throughput values differs from the median paired percentage change.

| Timed workload | Original median ops/s | Fixed median ops/s | Median paired change | Paired change range |
|---|---:|---:|---:|---:|
| 64 KiB/c8, no signal | 860.75 | 1,421.37 | +44.70% | −56.29% to +109.11% |
| 64 KiB/c8, live signal | 1,255.19 | 1,073.72 | −14.46% | −19.37% to +31.46% |
| 4 MiB/c1, live signal | 41.71 | 33.07 | **−16.70%** | **−28.43% to −8.16%** |
| 4 MiB/c8, live signal | 74.43 | 66.78 | +6.61% | −57.82% to +11.54% |

All five timed 4 MiB/c1 pairs are slower with the fix. Four also have higher per-run median latency and CPU per operation. This is an unfavorable observation, including in both AB and BA order. It must not be erased by averaging workloads, selecting better runs or pointing only to unrelated noisy measurements. It also does not establish that the patch caused a 16.70% population regression.

The initial exploratory runs are brief and variable; the timed experiment has only five experimental pairs per workload. Thousands of requests within a run do not create thousands of independent implementation comparisons. No predefined equivalence margin, adequate uncertainty bound or successful sham-stability criterion was established for these measurements.

## Diagnostic controls and ordering

Treatments are A = original/live signal, B = fixed/live signal, C = original/no signal, D = fixed/no signal, and S = a separate execution of the exact same original/live-signal treatment as A. Recomputed paired throughput changes are:

| Block | B/A: actual patch | S/A: identical code | D/C: no-signal control |
|---|---:|---:|---:|
| 1 | +66.91% | +251.36% | +115.85% |
| 2 | +18.17% | +9.14% | +11.86% |
| 3 | −65.30% | −64.28% | −15.85% |
| 4 | +202.83% | +224.56% | +3.25% |
| 5 | +12.11% | +18.02% | −70.20% |
| 6 | −49.25% | −69.16% | −64.86% |

Identical-code variation is large enough that these controls cannot attribute normal-upload differences to the patch or exclude smaller overhead hidden beneath the variation. The B/A and S/A comparisons share A as denominator; their similar patterns are not independent evidence of equivalence. A favorable diagnostic median does not clear the earlier warning.

The timed/exploratory runner alternates AB/BA by repetition; five repetitions give three AB and two BA pairs, with the same workload ordering each time. The diagnostic uses three reversed-order block pairs. Every treatment has average position three, which balances linear position effects, but positions are not equally represented: S occurs only at positions one, three and five. This is not a full Latin square and does not eliminate carryover, nonlinear drift or shared VM effects.

Diagnostic warm-up uses windows of at least 500 ms, at least 2 s total, the last three windows' coefficient of variation at most 15%, and a nominal maximum of 6 s. Recalculated coefficients match the data. B/block 6 does not satisfy the rule and remains included. Passing the rule is not proof of stationarity: S/block 6 has a last-three-window mean near 133.34 ms per operation versus 61.47 ms per operation during measurement.

All diagnostic groups record `cpu.max = 400000 100000` and `memory.max = 3221225472`. During their measured intervals, `nr_throttled` and `throttled_usec` do not increase, `memory.events` does not change, and each group's recorded `io.stat` is unchanged. These counters do not establish absence of filesystem, cache, JIT, GC, CPU-frequency, VM or host-scheduling effects. A four-CPU quota is not an exclusive CPU reservation. No specific source of the variability has been proven.

## What the harness measures

The first two datasets use an async-generator source yielding 64 KiB slices and distinct destination files retained until worker cleanup. Faster timed groups can accumulate more files, dirty pages and metadata. A fresh process and temporary directory do not reset the kernel or VM state. Warm-up is sequential even for concurrency-eight workloads, and its upload count is not retained. This is a valid synthetic create-many workload, but it does not isolate cancellation-listener overhead alone.

The diagnostic bounds retained payload to a repeatedly overwritten destination and changes the source to `Readable.from` over an already constructed array of chunks. This helps diagnose instability but changes two workload properties. It is not an exact replication of the earlier create-many warning. Both signal/no-signal paths create a controller, but the no-signal path does not access its `.signal`, so those paths also differ slightly in harness work. A and S are still identical to one another.

Requests are admitted in a closed loop. Latency spans the adapter call to settled outcome and harness checks, without an external arrival queue. The timed deadline stops new admissions; the worker waits for in-flight operations. The longest timed group lasts 3,396.74 ms, rather than exactly 2,000 ms. Using actual elapsed time is appropriate for its reported throughput, but groups do not share an exact fixed duration. This drain alone does not explain the c1 warning, which is also present in most median latencies.

The adapter stages real files, writes native metadata, computes MD5 ETags and renames them. It requests no fsync and flushes no OS cache. There is no database, network or hosted-service workload in these measurements. CPU is process CPU per operation. RSS is sampled every 5 ms, initialized before warm-up; it is neither exact peak allocation nor per-request memory, and it excludes a complete account of page-cache/cgroup memory. Some runs have fewer than 100 requests, making p99 their observed maximum. These measurements do not support an SLA, durable-disk claim, general memory benefit or general speedup.

## Bounded cancellation result

Across every cancellation group in both exploratory and timed data, the original generates exactly 4,194,304 source bytes per attempt; the fixed implementation generates exactly 131,072. This is 32 times fewer source bytes, a 96.875% reduction in this synthetic source/runtime setup. The original finishes and returns success; the fix rejects with `AbortedTerminate`. Their operations per second describe different outcomes and must not be sold as a normal-upload speedup.

Cancellation is initiated by source-generator resumption after the first chunk yield, not by observing an exact physical write. Read-ahead permits a second 64 KiB chunk. The 128 KiB figure is observed harness behavior, not a universal API bound for arbitrary streams. The timed median of per-run cancellation p95 values is approximately 298.19 ms original versus 3.99 ms fixed, with different outcomes and request counts; this is also not a production latency guarantee. Higher fixed cancellation RSS can reflect many more attempts during the same time window and is not, by itself, evidence of a memory leak or per-attempt memory regression.

## Decision and next evidence

Preserve the original data and warning. The supported result is corrected bounded adapter cancellation behavior with fewer generated source bytes in the retained synthetic cancellation workload. Successful-upload causal attribution and equivalence remain **INSUFFICIENT EVIDENCE**. Functional validation and safer runner execution are separate from a performance gate.

If a later release requires performance equivalence, define a practical margin and analysis before collecting new data; use a controlled environment, multiple independent paired blocks and credible identical-code sham stability. Replicate the exact create-many source/workload before using overwrite results to answer its warning. Record observed image/dependency/source identity, filesystem and run timestamps, actual limits and relevant diagnostics. Profile a persistent difference only after stable controls make attribution credible. Until then, neither further speculative production changes nor another broad local benchmark matrix is justified by this evidence.
