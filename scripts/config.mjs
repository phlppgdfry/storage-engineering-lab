import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const LAB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const BASELINE = '4134dbba1b94757f400d5d7c09f9382935efd726'
export const PARENT = 'b11f751abe0fdd6c7f56d3a858b5527f683b7a37'
export const FIXED = '3bbc971796fe9907a030c4fc70a07d440930d7b2'
export const FIXED_TREE = 'c33756a072ec09e39e5a7e2210b199aa5590853e'
export const LOCK_HASH = 'c39f27d1ebf8af9e0f24273889c487a4532144beb8129f321b462acabeb842ab'
export const FILE_HASHES = Object.freeze({
  original: 'b3caa1184247a76f45b7c44322580f191e12c398131ea198f215580439f5c706',
  fixed: '13aeee850cc7263a87b0fd2431a429e2360d7cd135b98ccf8ce5f1d422cfb710',
})
export const CRITICAL = Object.freeze({ vitest: '5.0.5', tsx: '4.23.15', typescript: '7.0.2', 'fs-xattr': '0.4.0' })
export const ADAPTER = 'src/storage/backend/file.ts'
