import { currentTime } from '../config/runtime.ts'
import { createHttpSource } from './httpSource.ts'
import { unconfiguredSource, type PortalDataSource } from './source.ts'

/**
 * Pick the data source for this deployment.
 *
 * - `VITE_PORTAL_API_URL` set: read published data from that Qourts portal API.
 * - Development server with `VITE_PORTAL_SOURCE=fixture`: synthetic demo data (never in builds).
 * - Otherwise: no data source, so the portal works as a Player Guide with pending states.
 */
export async function createDataSource(): Promise<PortalDataSource> {
  if (import.meta.env.DEV && import.meta.env.VITE_PORTAL_SOURCE === 'fixture') {
    const { createFixtureSource } = await import('../fixtures/fixtureSource.ts')
    return createFixtureSource(currentTime)
  }
  const apiUrl = validApiUrl(import.meta.env.VITE_PORTAL_API_URL)
  return apiUrl ? createHttpSource(apiUrl) : unconfiguredSource
}

/** Only an https URL (or http on localhost) without credentials, query or fragment is accepted. */
export function validApiUrl(value: string | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
    const secure = url.protocol === 'https:' || (url.protocol === 'http:' && local)
    if (!secure || url.username || url.password || url.search || url.hash) throw new Error('rejected')
    return url.origin + url.pathname.replace(/\/+$/, '')
  } catch {
    console.error('VITE_PORTAL_API_URL is not a valid https URL; running without a data source.')
    return null
  }
}
