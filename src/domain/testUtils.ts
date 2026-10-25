import { ROUND_ROBIN_SEQUENCE } from '../config/rules.ts'
import type { BracketStanding, StandingRow, TeamRecord } from './standings.ts'
import type { BracketLetter, Match, Score, Team } from './types.ts'

/** Helpers for building small, explicit scenarios in tests. */

export function makeTeam(id: string, bracket: BracketLetter, slot: 1 | 2 | 3 | 4, names: string[] = []): Team {
  return {
    id,
    category: 'genderless',
    division: 'novice',
    bracket,
    slot,
    players: names.map((name, i) => ({ id: `${id}-p${i + 1}`, name })),
  }
}

/** Six completed preliminary matches for teams listed in slot order, using official scores. */
export function bracketMatches(teamIds: string[], scores: Score[], prefix = 'm'): Match[] {
  return ROUND_ROBIN_SEQUENCE.map(([slotA, slotB], i) => ({
    id: `${prefix}${i + 1}`,
    stage: 'preliminary' as const,
    category: 'genderless' as const,
    division: 'novice' as const,
    bracket: 'A' as const,
    round: i + 1,
    court: 8,
    startsAt: null,
    teamAId: teamIds[slotA - 1]!,
    teamBId: teamIds[slotB - 1]!,
    status: 'completed' as const,
    official: scores[i] ?? null,
  }))
}

export function record(teamId: string, wins: number, played: number, pe: number, pc: number): TeamRecord {
  return { teamId, played, wins, losses: played - wins, pe, pc }
}

/** A finished bracket whose rows are already in rank order with no ties. */
export function finalStanding(rows: TeamRecord[]): BracketStanding {
  const standingRows: StandingRow[] = rows.map((r, i) => ({ teamId: r.teamId, rank: i + 1, record: r, tie: 'none' }))
  return { status: 'final', rows: standingRows, completedMatches: 6, invalidMatchIds: [] }
}
