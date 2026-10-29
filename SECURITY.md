# Security and safe research

This repository is an independent local research fixture, not a supported production deployment. Use synthetic inputs, pinned sources and disposable local resources. Never test public services, provide cloud credentials, publish host ports or point migration/load commands at production.

For a suspected Supabase vulnerability, follow the official [Supabase Storage security policy](https://github.com/supabase/storage/blob/master/SECURITY.md). Do not open a public issue containing exploit details. For lab-tooling concerns, avoid including secrets or exploit material in public reports; use GitHub's private vulnerability reporting if enabled. No response-time or security-support guarantee is offered.

The lab has no npm dependencies. Its pinned **upstream** dependency graph has known advisories; the [audit](reports/audit.md) records their scope. It has not been certified secure. Do not silently update the historical lockfile to make an audit pass. Review/install upstream code in isolation. Image/OS vulnerability scanning and a human security review remain separate checks.

The runner uses fixture-only child environments, owned workspaces, local-daemon checks, a private runtime network and label-checked cleanup. These reduce accidental misuse; they are not a sandbox against malicious source or a compromised Docker daemon. Git/Docker retain their normal trust assumptions. Dependency lifecycle scripts execute during installation (network-disabled during the Docker rebuild step); network downloads happen beforehand.

Evidence redaction is best effort, not a secret guarantee. `evidence/local` is ignored. Inspect artifacts before publication and never publish real credentials. CI uses pinned actions and read-only repository permissions; proposed workflow execution on GitHub has not yet been observed.
