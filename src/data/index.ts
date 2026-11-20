import { currentTime } from '../config/runtime.ts'
import { createSupabaseSource } from './supabase.ts'
import type { PortalDataSource } from './source.ts'

/**
 * Pick the data source for this deployment.
 *
 * - Development server with `VITE_PORTAL_SOURCE=fixture`: synthetic demo data (never in builds).
 * - Otherwise: published results from the Match Control database (Supabase).
 */
export async function createDataSource(): Promise<PortalDataSource> {
  if (import.meta.env.DEV && import.meta.env.VITE_PORTAL_SOURCE === 'fixture') {
    const { createFixtureSource } = await import('../fixtures/fixtureSource.ts')
    // `?waves=0..5` picks how many preliminary rounds are complete in the demo.
    const raw = new URLSearchParams(window.location.search).get('waves')
    const waves = raw === null ? Number.NaN : Number(raw)
    const completedWaves = Number.isInteger(waves) && waves >= 0 && waves <= 5 ? waves : undefined
    return createFixtureSource(currentTime, { completedWaves })
  }
  return createSupabaseSource()
}
