// Local runner for the reference API (Node 22.18+/24 runs .ts directly):
//   node reference-api/serve.ts --demo                      synthetic data, for trying the site locally
//   PORTAL_DATA_FILE=./published.json node reference-api/serve.ts
//
// Environment: PORT (8787), ALLOWED_ORIGINS (comma list, default http://localhost:5173),
// PORTAL_PHASE_OVERRIDE (1|2|3), PORTAL_NOW (ISO instant, simulates the clock).
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createApiHandler, type PublishedStore } from './handler.ts'

const port = Number(process.env.PORT ?? 8787)
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173').split(',').map((o) => o.trim())
const override = Number(process.env.PORTAL_PHASE_OVERRIDE)
const simulatedNow = process.env.PORTAL_NOW ? new Date(process.env.PORTAL_NOW) : null

async function loadStore(): Promise<PublishedStore> {
  if (process.argv.includes('--demo')) {
    const { buildDemoMatches, buildDemoTeams } = await import('../src/fixtures/demoTournament.ts')
    const teams = buildDemoTeams()
    const matches = buildDemoMatches(teams)
    return { teams: async () => teams, matches: async () => matches }
  }
  const file = process.env.PORTAL_DATA_FILE
  if (!file) throw new Error('Set PORTAL_DATA_FILE to a JSON file { "teams": [], "matches": [] }, or pass --demo.')
  // Re-read on every request so Match Control exports can be swapped without a restart.
  const read = async () => JSON.parse(await readFile(file, 'utf8')) as { teams?: unknown[]; matches?: unknown[] }
  return { teams: async () => (await read()).teams ?? [], matches: async () => (await read()).matches ?? [] }
}

const handler = createApiHandler({
  store: await loadStore(),
  allowedOrigins,
  phaseOverride: override === 1 || override === 2 || override === 3 ? override : null,
  now: simulatedNow ? () => simulatedNow : undefined,
})

createServer(async (req, res) => {
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) if (typeof value === 'string') headers.set(key, value)
  try {
    const response = await handler(new Request(`http://localhost:${port}${req.url ?? '/'}`, { method: req.method, headers }))
    res.writeHead(response.status, Object.fromEntries(response.headers))
    res.end(await response.text())
  } catch (error) {
    console.error(error)
    res.writeHead(500, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    res.end('{"error":"internal_error"}')
  }
}).listen(port, () => console.log(`Reference portal API on http://localhost:${port} (allowed: ${allowedOrigins.join(', ')})`))
