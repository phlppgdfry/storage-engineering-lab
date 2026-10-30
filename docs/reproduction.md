# Reproduce the cancellation finding

Use Node **24.x**, Git and macOS or Linux. The native path requires extended attributes and native build tools for the pinned `fs-xattr` dependency. The lab itself has no npm dependencies: `npm run check` and `npm test` need no installation or network.

## Native adapter path

From the root of this lab checkout:

```sh
git clone https://github.com/phlppgdfry/storage.git ../supabase-storage
cd ../supabase-storage
git switch --detach 3bbc971796fe9907a030c4fc70a07d440930d7b2
npx --yes npm@11.12.1 ci --no-audit --no-fund
cd ../storage-engineering-lab
npm run doctor -- --checkout ../supabase-storage
npm run reproduce -- --checkout ../supabase-storage
```

Installation downloads pinned upstream dependencies and runs their install scripts. Review the upstream source and use a disposable environment. Never put real credentials or production configuration in this checkout. Existing checkouts are supported with `--checkout /absolute/path`; no reset or branch switch is performed on them. The required historical Git objects and installed dependency versions must be available. This study does not automatically follow upstream HEAD.

`doctor` is read-only. It checks the source lockfile and installed version metadata, including the native runner's critical packages; it does not authenticate every installed package byte or prove xattr support. A fresh `npm ci` provides stronger installation evidence. The actual native experiment tests xattrs.

`reproduce` creates its own detached baseline worktree, uses the verified installed dependencies, and passes only tracked sample configuration plus process essentials to children. It runs real file/xattr probes three times before and after the patch. Expected result: the five regression cases produce **2 failures/3 passes before** and **5 passes after**. The original successful upload despite an aborted signal is the expected failing baseline. It then removes only its owned temporary worktree. Your source checkout and private environment are not changed.

Useful variants:

```sh
npm run reproduce -- --help
npm run doctor -- --json
npm run reproduce -- --checkout ../supabase-storage --repeats 1 --json
npm run check
npm test
```

JSON is written to stdout, progress to stderr. npm itself may print a command banner; use `node experiments/reproduce.mjs ... --json` if piping stdout into a JSON parser. Exit zero means that command's declared checks and cleanup passed; it is not a performance or production-readiness certificate.

## Managed Linux path

Requires a running **local Unix-socket Docker daemon**, Compose supporting `!override`/`!reset` and BuildKit. Remote Docker daemons are refused. Host upstream `node_modules` is not needed for this path. Image builds download base/apt/npm dependencies; runtime containers use an internal network with no published host ports.

```sh
npm run validate -- --help
npm run validate -- --mode smoke --checkout ../supabase-storage
npm run validate -- --mode linux --checkout ../supabase-storage
npm run validate -- --mode integration --allow-integration --checkout ../supabase-storage
```

Each command builds from an owned fresh worktree at the exact proposed commit. The base/service images use digests, npm uses the pinned lock and npm 11.12.1, install lifecycle scripts run in a separate network-disabled build step. Apt packages are not pinned to a snapshot, so the image is not bit-for-bit reproducible. The container verifies tracked-file hashes, reconstructs the expected Git tree and records actual runtime/cgroup limits before testing.

- `smoke`: native Linux probes and exact regression red/green.
- `linux`: smoke, full upstream unit suite, lint and TypeScript build. Root-only permission skips remain visible.
- `integration`: seeds/migrates **new** PostgreSQL 17 databases, runs the upstream integration suite and real HTTP/file-backend checks. Requires explicit opt-in because it writes synthetic data.

Services, volumes and network have a random project name plus an ownership token. Teardown verifies labels before removing that project's resources. Only the newly tagged test image is removed; Docker build cache can remain. Do not use the old fixed-project manual commands. Container scripts fail closed outside the managed runner. Builds and services consume local disk/RAM; integration uses several service images plus a runner capped at four CPUs/3 GiB.

## Optional measurements

```sh
npm run validate -- --mode benchmark --allow-benchmark --checkout ../supabase-storage
```

This executes the timed synthetic adapter workload and consumes several minutes of CPU/disk. Run it alone. It does **not** clear the successful-upload performance gate. See [final evidence assessment](../reports/performance-final.md) before interpreting any values. The retained 130 historical groups are validated by `npm run check` without rerunning workloads.

## Evidence and teardown

Each run retains logs/summary in a new `evidence/local/<kind>-<random>/` directory, ignored by Git. It never overwrites historical public evidence. Failures preserve diagnostics and return nonzero. Cleanup errors also fail the command; inspect the ownership marker, project and labels before any manual action. Do not issue a broad `docker system prune`, fixed-project `down --volumes`, or delete a path copied from an untrusted log.

[Quality gates](../reports/quality-gates.md) distinguish fresh executions from historical results. [Troubleshooting](troubleshooting.md) covers prerequisites and diagnostics.

## Short terminal demonstration

After the native prerequisites above, run `node scripts/demo.mjs ../supabase-storage`. It executes the real reproducer with one native repetition per variant, shows native observations, the actual applied patch and labelled excerpts from actual regression logs. Full logs stay local. The [recorded terminal transcript](../evidence/prelaunch/demo-terminal.txt) was captured on 2026-10-29 using macOS `script`; it is actual output, not a video. To record again on macOS: `script -q evidence/local/demo.raw node scripts/demo.mjs ../supabase-storage`. Inspect output before sharing.

## Verified public quickstart and local HTTP follow-up

A fresh public clone of review branch `prelaunch/reproducibility-rc` at `4f98bb5` passed check, 36 tests, doctor and the real native demo on macOS arm64/Node 24.22.2: [execution record](../evidence/showcase/public-quickstart.json). Native dependencies were reused from the pinned prepared Storage checkout; no fresh native install is claimed. The README names this branch because public main does not yet include the new CLI/scripts.

The following commands are **local research-branch experiments**, absent from the published PR#1 branch. They require the same prepared checkout plus the recorded current-upstream commit object. They create a loopback-only server, use synthetic 16 MiB objects and cap each worker at30seconds, three repetitions. Full auth/database/CDN behavior is excluded.

```sh
node scripts/download-probe.mjs --http ../supabase-storage
node scripts/download-probe.mjs --http --intervention ../supabase-storage
```

The second command applies only the diagnostic MD5 signal-forwarding patch in its own detached worktree. Neither command edits your checkout or publishes anything. Expected original result: abort before headers while the MD5 stream still reads the entire object. Expected intervention: MD5 stops early. Both variants require successful full GET, partial full/range disconnect cleanup, actual HEAD abort rejection and closed descriptors. A late disconnect, failed control or cleanup error returns failure; do not treat infrastructure failure as confirmation. [Observations, controls and interpretation](../reports/showcase-review.md).

The older `scripts/download-probe.mjs` intentionally retains its historical `dcbb8eb7` source/dependency study; it does not follow current upstream. For the separately validated Node26/9d15cdc9 candidate, exact patches, failed baseline tests and reproduction commands, use [the advanced engineering report](../reports/advanced-engineering.md).
