# Additional validation

These commands are for the pinned contribution, not a general-purpose Storage deployment. They use local synthetic data and a separate Compose project. They never require real cloud credentials or touch an existing host PostgreSQL instance.

## Prepare the Linux image

Create a fresh disposable worktree at `3bbc971796fe9907a030c4fc70a07d440930d7b2` from the fork, then build with that worktree as context:

```sh
docker build -t storage-lab-linux:3bbc9717 -f /absolute/path/to/storage-engineering-lab/validation/Dockerfile /absolute/path/to/disposable-storage-worktree
```

The Dockerfile-specific ignore file excludes host dependencies, private env files, data and caches. The image installs Linux dependencies with Node 24.21.0 and npm 11.12.1. Building requires registry/network access; later experiments use that installed image.

Bind the lab read-only at `/lab` and a new local evidence directory at `/evidence`:

```sh
docker run --rm --cpus=4 --memory=3g \
  --mount type=bind,source=/absolute/path/to/storage-engineering-lab,target=/lab,readonly \
  --mount type=bind,source=/absolute/path/to/local-evidence,target=/evidence \
  storage-lab-linux:3bbc9717 node /lab/validation/linux.mjs
```

This checks native xattrs, original/fixed results, five regression cases, the full unit suite, lint and build. Scripts record actual test totals; platform or UID-dependent skips must remain visible.

The two root-permission skips were also exercised by running the complete file test file as `node`, with only the disposable container's cache/package directories made writable:

```sh
docker run --rm --cpus=2 --memory=1g storage-lab-linux:3bbc9717 sh -c 'mkdir -p .cache; chown node:node /workspace/storage /workspace/storage/node_modules .cache; su node -s /bin/sh -c "npm run test:unit -- src/storage/backend/file.test.ts"'
```

## Performance

Use the same container options and replace the final command with:

```sh
node /lab/benchmarks/run.mjs --timed
```

Run it in isolation, after build/tests finish and before starting integration services. It performs five AB/BA paired repetitions per workload, with fresh processes, 250 ms warm-up and two-second measured windows. The original fixed-count exploratory run remains separate. This is an adapter microbenchmark, not a hosted-service or durable-disk benchmark.

The diagnostic follow-up uses `node /lab/benchmarks/steady-run.mjs`: six reversed-order blocks, a constant 4 MiB destination, signal on/off and an identical-code sham control. It records the predefined warm-up criterion and effective cgroup limits. Neither benchmark establishes a cleared performance-regression gate; read `reports/performance.md` before interpreting the numbers.

## Integration services

Set three task-specific environment variables to absolute paths:

```sh
export STORAGE_SOURCE_DIR=/absolute/path/to/disposable-storage-worktree
export STORAGE_LAB_DIR=/absolute/path/to/storage-engineering-lab
export STORAGE_EVIDENCE_DIR=/absolute/path/to/local-evidence
docker compose -p storage-lab-validation -f validation/compose.yml up -d --wait --wait-timeout 180 tenant_db multitenant_db pg_bouncer multitenant_pgbouncer rustfs rustfs_setup imgproxy rest-catalog
docker compose -p storage-lab-validation -f validation/compose.yml run --rm --no-deps runner node /lab/validation/integration.mjs
```

The configuration extends upstream's existing service definitions, selects PostgreSQL 17, removes published ports and sets container memory limits. The runner points only at private Docker service names. The test seed and migrations apply only to that newly created database. The standalone HTTP check can then run with:

```sh
docker compose -p storage-lab-validation -f validation/compose.yml run --rm --no-deps runner node node_modules/tsx/dist/cli.mjs --tsconfig tsconfig.json /lab/validation/http-file.ts
```

After inspecting results, remove **only this disposable project**:

```sh
docker compose -p storage-lab-validation -f validation/compose.yml down --volumes
```

Raw logs stay in the local evidence directory. Curated summaries and limitations belong in the lab report. Do not describe a command as passing merely because it exists.
