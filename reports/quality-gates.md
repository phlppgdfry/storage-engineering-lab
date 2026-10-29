# Quality gates and dated execution evidence

**Latest checked 2026-10-29:** public PR#1 fast CI and fresh public-clone quickstart PASS; local prototype tests44/44 PASS; HTTP original/intervention controls and intentional SIGINT cleanup PASS. The old tables below describe their recorded executions, not current reruns. [Current review](showcase-review.md) contains interpretation and remaining gates.

Date: 2026-10-28. Local branch `prelaunch/reproducibility-rc`, based on lab `731896020e5e159a85bdf3c51413faa4955d9d6e`. Production patch remains `3bbc971796fe9907a030c4fc70a07d440930d7b2`. Publication updates and newly executed checks are tracked in [the milestone log](next-level.md). The table below records the 2026-10-28 candidate executions. Historical evidence is preserved separately.

## Fresh executed checks

| Command / check | Actual result | Evidence / limit |
|---|---|---|
| `node --test test/*.test.mjs` | **36 passed, 0 failed, 0 skipped** | [Fast test log](../evidence/prelaunch/fast-tests.log); ownership, environment, process-tree termination, ENOSPC, log collision/redaction, daemon precedence/refusal, source-import cleanup, long IPC paths, malformed measurements and registry invariants. Separate reviewer also reran the suite; see its report for that execution. |
| `node scripts/check.mjs --json` | PASS, all 130 retained measured groups/five hypotheses; one intentionally retained unstable-warmup warning | [Offline check](../evidence/prelaunch/offline-check.json). Validates public JSON/gzip, source hashes, arithmetic, summary equality, artifact integrity, local file links and JavaScript syntax. It is not TypeScript typechecking of lab workers or a benchmark rerun. |
| Fresh local candidate export: check → tests → doctor → native | **PASS**, all four commands exit0; owned export removed | [Export record](../evidence/prelaunch/fresh-export.json). This is an export of the unpublished local candidate, not a clone of a published RC. Host upstream installed dependencies are reused and metadata-verified. |
| Native reproduction in that export, `--repeats 3` | **PASS**, three before/after native observations; exact 2 fail/3 pass before, 5 pass after | [Native summary](../evidence/prelaunch/native.json), [red](../evidence/prelaunch/regression-red.log), [green](../evidence/prelaunch/regression-green.log). Real files/xattrs; regression tests use upstream's xattr mock. |
| `npm run validate -- --mode linux --checkout …` | **PASS**, including cleanup | [Wrapper](../evidence/prelaunch/linux-runner.json), [Linux summary](../evidence/prelaunch/linux.json). Fresh pinned image/dependencies, actual 816-file reconstructed source tree; three native probes each variant; exact red 2/green 5; **3,304 unit passes, 2 root-permission skips**, lint and build pass. |
| `npm run validate -- --mode integration --allow-integration --checkout …` | **PASS**, including cleanup | [Wrapper](../evidence/prelaunch/integration-runner.json), [suite](../evidence/prelaunch/integration.json), [HTTP](../evidence/prelaunch/http.json). New PostgreSQL17 databases, migrations/seed, **1,379 tests/57 files**, five actual HTTP/file checks. |
| `npm audit --package-lock-only --ignore-scripts --json` on pinned upstream | COMPLETED, expected nonzero advisory result | [Audit record](../evidence/prelaunch/dependency-audit.json):24 affected upstream packages, 13 high/11 moderate/0 critical. Not24 unique CVEs; exploitability not evaluated. Lab itself has no npm dependencies. |
| Targeted current/history secret scan | No high-confidence matches | [Scan](../evidence/prelaunch/secret-scan.json); GitHub/OpenAI token/private-key patterns, public files and four locally available lab commits, gzip included. Not exhaustive certification; sample JWTs/fixture credentials intentional. |
| `git diff --check`; upstream working-tree check | PASS; upstream remains clean at3bbc9717 | No upstream patch modifications, pushes, PR edits, contacts or releases. No unrelated host database/container was stopped. |

The Linux image uses Node 24.21.0/npm 11.12.1 on Linux arm64 with observed `cpu.max=400000 100000`, `memory.max=3221225472`. This is a quota, not exclusive CPUs. Dependencies are fetched from the pinned lock without online lifecycle execution, then rebuilt with network disabled. Base/service image digests are pinned; apt versions are not snapshot-pinned and bit-for-bit image identity is not promised. Native macOS also uses Node 24.21.0. Other architectures/platforms/runtime versions remain unverified.

The integration HTTP test disconnects after observing at least 64 KiB in a real staging file, requires cleanup, then retrieves the previous payload. It is regression assurance; no parent-version HTTP red run establishes that this exact endpoint scenario failed previously. The standard integration suite includes mocks in some cases; it is not a complete cloud-service conformance run.

## Failed attempts retained and corrected

[Failure records](../evidence/prelaunch/retained-failures.json) preserve these genuine failures; later passes do not erase them:

1. Native execution inside the restricted agent sandbox failed at the TypeScript IPC socket (`listen EPERM`). Own worktree cleanup passed; permitted local execution subsequently passed.
2. Initial managed Docker run failed because sanitizing captured Compose JSON changed its synthetic database password. The runner now has explicit internal raw fixture capture with separately sanitized logs; a dedicated regression test covers it.
3. The second Linux command passed native/regression/fullunit checks, then lint failed only on compact generated provenance JSON. The source-manifest writer now uses formatted JSON; the final complete Linux command passes lint and build too.
4. The first nested fresh export passed check/tests/doctor, then native failed with a long Unix-socket path (`listen EINVAL`). Owned workspaces now use the short canonical system-temp root, independent of nested `TMPDIR`; a regression test and actual repeated export both pass.

Independent review additionally drove tests/fixes for marker symlinks, split-output credential redaction, evidence collisions, TERM-resistant grandchildren, mid-run evidence-write errors and premature daemon cleanup after remote refusal. Original failing cases and resolved observations are described in [final review](prelaunch-final-review.md).

## Remaining gates as recorded2026-10-28 (publication status superseded above)

- **Performance: INSUFFICIENT EVIDENCE.** [Final assessment](performance-final.md) independently verifies all 130 retained groups and preserves the unfavorable4MiB/c1 observation. No new broad benchmark was run on the same noisy environment. Functional correctness does not clear equivalence/no-regression.
- **Upstream:** PR 1616 remains open/draft/unmerged; head 3bbc9717/base b11f751a, no returned comments/reviews. CI/Acceptance require maintainer approval. Local tests do not satisfy this external gate.
- **Review:** Separate-agent review and executed test evidence exist; no human/different-model review is claimed. [Final review](prelaunch-final-review.md) states exactly what its reviewer ran or inspected.
- **CI/release:** The new full-SHA-pinned/read-only fast workflow has passed its commands locally; it has not run on GitHub because changes have not been pushed. No package/release automation or publication was executed.
- **Security:** Existing upstream advisories, image/OS scanning and human security review remain separate risks. The supported scope is disposable synthetic local research, not production deployment. Logs need review before sharing.
- **Coverage:** Non-root Linux 157/157, prior macOS 3306, previous independent broad 3,308 passes/two ECS timing failures and isolated 8/8 retry remain historical, not fresh RC results. No complete PostgreSQL/version/platform matrix is claimed.

Curated records and their integrity hashes are in the [prelaunch manifest](../evidence/prelaunch/manifest.json). Full new raw logs remain under ignored `evidence/local/`; historical [completion artifacts](../evidence/completion/manifest.json) are unchanged. Curating paths/records is not an independent attestation of execution. [Readiness](release-readiness.md) owns the scoped decision.

## 2026-10-29 publication and separate local extension

The published RC fast GitHub workflows passed on commits `11da683` and `4f98bb5`; [execution record](next-level.md) links actual runs. The native terminal demo independently reran expected red2/green5 with actual files/xattrs and cleanup.

The separate local `research/bounded-cycle` extension passes **43/43** tests: [actual log](../evidence/next-level/tests.log). [Offline result](../evidence/next-level/check.json) validates all 130 retained groups and the updated H002 registry. The file count is the exact snapshot at execution, before copying these last curated records. No expensive Linux/PostgreSQL rerun or remote CI for the experimental extension is claimed. Its native H002 observations, negative adaptive evaluation and reliability limits are in [the milestone report](next-level.md).

## Showcase review executions

[44-test log](../evidence/showcase/tests.log), [public quickstart](../evidence/showcase/public-quickstart.json), [original HTTP](../evidence/showcase/http-original.json), [diagnostic HTTP](../evidence/showcase/http-intervention.json), [interruption](../evidence/showcase/interruption.json), [planner matrix](../evidence/showcase/evaluation.json), [manifest](../evidence/showcase/manifest.json). The interrupted run is intentionally FAIL/exit1 with cleanupPASS, not a successful functional experiment. All six probe rankings have the same effectiveness score; this corpus cannot distinguish planner benefit.
