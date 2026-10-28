# Upload cancellation and performance: results and limits

## Conclusion

The cancellation experiment consistently reduces **input-source bytes produced per cancelled operation from 4 MiB to 128 KiB**, while correctly rejecting the operation. This is 96.875% fewer generated source bytes in this synthetic adapter workload. It is not measured physical disk traffic, network traffic, infrastructure cost or hosted-service impact.

For successful-upload speed and performance equivalence, the result is **INSUFFICIENT EVIDENCE**. One workload initially showed a consistent slowdown, and a subsequent identical-code control exposed very large environment/run variability. Neither the slowdown nor its absence can be reliably attributed to the patch. The draft must not claim a general speedup or a cleared performance-regression gate.

## Design and evidence

All experiments used the actual FileBackend, native Linux xattrs and MD5 ETags, Node 24.21.0, four container CPUs and 3 GiB memory. No database or network request is part of the measured adapter call. Other tests/builds and our integration stack were stopped during measurement.

All three datasets are retained, including unfavorable and inconclusive observations:

| Dataset | Work | Purpose |
|---|---|---|
| Exploratory | 5 workloads × 5 pairs = 50 groups | Fixed request counts; revealed that short runs were too variable. |
| Timed | Same 50 groups, 250 ms warm-up and 2 s windows | Longer measurements, AB/BA order, fresh processes and actual source hashes. |
| Diagnostic | 6 balanced reversed-order blocks × 5 treatments = 30 groups | Focus on 4 MiB/concurrency 1; constant destination, signal on/off, original/original sham and cgroup diagnostics. |

The first two use an async-generator chunk source and create distinct destination files. The diagnostic uses array chunks and overwrites one destination. It isolates some confounders but is **not an exact replication** of the create-many workload.

Raw data, compressed without removing samples:

- [Exploratory](../evidence/completion/performance-exploratory.json.gz), [summary](../evidence/completion/performance-exploratory-summary.json).
- [Timed](../evidence/completion/performance-timed.json.gz), [summary](../evidence/completion/performance-timed-summary.json).
- [Diagnostic/sham](../evidence/completion/performance-steady.json.gz).
- [Independent method review](performance-method-review.md).

`node benchmarks/summarize.mjs <dataset.json.gz>` regenerates summaries for the exploratory/timed datasets. See `validation/README.md` and the scripts under `benchmarks/` for the actual commands and experimental definitions.

## Successful uploads: preserve the warning

Timed-run medians below aggregate **run-level** metrics, not pooled request percentiles. Ranges are the five paired throughput changes `(fixed/original - 1) × 100`.

| Workload | Original median ops/s | Fixed median ops/s | Paired change range |
|---|---:|---:|---:|
| 64 KiB, concurrency 8, no signal | 860.75 | 1,421.37 | −56.29% to +109.11% |
| 64 KiB, concurrency 8, live signal | 1,255.19 | 1,073.72 | −19.37% to +31.46% |
| 4 MiB, concurrency 1, live signal | 41.71 | 33.07 | **−28.43% to −8.16%** |
| 4 MiB, concurrency 8, live signal | 74.43 | 66.78 | −57.82% to +11.54% |

All five concurrency-1 pairs were slower with the patch; their median paired change was **−16.70%**. Four pairs also had higher median latency and CPU per operation. This is a real observation in the data and must not be dismissed solely because other measurements are noisy.

These data did not establish cause. Trial duration, warm-up, filesystem state, retained-file growth, VM scheduling and other unmeasured effects can confound a small patch comparison. No single cause was identified.

## Diagnostic control

The diagnostic keeps a bounded overwrite working set and uses five treatments: original/live signal (A), fixed/live signal (B), original/no signal (C), fixed/no signal (D), and a separately executed original/live-signal sham (S).

| Comparison | Six paired throughput changes | Median |
|---|---|---:|
| A → B: actual patch | +66.91, +18.17, −65.30, +202.83, +12.11, −49.25% | +15.14% |
| A → S: **identical original code** | +251.36, +9.14, −64.28, +224.56, +18.02, −69.16% | +13.58% |
| C → D: no-signal control | +115.85, +11.86, −15.85, +3.25, −70.20, −64.86% | −6.30% |

Identical code varying this much prevents reliable causal attribution of the earlier difference. It does **not** prove that the patch has zero overhead. Comparisons sharing A also share a denominator; their correlation is not independent proof of equivalence.

The warm-up rule was specified before running: at least 2 s, last three 500 ms windows with coefficient of variation ≤15%, maximum 6 s. One B run failed that rule and is retained. Several nominally stable warm-ups still differed substantially from their measured phase; this rule did not establish stationarity. Block order is made of reversed-order pairs with balanced average positions, not a full Latin square.

Effective cgroup limits were read: `cpu.max = 400000 100000`, `memory.max = 3221225472`. No measured CPU-quota throttling or memory-event increases were recorded. This rules out those observed counters as an explanation during these windows; it does not identify the source of variability.

## Cancellation and resource accounting

Across the timed cancellation workload, source production was consistently 4,194,304 bytes per operation on original code and 131,072 on the fix. The fixed source can prefetch a second 64 KiB chunk before cancellation settles. Original transfers return success after consuming the whole source; fixed calls reject with `AbortedTerminate`.

The median of per-run cancellation p95 observations was approximately 298 ms versus 4 ms. The outcomes and operation counts differ, and the environment is noisy, so this must not be marketed as a general throughput or latency speedup.

RSS is sampled every 5 ms, not an exact peak or per-request allocation. Faster cancellation permits many more operations in a timed window; a higher sampled RSS therefore cannot by itself be read as a per-request memory regression. CPU-per-operation, throughput, p50/p95/p99, all individual latencies and source hashes remain in the raw files.

OS caches were not flushed, no fsync is requested and no durable-write throughput is established. Some initial workloads have fewer than 100 samples per run, making p99 effectively the observed maximum. No production SLA, cost saving or benchmark CI threshold is derived from this data.

## Decision

The bounded cancellation claim is supported. Successful-upload performance attribution remains open. Keep the contribution scoped and in draft; do not change production code merely to chase noisy measurements. A future performance decision needs a controlled runner and an exact create-many replication with credible sham stability and profiling evidence. No normal-upload performance budget is justified yet.
