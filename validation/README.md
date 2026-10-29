# Managed validation

Use the supported [reproduction guide](../docs/reproduction.md) for native, Linux, integration and optional benchmark commands. `npm run validate -- --help` lists the modes and explicit integration/benchmark opt-ins.

The old fixed-project manual Docker workflow has been replaced by a unique owned run, pinned clean source context, fixture-only configuration and verified teardown. Do not invoke the migration or benchmark entrypoints against arbitrary checkouts. They require the managed disposable Linux container.

Historical commands/results remain documented in the historical reports; they are not a current setup recipe. Current executions and limits are recorded in [quality gates](../reports/quality-gates.md).
