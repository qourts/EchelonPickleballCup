import { CATEGORIES, DIVISIONS } from '../config/event.ts'
import { CATEGORY_BLOCKS, PLAYOFF_COURTS, PRELIMINARY_COURTS } from '../config/schedule.ts'
import { roundRobinPairings } from '../domain/roundRobin.ts'
import { normalizeTimeCapScore } from '../domain/scoring.ts'
import { eventInstant } from '../domain/schedule.ts'
import type { Match, Team, TeamSlot } from '../domain/types.ts'

/**
 * SYNTHETIC demonstration tournament for development and tests only.
 *
 * Nothing here is real: every player is called "Sample Player NNN". This module is imported
 * only from tests and from a development-only branch in data/index.ts, and the production
 * build is checked for FIXTURE_MARKER so it can never be shipped by accident.
 */
export const FIXTURE_MARKER = 'ECHELON_SYNTHETIC_FIXTURE_DO_NOT_SHIP'

export interface DemoOptions {
  /** How many preliminary waves (0-6) have been completed. The next wave is shown as live. */
  readonly completedWaves?: number
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
  const teams: Team[] = []
  let player = 0
  for (const category of CATEGORIES) {
    for (const division of DIVISIONS) {
      for (const bracket of division.brackets) {
        for (const slot of [1, 2, 3, 4] as TeamSlot[]) {
          const id = `${category.id}-${division.code}-${bracket}${slot}`
          const names = [0, 1].map(() => {
            player += 1
            return `Sample Player ${String(player).padStart(3, '0')}`
          })
          teams.push({
            id,
            category: category.id,
            division: division.id,
            bracket,
            slot,
            players: names.map((name, i) => ({ id: `${id}-p${i + 1}`, name })),
          })
        }
      }
    }
  }
  // Two different teams share one name, to exercise duplicate-name search.
  const [first, second] = [teams[0]!, teams[9]!]
  teams[0] = { ...first, players: [{ ...first.players[0]!, name: 'Sample Duplicate Name' }, first.players[1]!] }
  teams[9] = { ...second, players: [{ ...second.players[0]!, name: 'Sample Duplicate Name' }, second.players[1]!] }
  return teams
}

export function buildDemoMatches(teams: readonly Team[], options: DemoOptions = {}): Match[] {
  const { completedWaves = 6, seed = 2026 } = options
  const random = mulberry32(seed)
  const strength = new Map(teams.map((t) => [t.id, random()]))
  const matches: Match[] = []

  for (const block of CATEGORY_BLOCKS) {
    for (const division of DIVISIONS) {
      const courts = PRELIMINARY_COURTS[division.id]
      division.brackets.forEach((bracket, bracketIndex) => {
        const bracketTeams = teams
          .filter((t) => t.category === block.category && t.division === division.id && t.bracket === bracket)
          .sort((x, y) => x.slot - y.slot)
        if (bracketTeams.length !== 4) return
        for (const pairing of roundRobinPairings(bracketTeams.map((t) => t.id))) {
          const completed = pairing.round <= completedWaves
          const live = pairing.round === completedWaves + 1 && completedWaves > 0
          const base: Match = {
            id: `${block.category}-${division.code}-${bracket}-r${pairing.round}`,
            stage: 'preliminary',
            category: block.category,
            division: division.id,
            bracket,
            round: pairing.round,
            court: courts[bracketIndex] ?? null,
            startsAt: eventInstant(block.startMinutes + (pairing.round - 1) * 20),
            teamAId: pairing.teamA,
            teamBId: pairing.teamB,
            status: completed ? 'completed' : live ? 'live' : 'scheduled',
          }
          if (!completed) {
            matches.push(base)
            continue
          }
          const aStronger = (strength.get(pairing.teamA) ?? 0) >= (strength.get(pairing.teamB) ?? 0)
          const aWins = random() < (aStronger ? 0.7 : 0.3)
          const loserScore = Math.floor(random() * 10)
          const capReached = random() < 0.25
          const winnerOnCourt = capReached ? Math.min(10, loserScore + 1 + Math.floor(random() * 3)) : 11
          const onCourt = aWins ? { a: winnerOnCourt, b: loserScore } : { a: loserScore, b: winnerOnCourt }
          matches.push({
            ...base,
            onCourt,
            capReached,
            official: capReached ? normalizeTimeCapScore(onCourt) : onCourt,
          })
        }
      })
    }
    for (const division of DIVISIONS) {
      const courts = PLAYOFF_COURTS[division.id]
      const semiStart = block.startMinutes + 140
      const medalStart = block.startMinutes + 160
      const shell = {
        category: block.category,
        division: division.id,
        status: 'scheduled' as const,
        teamAId: null,
        teamBId: null,
      }
      matches.push(
        {
          ...shell,
          id: `${block.category}-${division.code}-sf1`,
          stage: 'semifinal',
          semifinalIndex: 1,
          court: courts.semifinalOneVsFour,
          startsAt: eventInstant(semiStart),
          labelA: 'Seed #1',
          labelB: division.wildcard ? 'Seed #4 (wildcard)' : 'Seed #4',
        },
        {
          ...shell,
          id: `${block.category}-${division.code}-sf2`,
          stage: 'semifinal',
          semifinalIndex: 2,
          court: courts.semifinalTwoVsThree,
          startsAt: eventInstant(semiStart),
          labelA: 'Seed #2',
          labelB: 'Seed #3',
        },
        {
          ...shell,
          id: `${block.category}-${division.code}-gold`,
          stage: 'gold',
          court: courts.gold,
          startsAt: eventInstant(medalStart),
          labelA: 'Winner SF1',
          labelB: 'Winner SF2',
        },
        {
          ...shell,
          id: `${block.category}-${division.code}-bronze`,
          stage: 'bronze',
          court: courts.bronze,
          startsAt: eventInstant(medalStart),
          labelA: 'Loser SF1',
          labelB: 'Loser SF2',
        },
      )
    }
  }
  return matches
}
