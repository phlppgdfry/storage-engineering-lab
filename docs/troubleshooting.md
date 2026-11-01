# Troubleshooting

| Symptom | Meaning and next action |
|---|---|
| Unsupported Node/runtime | Select Node 24.x on macOS/Linux. Windows and other runtime versions are not validated. |
| Missing checkout/object | Clone the fork and check out the exact commit in [reproduction](reproduction.md); pass its root with `--checkout`. Existing checkout changes are preserved. |
| Lockfile/version drift | Install the study's pinned revision with npm 11.12.1 `ci` in a disposable checkout. Do not overwrite an existing project's dependencies blindly. |
| Native xattr/build failure | Inspect the native log; install OS build prerequisites or use managed Linux. A metadata-only doctor pass does not prove native support. |
| IPC socket denied by agent sandbox | Permit the local TypeScript runner's IPC socket in that execution environment; it is not a cloud credential request. |
| Docker socket/context failure | Start your local Docker daemon and select its local context explicitly. Remote endpoints are refused; credentials are not copied between services. |
| Compose tag error | Use a Compose version supporting `!override` and `!reset`; check `docker compose version`. |
| Source tree mismatch | Do not bypass the check. Recreate the pinned context; inspect source filters and the retained source manifest. |
| Unexpected endpoint/disposable guard | Use `npm run validate`. Direct container/migration invocation and external DB/S3 destinations are unsupported. |
| Integration opt-in required | Add `--allow-integration` only for the managed disposable fixture. Never supply production URLs. |
| Expected red regression exit | The runner explicitly requires 2 failures/3 passes before the patch; different failures fail the run. |
| Unit suite timing failure | Preserve the failure. A focused retry can diagnose it but cannot retroactively turn the broad failed run into a pass. Historical ECS timing failures are disclosed in the records. |
| Timeout or interrupt | Child groups are terminated with bounded escalation. Inspect run summary and cleanup outcome; do not infer success from partial output. |
| Cleanup owner mismatch | The tool intentionally stops rather than deleting ambiguous resources. Inspect the retained owner/project/labels manually. |
| Evidence write/collision | A new run needs a new writable evidence directory. Previous evidence is not overwritten. Free local disk and retry; retain the failed summary. |
| Benchmark fluctuates | Read [performance-final](../reports/performance-final.md). Identical-code noise prevents causal attribution; do not select favorable runs. |
| Upstream GitHub CI `action_required` | Maintainer workflow approval is separate from local checks. No upstream CI pass or maintainer acceptance is claimed. |

Commands emit progress on stderr and summaries on stdout. Logs are best-effort sanitized for recognizable tokens and URL/Authorization credentials; this is not comprehensive data-loss prevention. Use synthetic data only, review artifacts before sharing, and never commit `evidence/local` wholesale.
