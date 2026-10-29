# Next milestone — execution record

Started 2026-10-29. Initial lab branch `prelaunch/reproducibility-rc`, HEAD `731896020e5e159a85bdf3c51413faa4955d9d6e`. All pre-existing RC changes preserved. Public `main` matched that HEAD; no public RC branch existed. Storage checkout clean at `3bbc971796fe9907a030c4fc70a07d440930d7b2`. Storage Doctor is outside this task and untouched.

## Outcomes and acceptance

| Outcome | Success criterion | Current evidence |
|---|---|---|
| A: publish | Own-repository reviewable PR, actual hosted fast checks observed | User authorization restored from complete local handoff; publication pending at this entry |
| B: upstream quality | Live feedback, diff, conflict and workflow review; focused next action | [Current review below](#upstream-review) |
| C: next discovery | Current source/overlap checked, executable oracle repeated and classified | H002 remains unconfirmed; investigation follows publication |
| D: research loop | One bounded local cycle, immutable evaluation, simple baselines and failure tests | Separate experimental stage; no self-improvement claim |
| E: engineering record | Concise case study, real demonstration, explicit limits | [Case study](file-upload-cancellation.md), [demo](../evidence/prelaunch/demo-terminal.txt), [interview preparation](../docs/technical-interview-preparation.md) |

## Executed now

- `npm run check`: PASS, 111 public files, 130 retained groups, one retained failed-warmup warning.
- `npm test`: 36/36 PASS, zero skipped. `git diff --check`: PASS.
- Real terminal execution via macOS `/usr/bin/script`: `node scripts/demo.mjs ../supabase-storage`, exit 0. Native one-before/one-after, exact regression red2/green5, owned cleanup PASS. Full logs retained locally under `evidence/local/reproduce-ycIxuq/`. The public transcript removes only the recorder's initial control characters and normalizes CRLF; displayed regression lines are explicitly excerpts. No invented output or video. [Transcript](../evidence/prelaunch/demo-terminal.txt).
- Curated new records inspected: 88 KiB before demo, no large artifact. A retained failure still exposed an unnecessary long host-temp path; replaced that path with a placeholder and updated its integrity entry. Historical completion evidence untouched. Token-shaped matches are intentional redaction-test fixtures, not credentials. Existing targeted scan remains scoped, not certification.
- Expensive completed Linux/integration runs were not repeated without a source-change reason. Their actual evidence and limitations remain in [quality gates](quality-gates.md).

## Upstream review

Read-only GitHub checks on 2026-10-29: [PR #1616](https://github.com/supabase/storage/pull/1616) OPEN, DRAFT, MERGEABLE, unmerged; head `3bbc9717`, base `b11f751a`; one commit and two intended files (production +8/−1, tests +125). No issue comments, reviews or inline review comments returned. Description already explains reproduction, late-abort boundary, source AbortError normalization, historical test results and unfavorable/inconclusive performance.

PR-title workflow passed. [CI](https://github.com/supabase/storage/actions/runs/40587294139) and [Acceptance](https://github.com/supabase/storage/actions/runs/40587294201) still conclude `action_required`. Check-rollup alone omits these runs, so the workflow API was also inspected. No upstream test CI success is claimed.

Current upstream master is `dcbb8eb78fd389a51ba0e6477fde0c02f6466986` (database-trigger handling). Fetch completed; `file.ts` has no intervening diff from the PR base; adapter changes concern async shutdown. No conflict-driven rebase or patch enlargement is justified. Existing related work includes merged #1615 (HEAD/delete cancellation), #1598 (shared backend shutdown) and #1510 (database leases/orphan streams). Search results are a bounded overlap check, not exhaustive proof of absence.

Recommended upstream action: keep the current focused draft, await actual maintainer feedback/workflow approval, resolve normal-upload uncertainty only with a stable controlled environment. No upstream push, edit, ready transition or maintainer message performed.

## Publication boundary

Existing handoff explicitly authorizes this lab upgrade branch, own-repository PR and CI, including the genuine demo. It excludes unsolicited social posts, upstream changes/status transitions and releases. No history rewrite or force push. New research-agent experiments will remain local and separate until scoped review; they do not gate this useful publication.

Next exact command: `npm run check`, then review staged paths, commit and push the authorized RC branch; create its own-repository PR and inspect hosted runs.
