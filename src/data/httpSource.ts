import {
  DataSourceError,
  NotPublishedError,
  type Loaded,
  type PortalDataSource,
  type PortalStatus,
} from './source.ts'
import { parseMatches, parseRoster, parseStatus } from './validate.ts'
import type { Match, Team } from '../domain/types.ts'

const REQUEST_TIMEOUT_MS = 15_000

/**
 * Reads published data from a Qourts Match Control portal API.
 *
 * Endpoints (all GET, JSON): /v1/status, /v1/roster, /v1/matches. The API is responsible for
 * refusing data whose phase has not opened (HTTP 403 or 404). Responses are never cached.
 */
export function createHttpSource(baseUrl: string): PortalDataSource {
  const root = baseUrl.replace(/\/+$/, '')

  async function getJson(path: string, label: string, signal?: AbortSignal): Promise<unknown> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    const forward = () => controller.abort()
    if (signal?.aborted) controller.abort()
    signal?.addEventListener('abort', forward)
    let response: Response
    try {
      response = await fetch(`${root}${path}`, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'omit',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      })
    } catch (error) {
      if (signal?.aborted) throw error
      throw new DataSourceError(`Could not reach the tournament data service for ${label}.`, { cause: error })
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', forward)
    }
    if (response.status === 403 || response.status === 404) throw new NotPublishedError(label)
    if (!response.ok) throw new DataSourceError(`The tournament data service answered ${response.status} for ${label}.`)
    try {
      return await response.json()
    } catch (error) {
      throw new DataSourceError(`The tournament data service sent unreadable data for ${label}.`, { cause: error })
    }
  }

  return {
    kind: 'http',
    async getStatus(signal): Promise<PortalStatus> {
      return parseStatus(await getJson('/v1/status', 'the publication status', signal))
    },
    async getRoster(signal): Promise<Loaded<Team>> {
      return parseRoster(await getJson('/v1/roster', 'Bracket assignments', signal))
    },
    async getMatches(signal): Promise<Loaded<Match>> {
      return parseMatches(await getJson('/v1/matches', 'The match schedule', signal))
    },
  }
}
