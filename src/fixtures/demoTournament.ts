import { SCORING } from '../config/rules.ts'
import { TEAMS } from '../config/roster.ts'
import { EVENT_MATCHES } from '../config/schedule.ts'
import { normalizeTimeCapScore } from '../domain/scoring.ts'
import { eventInstant } from '../domain/schedule.ts'
import type { Match, Team } from '../domain/types.ts'

/**
 * SYNTHETIC demonstration tournament for development and tests only.
 *
 * The structure is the real event (pairs, courts, times), but every player is renamed
 * "Sample Player NNN" and every score is made up. This module is imported only from tests and
 * from a development-only branch in data/index.ts, and the production build is checked for
 * FIXTURE_MARKER so it can never be shipped by accident.
 */
export const FIXTURE_MARKER = 'ECHELON_SYNTHETIC_FIXTURE_DO_NOT_SHIP'

export interface DemoOptions {
  /** How many preliminary rounds (0-5) are complete in every division. The next round is live. */
  readonly completedWaves?: number
  /** Minutes since midnight on event day. Drives completed/live/scheduled from match times. */
  readonly nowMinutes?: number
  readonly seed?: number
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function buildDemoTeams(): Team[] {
  let player = 0
  const teams = TEAMS.map((team) => ({
    ...team,
    players: team.players.map((p) => {
      player += 1
      return { ...p, name: `Sample Player ${String(player).padStart(3, '0')}` }
    }),
  }))
  // Two different teams share one name, to exercise duplicate-name search.
  for (const index of [0, 7]) {
    const team = teams[index]!
    teams[index] = { ...team, players: [{ ...team.players[0]!, name: 'Sample Duplicate Name' }, team.players[1]!] }
  }
  return teams
}

const minutesOf = (iso: string | null) => (iso ? (Date.parse(iso) - Date.parse(eventInstant(0))) / 60_000 : 0)

export function buildDemoMatches(_teams: readonly Team[], options: DemoOptions = {}): Match[] {
  const { seed = 2026, nowMinutes } = options
  const timeMode = nowMinutes !== undefined && options.completedWaves === undefined
  const completedRounds = options.completedWaves ?? 5
  const random = mulberry32(seed)

  return EVENT_MATCHES.map((match): Match => {
    if (match.stage !== 'preliminary') return match
    const start = minutesOf(match.startsAt)
    const round = match.round ?? 1
    const completed = timeMode ? start + SCORING.slotMinutes <= nowMinutes! : round <= completedRounds
    const live = timeMode
      ? start <= nowMinutes! && nowMinutes! < start + SCORING.slotMinutes
      : round === completedRounds + 1 && completedRounds > 0
    if (!completed) return { ...match, status: live ? 'live' : 'scheduled' }

    const aWins = random() < 0.5
    const loserScore = Math.floor(random() * 10)
    const capReached = random() < 0.25
    const winnerOnCourt = capReached ? Math.min(10, loserScore + 1 + Math.floor(random() * 3)) : 11
    const onCourt = aWins ? { a: winnerOnCourt, b: loserScore } : { a: loserScore, b: winnerOnCourt }
    return {
      ...match,
      status: 'completed',
      onCourt,
      capReached,
      official: capReached ? normalizeTimeCapScore(onCourt) : onCourt,
    }
  })
}
