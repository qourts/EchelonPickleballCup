/** Core tournament vocabulary shared by configuration, competition logic, data sources and UI. */

export type CategoryId = 'genderless' | 'mens' | 'mixed' | 'womens'
export type DivisionId = 'novice' | 'low-intermediate' | 'high-intermediate'
export type BracketLetter = 'A' | 'B' | 'C' | 'D'
export type TeamSlot = 1 | 2 | 3 | 4

export type MatchStage = 'preliminary' | 'semifinal' | 'gold' | 'bronze' | 'tiebreaker'
export type MatchStatus = 'scheduled' | 'live' | 'completed'

/** `a` is the score of the match's team A, `b` the score of team B. */
export interface Score {
  readonly a: number
  readonly b: number
}

/** Public roster data only. Contact details must never be part of this model. */
export interface Player {
  readonly id: string
  readonly name: string
}

export interface Team {
  readonly id: string
  readonly category: CategoryId
  readonly division: DivisionId
  readonly bracket: BracketLetter
  readonly slot: TeamSlot
  readonly players: readonly Player[]
}

export type TiebreakerKey = 'seeding' | 'wildcard'

export interface Match {
  readonly id: string
  readonly stage: MatchStage
  readonly category: CategoryId
  readonly division: DivisionId
  readonly bracket?: BracketLetter
  /** Preliminary wave (1-6). */
  readonly round?: number
  /** Which semifinal this is when `stage` is `semifinal`: 1 = Seed #1's side, 2 = the other. */
  readonly semifinalIndex?: 1 | 2
  /** Tiebreaker matches belong to exactly one tie-resolution context. */
  readonly tiebreakerKey?: TiebreakerKey
  readonly court: number | null
  /** ISO-8601 instant with offset, e.g. 2026-11-21T09:00:00+08:00. */
  readonly startsAt: string | null
  readonly teamAId: string | null
  readonly teamBId: string | null
  /** Placeholder text while a team is not yet known, e.g. "Seed #1". */
  readonly labelA?: string
  readonly labelB?: string
  readonly status: MatchStatus
  /** Score as played on court. Kept separate from the official result. */
  readonly onCourt?: Score | null
  /** Official published result. For time-capped matches this is the adjusted score. */
  readonly official?: Score | null
  /** True when a time-capped match ended on the 15-minute cap rather than on points. */
  readonly capReached?: boolean
}
