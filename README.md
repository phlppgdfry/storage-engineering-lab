# Storage Engineering Lab

A focused investigation of upload cancellation in the Supabase Storage filesystem backend, with a native reproducer, a small proposed fix and regression tests.

Independent contributor research. This does not establish an issue in Supabase's hosted service or imply maintainer endorsement.

**Upstream contribution:** [supabase/storage#1616](https://github.com/supabase/storage/pull/1616), open as a draft. Local validation passed; GitHub CI currently reports `action_required`. No merge or maintainer approval is claimed.

## Result

At baseline `4134dbba1b94757f400d5d7c09f9382935efd726`, `FileBackend.uploadObject` accepts an `AbortSignal` but does not use it.

| Experiment | Baseline | Proposed fix |
|---|---|---|
| Already-aborted signal | Upload succeeds and publishes bytes | Rejects `Aborted`; no file created |
| Abort active transfer | Source remains live; upload succeeds | Source destroyed; rejects `AbortedTerminate` |
| Existing destination during cancellation | Replaced by continued transfer | Original bytes preserved |
| Staging cleanup | No leftover staging file | No leftover staging file |

The native experiment uses real files, real extended attributes and the actual adapter. Both outcomes were reproduced three times. The regression suite has two failures before the fix and five passes after it.

The overwrite case tests an adapter invariant. Higher-level operations normally allocate a new version; this is **not evidence of user-object corruption through an HTTP endpoint**.

## Reproduce

Requirements: Node 24+, Git, installed upstream dependencies and a filesystem with extended-attribute support. Tested on macOS arm64; Linux is unverified.

For a fresh sibling checkout:

```sh
git clone https://github.com/phlppgdfry/storage.git ../supabase-storage
cd ../supabase-storage
npx --yes npm@11.12.1 ci --no-audit --no-fund
cd ../storage-engineering-lab
npm run reproduce
```

Or use `npm run reproduce -- /absolute/path/to/supabase-storage`.

The command creates a disposable worktree at the pinned baseline, reuses dependencies, runs native checks three times, applies regression tests, verifies exactly two failures, applies the fix and verifies native results plus five passing tests. It removes its own worktree and leaves the contributor's checkout untouched. Detailed evidence goes to `evidence/local/`.

The reproducer itself requires no cloud account, Docker, production traffic or dependency downloads. In a restricted agent sandbox, the TypeScript runner may need permission for its local IPC socket.

## Evidence

- [Case study](reports/file-upload-cancellation.md), [reproduction summary](evidence/reproduction-summary.json).
- [Failing tests](evidence/upload-cancellation-red.log), [passing tests](evidence/upload-cancellation-green.log).
- [Native probe](experiments/file-upload-cancellation.ts), [production patch](experiments/fix.patch), [regression patch](experiments/regression.patch).
- [Architecture](research/architecture.md), [hypotheses](research/hypotheses.json), [decisions](research/decision-log.md), [status](research/status.md).
- [Prepared upstream PR](contributions/pr-description.md).

## Scope

Upstream: [supabase/storage](https://github.com/supabase/storage). Fork: [phlppgdfry/storage](https://github.com/phlppgdfry/storage).

Related refactor [#854](https://github.com/supabase/storage/pull/854) was inspected at its fetched head; its file-upload pipeline does not apply the signal. Recent [#1615](https://github.com/supabase/storage/pull/1615) concerns HEAD and deletion. Bounded searches do not prove uniqueness.

No performance improvement, production severity or maintainer acceptance is claimed. Critical self-review is documented; independent maintainer review remains separate. Security findings follow upstream's [policy](https://github.com/supabase/storage/blob/master/SECURITY.md).

Apache-2.0; patches derive from Supabase Storage. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
