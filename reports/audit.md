# Prelaunch audit and prioritized work

Baseline: `7318960`. Findings refer to the inspected initial implementation; corrections and executed checks will be appended here and in `quality-gates.md`. Independent notes: `prelaunch-review-notes.md`.

| Priority / severity | Evidence and affected files | Action and value |
|---|---|---|
| P0 / HIGH | Fixed project/name and `down --volumes` in `validation/compose.yml` and its README; no per-run ownership proof. | Own a unique run identity and refuse ambiguous cleanup. Prevent accidental reuse/deletion. |
| P0 / HIGH | `...process.env` in reproduction, Linux/integration runners and benchmarks. | Allowlist process essentials and use only tracked fixture settings; refuse non-lab DB/S3 destinations before migrations or HTTP operations. |
| P0 / MEDIUM | Hardcoded source and initial variant in Docker/Linux/benchmark runners. Dependencies reused from arbitrary HEAD. | Verify pinned tracked content, lockfile and installed versions; record actual file hashes and resource limits. Fail closed on mismatch. |
| P0 / MEDIUM | `COPY . .` with incomplete private-env exclusion. | Build from an owned clean pinned context; ignore all private env variants while preserving tracked samples. |
| P1 / MEDIUM | Unrestored reverse patch, weak cleanup exit handling, buffered long-command output. | Restore in finally, report cleanup failure, handle interruption and emit progress/evidence paths. |
| P1 / MEDIUM | No fast tests/CI or input-validation tests; summary parser accepts malformed experimental structure. | Built-in Node tests for real safety/measurement invariants, artifact/link/registry checks and inexpensive CI. |
| P1 / LOW | Missing --help/doctor, stack traces before prerequisites, stale README and incomplete fresh-checkout recipe. | Dependency-free command discovery, actionable diagnostics and verified first-user workflow. |
| P1 / MEDIUM | Normal performance attribution not established; statistical/diagnostic controls fail. | Preserve all data, verify conclusions independently, stop claims of equivalence. Final report may be inconclusive. |
| P1 / LOW | Ad-hoc registry states and no mechanically verified evidence references. | Normalize statuses, source/evidence fields and next-action gates; use a modest deterministic feedback loop. |
| P2 / LOW | Scattered documentation and public-launch material missing. | Three-reader navigation, architecture/lifecycle diagrams, factual launch/interview drafts. |
| REJECT | Universal S3/chaos platform, website, heavy CLI framework, automatic AI research/scoring and npm release. | No established user need; reuse existing tools and keep maintenance small. |

## Implementation boundary

The lab and upstream patch remain separate. No upstream correctness blocker has been independently established, so there is no justification for expanding the two-file production change. Source changes would require evidence and separate local validation before a future push approval.

No major dependency upgrades, public release or expensive external benchmark is planned. Native/Docker checks use synthetic local data and explicit commands. Historical evidence is immutable; new results receive new local evidence directories.

## Implemented dispositions

P0 work is implemented in the local runner: random owned workspace/project, source-only build context, private Compose runtime, fixture-only child environments, pinned lock/source checks and reconstructed container Git tree. Container migration/HTTP paths refuse remote configuration before imports/operations. The Docker CLI retains the user's selected local context but freezes its effective socket after checking precedence. Cleanup inspects ownership labels and refuses mismatches; source reversal is restored in finally. A failed cleanup is nonzero.

Independent tests found and drove corrections for ownership-marker symlinks, chunk-split redaction, evidence-file collisions, orphan subprocesses, callback write failures and rejected-remote cleanup. A first real Docker run exposed redaction modifying machine-readable fixture JSON; internal opt-in raw capture preserves configuration while evidence logs remain redacted. A second run exposed the generated compact provenance manifest being picked up by upstream lint; the manifest formatting was corrected. Both failed runs remain retained.

P1 work adds dependency-free CLI help/doctor, explicit integration/benchmark opt-ins, strict evidence/summary/registry validation, tests and pinned/read-only fast CI. Historical hypothesis fields and evidence remain preserved. The simple next-experiment policy has a fixed priority/ID baseline; no evidence justifies adaptive research automation, a universal test platform or a graphical UI. P2 adds reader paths, architecture, contribution/security guidance and unpublished launch/interview material. Exact executed checks and open outcomes live in [quality gates](quality-gates.md).

## Dependency and supply-chain scope

Read-only `npm audit --package-lock-only --ignore-scripts --json` completed on the pinned upstream lock: **24 affected packages: 13 high, 11 moderate, 0 critical**. The nonzero result is retained at `evidence/local/prelaunch-upstream-audit.json`. This counts affected packages, not unique CVEs. Reported paths are not all development-only. Examples: [busboy advisory](https://github.com/advisories/GHSA-xjh9-v7x6-24jw), [grpc-js advisory](https://github.com/advisories/GHSA-m9gg-hp2v-232j), [undici advisory](https://github.com/advisories/GHSA-8xcm-r25x-g524). They are existing upstream dependencies, not introduced by the two-file patch; exploitability was not assessed. The lab has no npm dependencies. Do not upgrade historical dependencies merely to alter the study or conceal an audit result.

Container base and fixture services use recorded immutable image digests. Apt packages are not snapshot-pinned; bit-for-bit image reproduction is not claimed. Dependency lifecycle execution is separated from fetching and runs with build network disabled, but third-party code still executes. Actions are full-SHA pinned with contents:read and no persisted checkout credentials. There is no release/publish workflow. Image/OS advisory scanning and human security review were not performed.

A targeted scan covered96 current public files and all 4 locally available lab commits, including compressed artifacts, for high-confidence GitHub/OpenAI token and private-key patterns: no matches. It is not exhaustive secret certification; fixture JWTs/public synthetic credentials are intentional. Runtime logs use best-effort URL/token/Authorization redaction; logs remain local and require review before sharing.

## Remaining acceptance boundaries

The cancellation patch has no identified blocking correctness defect in the performed reviews. Source-generated `AbortError` classification changes even without a signal and is explicitly disclosed; late abort after body completion remains allowed to finish metadata/publication. Human upstream review, actual GitHub workflow execution and performance equivalence are separate outstanding gates. The favorable cancellation source-byte count is not physical I/O or a production saving. [Performance-final](performance-final.md) preserves the unfavorable successful-upload observation and inconclusive attribution.
