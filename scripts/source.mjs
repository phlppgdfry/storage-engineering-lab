import { lstatSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { ADAPTER, FILE_HASHES, FIXED, FIXED_TREE, LOCK_HASH } from './config.mjs'
import { assertOwned, git, hash } from './runtime.mjs'

export function prepareSource(checkout, owner) {
  assertOwned(owner)
  const root = path.join(owner.temporary, 'source')
  git(checkout, ['cat-file', '-e', `${FIXED}^{commit}`])
  git(checkout, ['worktree', 'add', '--detach', root, FIXED])
  try {
    if (git(root, ['rev-parse', 'HEAD^{tree}']).trim() !== FIXED_TREE) throw new Error('Unexpected pinned tree identity.')
    const files = git(root, ['ls-files', '-z']).split('\0').filter(Boolean).map(name => {
      if (name.startsWith('/') || name.split('/').includes('..') || /[\r\n\0]/.test(name)) throw new Error('Unsafe tracked source path.')
      const stat = lstatSync(path.join(root, name))
      if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Unsupported non-regular pinned file: ${name}`)
      return { path: name, sha256: hash(readFileSync(path.join(root, name))), mode: stat.mode & 0o111 ? '100755' : '100644' }
    })
    if (hash(readFileSync(path.join(root, 'package-lock.json'))) !== LOCK_HASH || hash(readFileSync(path.join(root, ADAPTER))) !== FILE_HASHES.fixed) throw new Error('Pinned checkout content differs from the study; check checkout filters/configuration.')
    const identity = { schema: 1, commit: FIXED, tree: FIXED_TREE, lockSha256: LOCK_HASH, files,
      adapterSha256: hash(readFileSync(path.join(root, ADAPTER))) }
    writeFileSync(path.join(root, '.storage-lab-source.json'), JSON.stringify(identity, null, 2) + '\n', { flag: 'wx' })
    writeFileSync(path.join(owner.evidence, 'source.json'), JSON.stringify(identity, null, 2) + '\n')
    return root
  } catch (error) {
    git(checkout, ['worktree', 'remove', '--force', root])
    throw error
  }
}
