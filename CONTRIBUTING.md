# Contributing

Start with [reproduction](docs/reproduction.md), the [architecture](docs/architecture.md) and [roadmap](docs/roadmap.md). Keep the scope focused on verifiable cancellation behavior and reusable evidence. No real cloud account is required.

Before proposing work, check upstream issues/PRs and distinguish hypotheses from reproduced defects. Record source revisions, exact commands, environment, failing criteria and limitations. Use deterministic regression tests for a documented risk; avoid raising test counts through redundant cases. Keep lab tooling separate from the upstream production patch.

Run `npm run check` and `npm test` with Node 24. New native/container behavior needs the relevant reproduction too. Preserve failed runs and immutable historical data. Update the registry and decision log when evidence changes. Public conclusions must match executed results; local benchmarks do not establish production impact.

Do not submit secrets, private logs or vulnerability details. See [security](SECURITY.md). Discuss substantial changes before implementing a framework, interface or broad protocol suite. This repository does not endorse automatic issue/PR generation or contacting maintainers without review.

Apache-2.0 applies; preserve upstream attribution and NOTICE for derived patches. The [portfolio release checklist](reports/final-project-closure.md) separates branch publication, hosted checks, merge, tag and release approvals. The package remains private; no npm publication is intended.
