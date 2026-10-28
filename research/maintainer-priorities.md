# Maintainer priorities: bounded evidence, not an acceptance prediction

This analysis uses 100 public PRs most recently updated when collected, plus seven selected discussions. It is not a random sample, a twelve-month census, an official roadmap, or an estimate of the chance that our PR will be accepted. Raw public responses are retained locally in `evidence/local/completion/`.

## What the sample actually contains

Of the 100 recently updated PRs: 70 were merged, 23 open and 7 closed without a merge. Do **not** read this as a 70% acceptance rate: selection by update time, member-authored work, dependency bots and unfinished proposals strongly bias it.

The seven discussions were selected to cover our exact area, a related cancellation fix, a small testing improvement, a large refactor, an active database correctness change and a closed overlapping proposal. Automated review comments were separated from human member comments. A bot's opinion is not treated as a maintainer priority.

## Explicit human feedback

| Evidence | Verified observation | Consequence for our work |
|---|---|---|
| [#1600: transaction placement](https://github.com/supabase/storage/pull/1600#discussion_r4362892418) | A member asks for logic to run inside the query boundary so rollback includes all changes. | Show where transfer, staging and publication become complete; explain late-abort behavior. |
| [#1600: privileges and side effects](https://github.com/supabase/storage/pull/1600#discussion_r4393120837) | A member objects to privileged probing because it can misclassify behavior and have side effects; suggests a same-role approach. | Preserve authorization and transaction behavior. Do not add a privileged workaround for this file fix. |
| [#1600: reuse error definitions](https://github.com/supabase/storage/pull/1600#discussion_r4362781911) | A member prefers an existing error that S3 clients understand rather than extra custom errors. | Reuse existing `Aborted`/`AbortedTerminate` conventions and document their compatibility nuance. |
| [#854: scope](https://github.com/supabase/storage/pull/854#discussion_r2798690839) | A member points out a change unrelated to the diff. | Keep the upstream contribution to the two relevant files; keep the research harness in the separate lab. |
| [#854: regression coverage](https://github.com/supabase/storage/pull/854#discussion_r2798082052) | A member tracks a discovered issue for resolution with a test. | Bring failing-before/passing-after evidence, not only code inspection. |
| [#1553: planned overlap](https://github.com/supabase/storage/pull/1553#issuecomment-6425675589) | A member closes a partial versioning proposal in favor of a fuller implementation already being worked on. | Recheck planned work. Novel code is not automatically a wanted contribution. |

## Inferred priorities from actual merged work

These are inferences from the accepted changes, not explicit promises to contributors:

- [#1462](https://github.com/supabase/storage/pull/1462): S3 metadata correctness; two changed files.
- [#1470](https://github.com/supabase/storage/pull/1470): cancellation cleanup across traced upload streams; three changed files.
- [#1520](https://github.com/supabase/storage/pull/1520): staged file publication; two changed files. Our patch builds on that existing architecture.
- [#1599](https://github.com/supabase/storage/pull/1599): waiting for file streams before fixture cleanup; one file, two insertions. Small test reliability work can be accepted.
- [#1615](https://github.com/supabase/storage/pull/1615): HEAD cancellation and per-key file deletion behavior.

Together these support choosing a focused lifecycle/correctness contribution. They do not establish production severity, acceptance probability or the cause of any PR's review duration. Large refactor #854 is still open; its size alone does not prove why.

## Fit of #1616 and concrete next actions

Our contribution has a narrow diff, native reproduction, red/green regression tests, existing error conventions and no database/authorization change. Its limited file-backend scope and unproven hosted impact should remain explicit.

1. Finish independent, Linux, integration and measured-overhead validation before treating the draft as fully prepared.
2. Keep the existing draft PR and supply concise evidence in its description; do not open a competing issue or request multiple reviewers automatically.
3. Record upstream CI as `action_required` until it actually runs. Only repository maintainers can resolve their workflow approval policy.
4. Respond to substantive feedback with targeted changes and executed tests; do not equate another AI's approval with maintainer acceptance.
5. After feedback, select one next research question by actual impact and verification cost. No benefit is established for creating a larger PR merely to attract attention.

No maintainer was contacted for this analysis. No GitHub comments or reviews were posted.
