import { readFileSync } from 'node:fs'
import { parseEvidence, summarizePairedDataset } from '../scripts/evidence.mjs'

const input = process.argv[2]
if (input === '--help' && process.argv.length === 3) {
  console.log('Usage: node benchmarks/summarize.mjs <exploratory-or-timed.json[.gz]>\nValidates complete paired evidence before summarizing; does not certify performance equivalence.')
} else {
  try {
    if (!input || process.argv.length !== 3) throw new Error('Pass exactly one paired dataset path. Use --help.')
    const raw = parseEvidence(readFileSync(input), { gzip: input.endsWith('.gz'), label: input })
    const kind = raw?.design ? 'steady' : raw?.methodology?.trialDurationMs === 2000 ? 'timed' : 'exploratory'
    console.log(JSON.stringify(summarizePairedDataset(raw, { kind }), null, 2))
  } catch (error) {
    console.error(`SUMMARY FAIL: ${error.message}`)
    process.exitCode = 1
  }
}
