// Fails the build if anything that must never be public ended up in dist/.
//  - the synthetic demo fixtures (they contain FIXTURE_MARKER)
//  - roster / bracket style data files
// Unreleased tournament data must be served by the portal API, never bundled into the site.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST = fileURLToPath(new URL('../dist', import.meta.url))
const FORBIDDEN_TEXT = ['ECHELON_SYNTHETIC_FIXTURE_DO_NOT_SHIP', 'Sample Player 0', 'createFixtureSource', 'buildDemoTeams']
// The site ships no data or source-map files, so any such file in the build is suspect.
const FORBIDDEN_FILE = /\.(json|csv|xlsx?|map)$/i
const TEXT_FILE = /\.(js|mjs|css|html|json|txt|map|svg|webmanifest)$/i

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

const problems = []
for (const file of walk(DIST)) {
  if (FORBIDDEN_FILE.test(file)) problems.push(`Data-like file in build output: ${file}`)
  if (!TEXT_FILE.test(file)) continue
  const content = readFileSync(file, 'utf8')
  for (const needle of FORBIDDEN_TEXT) {
    if (content.includes(needle)) problems.push(`"${needle}" found in ${file}`)
  }
}

if (problems.length > 0) {
  console.error('dist check failed:\n  ' + problems.join('\n  '))
  process.exit(1)
}
console.log('dist check passed: no demo fixtures or data files in the build output.')
