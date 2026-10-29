# Independent prelaunch review notes

Review scope: initial lab commit `731896020e5e159a85bdf3c51413faa4955d9d6e`; upstream candidate `3bbc971796fe9907a030c4fc70a07d440930d7b2`, parent `b11f751abe0fdd6c7f56d3a858b5527f683b7a37`. This is a separate agent review, not a claim of another model or human review. Source and retained compressed data were inspected independently before reading the performance conclusions. No upstream files were changed, no benchmarks or services were started, and nothing was published or sent to maintainers. Initial findings below refer to the original files/line numbers, before the release-candidate hardening now underway.

## Initial release findings

### HIGH — fixed Compose project and destructive cleanup are not protected by ownership checks

Locations: `validation/README.md:52–65`, `validation/compose.yml:51`.

The recipe always uses project `storage-lab-validation`, explicitly assigns container name `storage-lab-validation-iceberg`, and finally instructs `down --volumes`. There is no generated unique run identity, freshness check, ownership marker or validation of an existing project. If a previous run or another local workflow already uses that project/name, the recipe can reuse its data and later remove its volumes. This contradicts a strong guarantee that only this invocation's disposable resources are affected. The explicit container name also defeats isolation if the user changes only `-p`.

Smallest correction: remove the explicit container name; generate a unique project per run, persist its ownership identity before creating resources, reject reuse of an unexpected project, and use that exact identity for cleanup. A safe local wrapper should make this concrete rather than relying on manual project-name substitutions. No collision/deletion experiment was performed.

### MEDIUM — source identity and execution state are assumed, then reported as facts

Locations: `validation/Dockerfile:7–9`; `validation/linux.mjs:24–25`; `validation/integration.mjs:24–26`; `validation/http-file.ts:93–96`; `benchmarks/run.mjs:19–25,51–54`; `benchmarks/steady-run.mjs:20–25,42–47`.

An arbitrary build context gets the fixed source label; validation artifacts hardcode the candidate commit. Benchmarks start with `state = fixed` without checking that file or the rest of the source. A changed checkout can therefore be tested and still generate an artifact naming the original commit. Reversing the patch only proves its context matched; unrelated edits and dependencies are not validated. CPU/memory metadata in the first benchmark is also hardcoded even if invoked without the documented limits.

Smallest correction: prepare only the pinned clean tracked source and record/verify the source tree, lockfile and production-file identities before commands; fail closed on mismatch. Record observed runtime/image/limits separately from requested settings. Do not retroactively relabel old measurements. For the retained data specifically, the recorded production-file hashes do match `git show` of the exact parent and candidate; this issue is a rerun/provenance flaw, not evidence that those old runs used a wrong variant.

### MEDIUM — Docker ignore does not exclude all private environment files

Locations: `validation/Dockerfile.dockerignore:3–5`, `validation/Dockerfile:7`, `validation/README.md:13`.

The ignore file lists only `.env`, `.env.test`, `.env.acceptance`. A context containing `.env.local`, `.env.production`, or another `.env.*` passes it into `COPY . .` and stores it in an image layer. The README says private env files are excluded, which is broader than the actual filter. The prescribed fresh worktree normally avoids untracked local env files; the Dockerfile itself does not enforce that condition.

Smallest correction: construct a tracked-only pinned context and/or exclude `.env*` with narrow sample-file exceptions. Verify the context file list before building. Never copy the contributor's private env configuration into the disposable source.

### MEDIUM — historical successful-upload measurements cannot establish a performance gate

Locations: `benchmarks/upload-worker.ts:46,70–84`; `benchmarks/steady-worker.ts:19,42–58`; the three `evidence/completion/performance-*.json.gz` datasets.

The create-many timed workload retains an implementation-dependent number of files/dirty pages. The follow-up changes both destination reuse and the source implementation (array chunks instead of async generator), so it is not an exact replication. More decisively, the identical-code sham is unstable: original/live-signal A versus the identical S has paired throughput differences +251.36%, +9.14%, −64.28%, +224.56%, +18.02%, −69.16%. The timed 4 MiB/c1/live-signal fixed variant is slower in all five pairs (median paired change −16.70%; range −28.43% to −8.16%). Those unfavorable observations must remain visible even though causation is unresolved. One of 30 steady warmups fails its stated criterion; 29 passing warmup flags do not establish measurement stationarity.

Smallest correction: make the final result explicitly inconclusive for successful-upload regression/equivalence, keep all three historical datasets immutable, and specify a future controlled exact-workload comparison with a predefined practical threshold and credible sham stability. New runner safeguards alone do not rehabilitate old data. No full rerun is justified merely to complete a local report.

### LOW — Linux red-stage failure leaves the disposable source reversed

Location: `validation/linux.mjs:25–37`.

After reversing the production patch, failure in a native probe, red test or assertion exits without reapplying it. Documented `docker run --rm` discards this container, so this is not evidence of host-checkout damage. It becomes confusing/unsafe when a retained container or generic runner is reused and still considered fixed.

Smallest correction: use a disposable stage-specific source or restore in `finally`, check the final source identity, and preserve the original error if restoration also fails. Do not let cleanup failures erase the test failure.

### LOW — README contradicts the retained Linux evidence

Location: `README.md:28`.

The requirement paragraph says Linux is unverified, despite the Linux section and retained Linux native/unit/build evidence. Smallest correction: distinguish the original macOS reproducer from the later Linux arm64 validation, with links and scope.

## Upstream cancellation patch assessment

Inspected actual upstream `src/storage/backend/file.ts:197–240`, all five added cases in `file.test.ts:1343–1465`, the parent implementation, error definitions and the analogous S3 abort handling. No blocking correctness defect was found in the bounded patch. It checks pre-abort before creating a staging file; passes the signal to the actual streaming pipeline; cleans the stage and maps AbortError with original error preservation. Post-body metadata/hash/rename remains intentionally allowed to complete. The adapter caller passes the request signal, and the uploader already treats completion as a transaction that must finish after body receipt.

Limits: the active regression synchronizes on `resume`, not an observed physical write (`file.test.ts:1370–1382`; `experiments/file-upload-cancellation.ts:40–46`), so it demonstrates destruction/settlement and old-object preservation without proving the exact disk-write cancellation point. The separate HTTP check does wait for a real staged write (`validation/http-file.ts:80–89`), but has no parent red run and may already pass on the parent through source-error handling. The reports should retain both qualifications. An AbortError emitted by a source without an aborted supplied signal is also normalized; this follows the existing S3 convention and is not a newly discovered blocker.

No performance-neutrality finding follows from code size or correctness tests. No full upstream CI/matrix or human maintainer approval is established by this review.

## Independent raw-data verification

- Parsed all 50 exploratory, 50 timed and 30 steady rows directly from their gzip files.
- Both production SHA-256 identities match exact parent/candidate source: original `b3caa1184247a76f45b7c44322580f191e12c398131ea198f215580439f5c706`; fixed `13aeee850cc7263a87b0fd2431a429e2360d7cd135b98ccf8ce5f1d422cfb710`. Every stored row has the appropriate identity.
- For exploratory/timed rows, verified count equals latency count and successes plus aborts; recomputed throughput and nearest-rank p50/p95/p99. Neither timed workload hits its request-count cap.
- Regenerated both summaries with the actual `benchmarks/summarize.mjs`: parsed JSON equals the committed summaries exactly.
- Recomputed the six B/A, S/A and D/C steady ratios; values match the report. There is no credible causal or equivalence estimate from these controls.
- In every cancellation row across exploratory/timed data, source bytes per attempt are exactly original 4,194,304 and fixed 131,072 (96.875% reduction). These count generated source chunks, including read-ahead; they are not measured physical disk/network traffic. Original uploads finish, fixed uploads reject, so their throughput ratios compare different work.
- Verified all nine artifact SHA-256 hashes and byte sizes in the retained completion manifest. This checks integrity against that manifest, not authenticity of historical execution.
- Historical integration/Linux/HTTP summaries were inspected but those suites were not rerun by this reviewer; summaries alone are not fresh independently observed test passes.

## What performance-final may responsibly conclude

The fix corrects the reproduced adapter cancellation behavior; retained synthetic cancellation data show 32 times fewer source bytes generated per attempt. The successful-upload performance result is **INSUFFICIENT EVIDENCE**: an adverse 4 MiB/c1 observation remains, sham variability prevents causal attribution, and neither a proven regression magnitude nor proven equivalence is available. Reports may describe hardening and smoke checks as improvements to future reproducibility. They must not call them new benchmark validation, a performance pass, disk/network savings, production impact, or a fresh upstream test run.

No BLOCKER finding against the production patch is established. The initial local runner/public recipe needs the safety and provenance corrections above before being called a safe reproducible release candidate. A final independent review of the changed local candidate remains pending.
