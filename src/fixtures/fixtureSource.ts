import type { Phase } from '../config/publication.ts'
import { phaseAt } from '../domain/publication.ts'
import { eventInstant } from '../domain/schedule.ts'
import type { Match } from '../domain/types.ts'
import {
  NotPublishedError,
  type Loaded,
  type PortalDataSource,
  type PortalStatus,
} from '../data/source.ts'
import { buildDemoMatches, buildDemoTeams, type DemoOptions } from './demoTournament.ts'

/** Scores and live status are redacted until Phase 3, as a real server must do. */
export function redactForPhase(matches: readonly Match[], phase: Phase): Match[] {
  if (phase >= 3) return [...matches]
  return matches.map((m) => ({ ...m, status: 'scheduled' as const, onCourt: null, official: null, capReached: undefined }))
}

/**
 * Stand-in for a Match Control API that enforces publication phases server-side. Used for
 * development and tests; it mirrors the contract in docs/INTEGRATION.md.
 */
export function createFixtureSource(getNow: () => Date, options: DemoOptions = {}): PortalDataSource {
  const teams = buildDemoTeams()
  const phase = () => phaseAt(getNow())
  // Without an explicit `completedWaves`, the demo day follows the clock.
  const matchesNow = () => {
    const sinceMidnight = (getNow().getTime() - Date.parse(eventInstant(0))) / 60_000
    return buildDemoMatches(teams, { ...options, nowMinutes: sinceMidnight })
  }

  return {
    kind: 'fixture',
    getStatus: (): Promise<PortalStatus> => Promise.resolve({ phase: phase(), serverTime: getNow().toISOString() }),
    getRoster: (): Promise<Loaded<(typeof teams)[number]>> => {
      if (phase() < 2) return Promise.reject(new NotPublishedError('Bracket assignments'))
      return Promise.resolve({ items: teams, skipped: 0 })
    },
    getMatches: (): Promise<Loaded<Match>> => {
      if (phase() < 2) return Promise.reject(new NotPublishedError('The match schedule'))
      return Promise.resolve({ items: redactForPhase(matchesNow(), phase()), skipped: 0 })
    },
  }
}
