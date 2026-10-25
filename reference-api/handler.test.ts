import { describe, expect, it } from 'vitest'
import { createApiHandler } from './handler.ts'
import { parseMatches, parseRoster } from '../src/data/validate.ts'
import { buildDemoMatches, buildDemoTeams } from '../src/fixtures/demoTournament.ts'

const teams = buildDemoTeams().map((t, i) =>
  i === 0 ? { ...t, phone: '0917-000-0000', players: t.players.map((p) => ({ ...p, email: 'private@example.test' })) } : t,
)
const matches = buildDemoMatches(buildDemoTeams())
const store = { teams: async () => teams, matches: async () => matches }
const ORIGIN = 'https://qourts.github.io'

const at = (iso: string, extra: Partial<Parameters<typeof createApiHandler>[0]> = {}) =>
  createApiHandler({ store, allowedOrigins: [ORIGIN], now: () => new Date(iso), ...extra })

const get = (handler: ReturnType<typeof createApiHandler>, path: string, init: RequestInit = {}) =>
  handler(new Request(`https://api.example.test${path}`, init))

describe('reference portal API', () => {
  it('reports the phase and refuses gated data before Phase 2', async () => {
    const handler = at('2026-11-17T23:59:59+08:00')
    expect(((await (await get(handler, '/v1/status')).json()) as { phase: number }).phase).toBe(1)
    for (const path of ['/v1/roster', '/v1/matches']) {
      const response = await get(handler, path)
      expect(response.status).toBe(403)
      expect(await response.text()).not.toContain('Sample Player')
    }
  })

  it('opens roster and an unscored schedule at Philippine midnight on November 18', async () => {
    const handler = at('2026-11-18T00:00:00+08:00')
    const roster = await (await get(handler, '/v1/roster')).json()
    expect(parseRoster(roster).items).toHaveLength(160)
    const body = await (await get(handler, '/v1/matches')).json()
    const list = (body as { matches: Record<string, unknown>[] }).matches
    expect(list.every((m) => m.status === 'scheduled' && !('official' in m) && !('onCourt' in m))).toBe(true)
    expect(parseMatches(body).skipped).toBe(0)
  })

  it('adds scores and live status from November 21', async () => {
    const handler = at('2026-11-21T00:00:00+08:00')
    const list = ((await (await get(handler, '/v1/matches')).json()) as { matches: Record<string, unknown>[] }).matches
    expect(list.some((m) => m.status === 'completed' && m.official)).toBe(true)
  })

  it('never returns fields beyond ids and names', async () => {
    const text = await (await get(at('2026-11-19T10:00:00+08:00'), '/v1/roster')).text()
    expect(text).not.toMatch(/phone|email|private|0917/)
  })

  it('lets an authorized override change the reported phase either way', async () => {
    const early = at('2026-10-01T00:00:00+08:00', { phaseOverride: 2 })
    expect((await get(early, '/v1/roster')).status).toBe(200)
    const held = at('2026-11-22T00:00:00+08:00', { phaseOverride: 1 })
    expect((await get(held, '/v1/matches')).status).toBe(403)
  })

  it('is no-store, read-only and CORS-limited to allowed origins', async () => {
    const handler = at('2026-11-21T12:00:00+08:00')
    const ok = await get(handler, '/v1/status', { headers: { Origin: ORIGIN } })
    expect(ok.headers.get('Cache-Control')).toBe('no-store')
    expect(ok.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN)
    const other = await get(handler, '/v1/status', { headers: { Origin: 'https://evil.example' } })
    expect(other.headers.get('Access-Control-Allow-Origin')).toBeNull()
    expect((await get(handler, '/v1/roster', { method: 'POST' })).status).toBe(405)
    expect((await get(handler, '/v1/unknown')).status).toBe(404)
    expect((await get(handler, '/v1/status', { method: 'OPTIONS' })).status).toBe(204)
  })
})
