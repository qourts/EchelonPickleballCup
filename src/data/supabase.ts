import { SUPABASE } from '../config/backend.ts'
import { TEAMS } from '../config/roster.ts'
import { EVENT_MATCHES } from '../config/schedule.ts'
import { DataSourceError, type PortalDataSource } from './source.ts'
import { parseMatches } from './validate.ts'

const REQUEST_TIMEOUT_MS = 15_000

/** Calls a Postgres function through Supabase. With `accessToken` it runs as that signed-in user. */
export async function callRpc<T>(name: string, args: object = {}, accessToken?: string, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const forward = () => controller.abort()
  signal?.addEventListener('abort', forward)
  try {
    const response = await fetch(`${SUPABASE.url}/rest/v1/rpc/${name}`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        apikey: SUPABASE.publishableKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(args),
      signal: controller.signal,
    })
    const body: unknown = await response.json().catch(() => null)
    if (!response.ok) {
      const message = (body as { message?: string } | null)?.message
      throw new DataSourceError(message ?? `The scoring service answered ${response.status}.`)
    }
    return body as T
  } catch (error) {
    if (error instanceof DataSourceError || signal?.aborted) throw error
    throw new DataSourceError('Could not reach the scoring service.', { cause: error })
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', forward)
  }
}

interface MatchRow {
  readonly id: string
  readonly division: string
  readonly stage: string
  readonly round: number
  readonly court: number
  readonly startsAt: string
  readonly homeId: string | null
  readonly awayId: string | null
  readonly status: string
  readonly onCourt: unknown
  readonly official: unknown
  readonly capReached: boolean
}

const PLANNED = new Map(EVENT_MATCHES.map((m) => [m.id, m]))

/** Shape a database row like every other match in the portal; parseMatches validates it. */
function toMatch(row: MatchRow) {
  const planned = PLANNED.get(row.id)
  return {
    id: row.id,
    stage: row.stage,
    category: 'genderless',
    division: row.division,
    bracket: 'A',
    round: row.round,
    semifinalIndex: row.stage === 'semifinal' ? row.round : undefined,
    court: row.court,
    startsAt: row.startsAt,
    teamAId: row.homeId,
    teamBId: row.awayId,
    labelA: planned?.labelA,
    labelB: planned?.labelB,
    status: row.status,
    onCourt: row.onCourt,
    official: row.official,
    capReached: row.capReached,
  }
}

/**
 * Reads results from the Match Control database. The roster ships with the site (it was
 * published on November 18); the publication phase follows the Philippine clock.
 */
export function createSupabaseSource(): PortalDataSource {
  return {
    kind: 'http',
    getStatus: () => Promise.resolve({ phase: null, serverTime: null }),
    getRoster: () => Promise.resolve({ items: TEAMS, skipped: 0 }),
    async getMatches(signal) {
      const rows = await callRpc<MatchRow[]>('echelon_matches', {}, undefined, signal)
      if (!Array.isArray(rows)) throw new DataSourceError('The scoring service sent an unexpected answer.')
      return parseMatches({ matches: rows.map(toMatch) })
    },
  }
}
