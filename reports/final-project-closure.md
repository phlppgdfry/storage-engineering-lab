# Final project closure — 2026-10-31

**CONDITIONALLY READY.** Local engineering and release preparation are complete within the tested scope. Publication authorization and hosted checks on the final approved commit remain required. Therefore **PROJECT RELEASE COMPLETE is not yet true**. **UPSTREAM CONTRIBUTIONS PENDING** is a separate state, not a prerequisite for releasing this research portfolio.

## Frozen scope and inventory

This is a finalization of existing work, not a new research programme. No new dependencies, production feature, benchmark campaign, upstream PR or external communication was introduced. Existing historical evidence and failed runs remain preserved. Five already-public historical log presentations received labelled path-only redactions; original bytes, Git blob identities and hashes remain preserved, as detailed below.

| Item | Verified state |
|---|---|
| Public lab main | `731896020e5e159a85bdf3c51413faa4955d9d6e` |
| Public lab PR #1 | OPEN, non-draft, MERGEABLE, head `4f98bb5861a2df5b0e68cac9a5184bd0f8d744ca`, no returned comments/reviews |
| Earlier presentation unit | Local `showcase/presentation-rc` at `c9006dcd4df099a25b33de26e6281335b5d3db36`; eleven-file update to PR #1, unchanged |
| Audited lab implementation | `research/advanced-cancellation`, `254c6fbdaa5ffbc0639b9783939048452405a778`, preserved |
| Prepared full portfolio candidate | Local `release/portfolio-rc`, descendant of that implementation; exact final SHA is `git rev-parse release/portfolio-rc` |
| Upload checkout / published contribution | Clean `fix/file-upload-cancellation`, `3bbc971796fe9907a030c4fc70a07d440930d7b2`; unchanged |
| Current upstream / frozen research base | `9d15cdc93c0b1afc37708914f5e45f865b231d48`, still current at finalization inspection |
| Separate GET candidate | `fix/file-download-cancellation-current`, `8eceb9017690cc4d19ecc47a06452a943b2d0256`, two files |
| Separate lifecycle fixture candidate | `test/lifecycle-config-isolation`, `9a760254b942d109054f941b5b21c93d4bd3ffdb`, one test file |
| Version / licensing | Prepared `1.0.0`, package remains private; no existing tags/releases; existing Apache-2.0 and NOTICE unchanged |

All source contributions can be reviewed without the lab commit: their parents, minimal diffs and regression evidence are independent. The lab archives patches; it does not install them into a production service. The initial GET candidate `e1e033c` and its earlier 211-based results are preserved rather than rebased away.

## Validation record

The [closure evidence](../evidence/closure/summary.json) records exact commands, source identities, environments, exits and cleanup. Its [manifest](../evidence/closure/manifest.json) covers curated outputs; full raw logs remain ignored under `evidence/local`. Earlier detailed regression/environment records are in the [advanced audit](advanced-engineering.md).

| Gate | Result / scope |
|---|---|
| Node 24 lab tests | PASS: 45/45 on macOS arm64; clean local clone also passes |
| Evidence, manifests, syntax, Markdown links | PASS: `npm run check`; all 130 retained groups, including the failed warm-up observation |
| Clean-clone native demo | PASS: `doctor` and real demo, expected red2/green5, native xattrs, owned cleanup; prepared historical dependencies reused |
| Historical upload Linux validation | PASS: fresh pinned source/lock; 3,304 unit passes / 2 explicit root-permission skips, native3+3, red2/green5, lint, TypeScript/esbuild |
| Linux lab tests | PASS: 45/45, Node24.21.0, clean read-only source export with Git prerequisite |
| Current GET Linux | PASS: expected red10/green19 focused cases; full file169 passes/2 root skips; full suite3,439 passes/2 skips across182 files, lint/build |
| Separate fixture Linux | PASS: 3,420 passes/2 root skips across182 files, lint/build; reversible combined overlay3,439 passes/2 skips |
| Current HTTP Linux | PASS: actual original/fixed, three repetitions each, nine cases each; measured descriptors close and each route finalizes once |
| Dependency audit | Completed exit1 with advisories: 24 upstream packages, 13 high / 11 moderate / 0 critical; exact 9d lock, Node26/npm12 |
| Candidate secret/path scan | PASS after labelled historical path redactions; default Gitleaks rules find no secrets; original bytes preserved |
| Gitleaks history scan | PASS: v8.30.1, default rules, all local refs, fully redacted report; 11 commits at audited implementation; no findings |
| Previous PostgreSQL / HTTP integration | Historical PASS only: 1,379 tests / five HTTP checks; not rerun on current 9d |
| Normal-upload performance | INCONCLUSIVE; no new benchmark, no regression-neutrality claim |
| Hosted candidate checks | NOT EXECUTED; publication is not authorized |

The supplemental Linux results use fresh exact-lock installs and actual native xattrs. Before headers, Linux original hashing reads16 MiB after abort at64 KiB; the corrected variant reads64 KiB in all three observed runs. No universal byte/latency bound is claimed. Environment failures remain recorded in the evidence summary. macOS results are never relabeled Linux. Root permission skips are not counted as passes. No assertion was relaxed or removed.

### Reproduction and error interpretation

The public upload quickstart remains [pinned and documented](../docs/reproduction.md). A new clean local clone of implementation254c6fb executed check, all45 tests, doctor and the real terminal demonstration successfully. This proves that local source export, not that unpublished changes already exist on public main. Native dependencies were reused; Linux validation separately installed the exact historical lock.

For GET/fixture Node26 reproduction use the [fresh-checkout commands](advanced-engineering.md#reproduce-the-new-candidate-without-touching-historical-checkouts). The GET production change forwards the existing signal into MD5 and full/range native streams, with abort checks between acquisition steps. In-flight stat/xattr is not interrupted. Preserve the test-only fixture patch separately.

The initial current-base macOS full GET run had3,440 passes/1 lifecycle failure; the bounded repeat passed3,441. Untouched9d reproduced the same failure with3,421 passes. The fixture correction uses real configuration reload and environment stubbing, preserving assertions; its baseline suite passed3,422. The reversible combined overlay passed3,441 plus lint/build. The underlying module/cache/order mechanism remains INCONCLUSIVE. These are dated results, not a promise that every baseline run passes.

New finalization harness failures are retained too: the first minimal lab Linux image lacked Git, causing five fixture setup failures; the first Node26 HTTP runner lacked its enclosing ESM package context and stopped before the cancellation oracle. Neither establishes a production defect. A registry audit attempted inside the intentionally networkless container could not reach npm; the separate online exact-lock audit is authoritative. Corrected environments retain the same assertions and source patches.

## Security assessment

The standalone lab has **no npm dependencies**. Its private version field does not create a deployable Storage distribution. The re-audited upstream graph has24 affected packages, not24 unique CVEs. No audited affected node is marked development-only by the pinned lock. Tool/runtime packages must not be dismissed as dev-only merely because this repository uses them for experiments.

| Advisory group | Relevance and disposition |
|---|---|
| Multipart `@fastify/busboy` | Upstream runtime dependency; direct file-adapter and minimal GET fixtures do not exercise malicious multipart headers. Full upstream multipart exposure needs owner review; not patched in this lab |
| OpenTelemetry database instrumentation, Jaeger, gRPC | Upstream telemetry/exporter/runtime paths. The fixtures disable telemetry and use synthetic inputs; transport/configuration-specific exploitability is NOT VERIFIED. Some packages may still load; disabled telemetry is not a complete safety boundary |
| Platformatic/Watt and `systeminformation` | Upstream runtime/operational graph, including platform-specific advisories; minimal GET fixture does not start the Watt service. Linux hostile-interface-name and Windows behavior are not adversarially tested |
| `brace-expansion`, `fast-copy`, `fast-uri`, `ip-address` | Transitive runtime/tool paths. No malicious glob, nested object, schema URI or network allowlist corpus was executed. Presence does not prove exploitation, nor does a synthetic pass prove unreachability |

Detailed advisory IDs, ranges, dependency locations and suggested fixes are retained in the [audit JSON](../evidence/closure/upstream-audit.json). Upstream dependency remediation/tracking is P1 for this standalone synthetic lab, but must be separately evaluated before any production deployment. No blanket `npm audit fix`, dependency upgrade, public vulnerability claim or disclosure was performed. Only disposable local fixtures, no real credentials and no external load tests are permitted. Image/OS vulnerability certification and independent human security review remain unverified.

Previously confirmed lab final-component symlink races are corrected and regression-tested. Descriptor-based no-follow regular-file reads do not defend against every parent-directory swap or malicious same-UID writer; trusted code/private roots remain required. Cleanup is ownership-checked and process execution bounded, not an OS sandbox. SIGKILL reconciliation can remain manual. Backpressure and closed descriptors were measured for specific fixtures, not a universal memory/cleanup guarantee.

Gitleaks default-rule scans and private-path inspection reduce accidental exposure but cannot certify absence of every secret. The candidate scan found incidental absolute home paths in five already-published historical logs. Their release presentations now have labelled path-only redactions; [original/redacted hashes and Git blob identities](../evidence/closure/historical-path-redactions.json) preserve provenance. All originals remain byte-identical in prior Git history and ignored local preservation. This does not remove paths from already-published history; no history rewrite was attempted. Historical synthetic fixture values are not live credentials. Actions remain SHA-pinned with `contents: read`, no persisted checkout credentials and no release/push job. No workflow accepts generated research commands. Proposed actions are not represented as executed.

## Independent contribution readiness

| Contribution | Focus / review checklist / status |
|---|---|
| Upload #1616 | Existing eight-insertion/one-deletion production patch plus five cases. Check pre-abort, active transfer, destination preservation, late completion and error normalization nuance. OPEN/DRAFT/unmerged, no returned feedback. CI/Acceptance require approval; no branch/status update authorized |
| GET8eceb901 | Ten production insertions/four deletions plus19 cases. Check shared adapter contract, pre-abort, gated acquisition, MD5 cause, range/full stream ownership, normal/late-abort controls and Linux result. Local only; no new PR |
| Fixture9a760254 | One test file, real `getConfig({reload:true})` and restored environment; assertions unchanged. Check isolated/broad baseline comparison, cleanup and module-order uncertainty. Local only; no production feature-flag claim |

Expected cancellation does not universally roll back published uploads. Higher layers can finish metadata/version publication after body receipt. HTTP disconnect, request abort, response completion, provider cancellation and resource destruction are separate boundaries. See the source-linked [architecture and scenario matrix](advanced-engineering.md#architecture-and-guarantees). No download changes belong in #1616.

## Portfolio and five-perspective review

- **Principal engineer:** narrow patches reuse existing signal/pipeline APIs; no architectural rewrite. Distinguishes contract defects, test/environment failures and production unknowns.
- **Maintainer:** three independent diffs and minimal rationales; no automated outreach, unrelated additions or implied acceptance. Upstream review remains external.
- **Security reviewer:** local descriptor issue corrected; dependency/sandbox limitations explicit. This review is not an independent human security certification.
- **Release engineer:** pinned sources, actual red/green, manifests, cleanup and clear platform labels. Final hosted checks and release authorization remain open.
- **Hiring reviewer:** suitable for technical discussion of debugging, I/O ownership, deterministic testing and negative evidence. Existing [one-minute/five-minute walkthrough and ten questions](../docs/technical-interview-preparation.md) support interviews without inventing seniority, adoption or employment history.

The README, compact Mermaid diagram, genuine terminal transcript, single main case study and evidence links are sufficient. Existing GitHub description/topics/license are appropriate and were not changed. More tooling or cosmetic media is not a release requirement.

## Release operations and genuine blockers

`v1.0.0` is appropriate because no previous tags/releases or conflicting version convention were found. [CHANGELOG](../CHANGELOG.md) is the prepared release body; `package.json` records1.0.0 and remains private. There is no npm release.

There are two separately reviewable publication choices:

1. **Existing PR #1 presentation update:** inspect `git diff prelaunch/reproducibility-rc...showcase/presentation-rc`. After explicit approval for this exact unit only: `git push origin showcase/presentation-rc:prelaunch/reproducibility-rc`. Observe hosted checks on c9006dc. Merge requires separate approval. This does not publish the research prototype or closure package.
2. **Full portfolio candidate:** inspect `git diff origin/main...release/portfolio-rc`, including all inherited unpublished research code/evidence. After explicit approval for this larger exact branch/head only: `git push -u origin release/portfolio-rc`; separately approve creating its review PR. This does not update PR #1 or merge anything. Do not silently substitute this branch for the eleven-file presentation update.

For either route, inspect actual push/PR workflow results and exact head. A newly fixed failure creates a new head requiring validation and authorization before another push. Existing successful [push](https://github.com/phlppgdfry/storage-engineering-lab/actions/runs/40810513903) and [PR](https://github.com/phlppgdfry/storage-engineering-lab/actions/runs/40810518097) checks cover **only4f98bb5**.

After the approved full candidate has passed hosted checks and review, request separate merge authorization. The final merged SHA must be recorded and checked; do not assume a merge/squash commit is byte-identical to the reviewed head. Only after separate tag/release authorization, on that verified commit:

```sh
# Review placeholders; these commands have NOT been executed.
git tag -a v1.0.0 <verified-final-commit> -m 'Storage Engineering Lab portfolio 1.0.0'
git push origin refs/tags/v1.0.0
gh release create v1.0.0 --verify-tag --title 'Storage Engineering Lab 1.0.0' --notes-file CHANGELOG.md
```

Branch push, PR creation, merge, tag push and release creation are distinct actions requiring specific authorization. No force push, branch deletion or history rewrite is proposed. Confirm version/tag absence again immediately before release. Record tag object, commit and hosted run URLs in the closure record after actual execution.

| Priority | Remaining work |
|---|---|
| P0 release gate | Select and explicitly authorize the exact publication unit; complete required hosted checks on the full release candidate; approve merge/tag/release separately and record exact released SHA |
| P1, not standalone release-blocking | Human/upstream review and workflow approval for #1616; independent GET/fixture review; upstream advisory triage; current real-provider/DB conformance if pursuing production acceptance |
| P2 optional | Stable-host normal-upload equivalence study, improved planner corpus only for a demonstrated use case, additional provider/shutdown experiments |

No known blocking correctness defect remains in the exercised standalone scope. Further feature development is not justified for portfolio closure. Stop development after the release gates; respond to concrete upstream feedback independently. Nothing continues automatically after this session.
