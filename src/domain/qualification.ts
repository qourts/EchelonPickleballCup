import {
  orderWithTiebreakers,
  type TieEntry,
  type TiebreakerNeed,
  type TiebreakerResult,
} from './tiebreakers.ts'
import type { BracketStanding, StandingRow, TeamRecord } from './standings.ts'
import type { BracketLetter } from './types.ts'

export interface Qualifier {
  readonly seed: 1 | 2 | 3 | 4
  readonly teamId: string
  readonly bracket: BracketLetter
  readonly via: 'bracket-winner' | 'wildcard'
  readonly record: TeamRecord
}

export interface Semifinal {
  /** 1 contains Seed #1; 2 is the other semifinal. */
  readonly index: 1 | 2
  readonly a: Qualifier
  readonly b: Qualifier
}

export type QualificationStatus = 'pending' | 'tiebreaker-required' | 'organizer-decision' | 'ready'

export interface DivisionQualification {
  readonly status: QualificationStatus
  readonly qualifiers: readonly Qualifier[]
  readonly semifinals: readonly Semifinal[]
  /** True when Seed #1 and the wildcard came from one bracket and the pairings were switched. */
  readonly sameBracketException: boolean
  readonly needs: readonly TiebreakerNeed[]
  readonly reason?: string
}

export interface QualificationInput {
  /** Divisions with three brackets send a wildcard; Low Intermediate (four brackets) does not. */
  readonly wildcard: boolean
  readonly brackets: readonly BracketLetter[]
  readonly standings: Partial<Record<BracketLetter, BracketStanding>>
  readonly tiebreakerResults: readonly TiebreakerResult[]
}

interface Candidate extends TieEntry {
  readonly bracket: BracketLetter
}

const empty = { qualifiers: [], semifinals: [], sameBracketException: false, needs: [] } as const

function rowAt(standing: BracketStanding, index: number): StandingRow | undefined {
  return standing.rows[index]
}

/**
 * Work out the semifinal field for one category/division from its preliminary standings.
 *
 * - Bracket winners are seeded on Win Rate, PE, PC.
 * - With a wildcard, the best second-place team is chosen by comparing only second-place
 *   records, and is always Seed #4 even if its record beats a bracket winner's.
 * - Pairings are #1 v #4 and #2 v #3, except #1 v #3 and #2 v #4 when Seed #1 and the
 *   wildcard came from the same bracket.
 * - Statistical ties between brackets need race-to-6 matches; they are reported, never guessed.
 */
export function qualifyDivision(input: QualificationInput): DivisionQualification {
  const { wildcard, brackets, standings, tiebreakerResults } = input

  if (brackets.length < (wildcard ? 3 : 4)) {
    return { ...empty, status: 'pending', reason: 'Waiting for the brackets of this division to be published.' }
  }

  const winners: Candidate[] = []
  const seconds: Candidate[] = []

  for (const letter of brackets) {
    const standing = standings[letter]
    if (!standing || standing.status !== 'final') {
      return { ...empty, status: 'pending', reason: 'Waiting for every preliminary bracket in this division to finish.' }
    }
    const first = rowAt(standing, 0)
    const second = rowAt(standing, 1)
    if (!first || first.tie === 'unresolved') {
      return {
        ...empty,
        status: 'organizer-decision',
        reason: `Bracket ${letter} has a first-place tie that head-to-head cannot settle. An organizer decision is pending.`,
      }
    }
    winners.push({ teamId: first.teamId, record: first.record, bracket: letter })
    if (wildcard) {
      if (!second || second.tie === 'unresolved') {
        return {
          ...empty,
          status: 'organizer-decision',
          reason: `Bracket ${letter} has a second-place tie that head-to-head cannot settle. An organizer decision is pending.`,
        }
      }
      seconds.push({ teamId: second.teamId, record: second.record, bracket: letter })
    }
  }

  const seeding = orderWithTiebreakers(winners, 'seeding', tiebreakerResults, false)
  const wildcardPick = wildcard ? orderWithTiebreakers(seconds, 'wildcard', tiebreakerResults, true) : null

  const needs: TiebreakerNeed[] = []
  if (seeding.kind === 'blocked') needs.push(seeding.need)
  if (wildcardPick?.kind === 'blocked') needs.push(wildcardPick.need)
  if (needs.length > 0) {
    const organizerOnly = needs.some((need) => need.format === 'organizer-decision')
    return {
      ...empty,
      needs,
      status: organizerOnly ? 'organizer-decision' : 'tiebreaker-required',
      reason: organizerOnly
        ? 'A tie among four or more teams needs an official organizer decision.'
        : 'Ties on Win Rate, PE and PC must be settled with race-to-6 tiebreaker matches.',
    }
  }
  if (seeding.kind !== 'resolved') return { ...empty, status: 'pending' }

  const byTeam = new Map([...winners, ...seconds].map((c) => [c.teamId, c]))
  const toQualifier = (teamId: string, seed: 1 | 2 | 3 | 4, via: Qualifier['via']): Qualifier => {
    const candidate = byTeam.get(teamId)
    if (!candidate) throw new Error(`Unknown qualifying team ${teamId}`)
    return { seed, teamId, bracket: candidate.bracket, via, record: candidate.record }
  }

  const qualifiers: Qualifier[] = seeding.order.map((teamId, i) =>
    toQualifier(teamId, (i + 1) as 1 | 2 | 3 | 4, 'bracket-winner'),
  )
  if (wildcardPick?.kind === 'resolved') {
    const wildcardTeam = wildcardPick.order[0]
    if (wildcardTeam) qualifiers.push(toQualifier(wildcardTeam, 4, 'wildcard'))
  }

  const bySeed = (seed: number) => {
    const found = qualifiers.find((q) => q.seed === seed)
    if (!found) throw new Error(`Missing seed #${seed}`)
    return found
  }
  const seedOne = bySeed(1)
  const seedFour = bySeed(4)
  const sameBracketException = wildcard && seedOne.bracket === seedFour.bracket

  const semifinals: Semifinal[] = sameBracketException
    ? [
        { index: 1, a: seedOne, b: bySeed(3) },
        { index: 2, a: bySeed(2), b: seedFour },
      ]
    : [
        { index: 1, a: seedOne, b: seedFour },
        { index: 2, a: bySeed(2), b: bySeed(3) },
      ]

  return { status: 'ready', qualifiers, semifinals, sameBracketException, needs: [] }
}
