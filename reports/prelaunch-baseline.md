# Prelaunch baseline

Inspected on 2026-10-28, before implementation. This is a new audit, not a restatement of the previous completion report.

## Verified current state

- Lab started clean on `main`, commit `731896020e5e159a85bdf3c51413faa4955d9d6e`, tracking the same `origin/main`. No user edits were present. Local work now uses `prelaunch/reproducibility-rc`.
- Storage checkout started clean on `fix/file-upload-cancellation`, commit `3bbc971796fe9907a030c4fc70a07d440930d7b2`. Current fetched upstream master remains `b11f751abe0fdd6c7f56d3a858b5527f683b7a37`.
- [PR #1616](https://github.com/supabase/storage/pull/1616): open, draft, not merged, mergeable; one commit and two changed files. No submitted reviews or comments were returned by the current API calls. CI and Acceptance still report `action_required`.
- Host: macOS arm64, Node 24.21.0, npm 12.1.0, Git 2.56.0. Installed source tooling: Vitest 5.0.5, tsx 4.23.15, TypeScript 7.0.2, fs-xattr 0.4.0. Upstream pins npm 11.12.1.
- Lab has no runtime dependencies and only one npm command, `reproduce`. There is no lab CI, automated fast check, dependency attestation, CONTRIBUTING file or managed service lifecycle command.
- Source files, scripts, hypotheses, raw compressed results, manifests and reports were read directly. No project AGENTS.md was found in either checkout; user-supplied instructions govern this work.

## Historical results, not rerun at this baseline

The retained records report 3,306 macOS unit passes; 3,304 Linux passes and two intentional root-permission skips; 157 non-root file-test passes; 1,379 PostgreSQL 17 integration passes; five real HTTP checks; separate-agent correctness review; and 130 benchmark groups. These are preserved historical results. Fresh RC executions will be listed separately in `reports/quality-gates.md`.

The independent audit parsed the 130 retained benchmark rows, reproduced summary calculations and verified the recorded source hashes and completion-manifest artifacts. This confirms internal consistency of the evidence, not an independent rerun of those historical measurements.

## New findings

- Fixed Compose project/name plus unconditional volume teardown is not sufficiently ownership-scoped for a public developer tool.
- Ambient environment variables are inherited by test/validation processes; an externally supplied URL can override fixture configuration.
- Docker/benchmark runners assume source identity and initial state, then hardcode commit or resource metadata. Linux reverse-patch handling lacks unconditional restoration.
- Docker ignore excludes only three private env filenames; `.env.local` can enter an arbitrary build context.
- README calls Linux unverified despite later Linux evidence, and installs dependencies at an unpinned fork HEAD before testing an older pinned source.

## Uncertainty preserved

Normal-upload performance equivalence remains unproven. The timed concurrency-1 warning and unstable identical-code controls both remain evidence. No hosted-service issue, maintainer endorsement, job-readiness level or general benchmark-platform uniqueness is established.

No push, public material, PR edit/status change, maintainer contact or release is authorized for this upgrade. All changes remain local.
