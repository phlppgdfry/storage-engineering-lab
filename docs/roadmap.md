# Roadmap

The goal is a dependable local reproduction artifact with reviewable evidence. This is a priority order, not a promise that every item has passed. [Quality gates](../reports/quality-gates.md) own execution status; the [audit](../reports/audit.md) records the original findings.

| Priority | Work | Completion evidence |
|---|---|---|
| P0: safety | Give each disposable run an owned identity; refuse ambiguous cleanup; validate local fixture destinations before migrations or network operations; isolate child environments and private build inputs. | Tests of ownership, refusal paths and fixture isolation, plus an inspected disposable-run manifest and cleanup result. |
| P0: provenance | Verify the pinned source, patch, lockfile and installed dependency identity. Record actual hashes and environment instead of assuming a source variant. Restore temporary changes after failures. | Positive and deliberately mismatched-source checks, failure/restoration checks and retained manifests. |
| P1: testing and DX | Supply discoverable commands, actionable prerequisite diagnostics, fast tests/checks and a fresh-checkout recipe. Verify input handling, interruption and useful error/evidence paths. | Executed command results and first-user workflow in the current quality gates. |
| P1: evidence | Keep historical evidence immutable; validate links, registries, calculations and claim boundaries. Clearly separate RC checks from earlier suite results. | Artifact/reference checks and a reviewed final performance interpretation. |
| P1: performance uncertainty | Only pursue successful-upload equivalence with a controlled runner, exact workload replication, credible identical-code controls and a stated decision rule. | A new defensible experiment, or an explicit continued INCONCLUSIVE result. No budget or equivalence claim inferred from noisy data. |
| P2: communication | Prepare concise reader paths, contribution guidance, launch drafts and interview material. | Local review of documents against source/evidence, followed by explicit publication approval if publication is requested. |

The existing cancellation finding and production commit stay scoped. New code changes require a confirmed problem and relevant executed checks. Human maintainer review and upstream workflow approval remain external dependencies; local test success cannot satisfy them.

Do not build a universal S3 platform, dashboard/UI, custom network proxy, property-testing engine or adaptive research agent without a demonstrated need. [Existing tools](tooling-comparison.md) already cover much of that infrastructure. Do not publish an npm package merely to give this case study a release label.

The next research question should come from a concrete invariant and a feasible oracle. H002/H003 are hypotheses, not additional findings. Maintainer activity can inform scope, but the [bounded priority study](../research/maintainer-priorities.md) is neither an official roadmap nor an acceptance forecast.
