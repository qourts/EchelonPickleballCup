import type { Phase } from '../src/config/publication.ts'
import { phaseAt } from '../src/domain/publication.ts'

/**
 * Reference implementation of the portal API described in docs/INTEGRATION.md.
 *
 * It is a plain `Request -> Response` handler (Cloudflare Workers, Deno, Bun, Node 18+ via
 * serve.ts). The only Qourts-specific part is `PublishedStore`: implement it on top of Match
 * Control and nothing else needs to change. This file is NOT part of the website bundle.
 */
export interface PublishedStore {
  /** Teams with players. Return names only; extra fields are dropped anyway. */
  teams(): Promise<readonly unknown[]>
  /** Matches including scores. Scores are removed here until Phase 3. */
  matches(): Promise<readonly unknown[]>
}

export interface ApiOptions {
  readonly store: PublishedStore
  /** Browser origins allowed to read the API, e.g. ["https://qourts.github.io"]. */
  readonly allowedOrigins: readonly string[]
  /** Authorized Qourts override: forces the reported phase. */
  readonly phaseOverride?: Phase | null
  readonly now?: () => Date
}

type Json = Record<string, unknown>
const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value)

function pick(source: Json, keys: readonly string[]): Json {
  const out: Json = {}
  for (const key of keys) if (source[key] !== undefined) out[key] = source[key]
  return out
}

const TEAM_FIELDS = ['id', 'category', 'division', 'bracket', 'slot'] as const
const MATCH_FIELDS = [
  'id', 'stage', 'category', 'division', 'bracket', 'round', 'semifinalIndex', 'tiebreakerKey',
  'court', 'startsAt', 'teamAId', 'teamBId', 'labelA', 'labelB',
] as const
const SCORE_FIELDS = ['status', 'onCourt', 'official', 'capReached'] as const

/** Public projection of a team: never anything beyond ids and player names. */
export function publicTeam(raw: unknown): Json | null {
  if (!isObject(raw)) return null
  const players = Array.isArray(raw.players)
    ? raw.players.filter(isObject).map((p) => pick(p, ['id', 'name']))
    : []
  return { ...pick(raw, TEAM_FIELDS), players }
}

/** Public projection of a match. Before Phase 3 every match is `scheduled` with no scores. */
export function publicMatch(raw: unknown, phase: Phase): Json | null {
  if (!isObject(raw)) return null
  const base = pick(raw, MATCH_FIELDS)
  return phase >= 3 ? { ...base, ...pick(raw, SCORE_FIELDS) } : { ...base, status: 'scheduled' }
}

export function createApiHandler(options: ApiOptions): (request: Request) => Promise<Response> {
  const now = options.now ?? (() => new Date())
  const currentPhase = (): Phase => options.phaseOverride ?? phaseAt(now())

  return async (request) => {
    const origin = request.headers.get('Origin')
    const headers = new Headers({
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      Vary: 'Origin',
    })
    if (origin && options.allowedOrigins.includes(origin)) {
      headers.set('Access-Control-Allow-Origin', origin)
      headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    }
    const reply = (status: number, body?: unknown) =>
      new Response(request.method === 'HEAD' || body === undefined ? null : JSON.stringify(body), { status, headers })

    if (request.method === 'OPTIONS') return reply(204)
    if (request.method !== 'GET' && request.method !== 'HEAD') return reply(405, { error: 'method_not_allowed' })

    const phase = currentPhase()
    const { pathname } = new URL(request.url)

    switch (pathname) {
      case '/v1/status':
        return reply(200, { phase, serverTime: now().toISOString() })
      case '/v1/roster': {
        if (phase < 2) return reply(403, { error: 'not_published' })
        const teams = (await options.store.teams()).map(publicTeam).filter((t) => t !== null)
        return reply(200, { teams })
      }
      case '/v1/matches': {
        if (phase < 2) return reply(403, { error: 'not_published' })
        const matches = (await options.store.matches()).map((m) => publicMatch(m, phase)).filter((m) => m !== null)
        return reply(200, { matches })
      }
      default:
        return reply(404, { error: 'not_found' })
    }
  }
}
