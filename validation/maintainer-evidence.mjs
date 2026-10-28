import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'

// Read public evidence only; never create GitHub issues, comments, or reviews.
const output = new URL('../evidence/local/completion/', import.meta.url)
mkdirSync(output, { recursive: true })
const numbers = [1462, 1520, 1470, 1553, 1600, 854, 1599]
const records = []
for (const number of numbers) {
  const record = { number, url: `https://github.com/supabase/storage/pull/${number}` }
  for (const [name, route] of [
    ['pr', `pulls/${number}`], ['reviews', `pulls/${number}/reviews?per_page=100`],
    ['comments', `issues/${number}/comments?per_page=100`],
    ['inline', `pulls/${number}/comments?per_page=100`],
  ]) {
    const result = spawnSync('gh', ['api', `repos/supabase/storage/${route}`], {
      encoding: 'utf8', timeout: 30_000, maxBuffer: 8 * 1024 * 1024,
    })
    if (result.status !== 0) throw new Error(`${number}/${name}: ${result.stderr}`)
    record[name] = JSON.parse(result.stdout)
  }
  records.push(record)
}
writeFileSync(new URL('maintainer-discussions.json', output), JSON.stringify({
  collectedAt: new Date().toISOString(), scope: 'Seven purposively selected public PR discussions; first 100 entries per endpoint.', records,
}, null, 2) + '\n')
console.log(`Collected ${records.length} PR discussions; raw public evidence saved locally.`)
