/** Confirmed scoring and format constants. Change these here, never inside logic or UI. */
export const SCORING = {
  /** Preliminary matches and semifinals: first to 11, no deuce. */
  regulationTarget: 11,
  matchCapMinutes: 15,
  /** Every match has a 25-minute slot in the published schedule. */
  slotMinutes: 25,
  /** Gold and Bronze: first to 11, deuce, win by two, no time cap. */
  medalTarget: 11,
  medalWinBy: 2,
  /** Supplemental tiebreaker matches: first to 6, no deuce, no time cap. */
  tiebreakerTarget: 6,
} as const

export const CONDUCT = {
  /** Players check in at least this long before their scheduled match. */
  checkInLeadMinutes: 60,
  /** A team that is not present and ready this long after the scheduled start forfeits. */
  forfeitGraceMinutes: 5,
} as const

export const BRACKET_FORMAT = {
  teamsPerBracket: 6,
  preliminaryMatchesPerBracket: 15,
  guaranteedMatchesPerTeam: 5,
  /** The top four of each round-robin group play the semifinals. */
  qualifiersPerDivision: 4,
} as const

/** Round-robin order from the published schedule: five rounds of three matches. Numbers are team slots. */
export const ROUND_ROBIN_ROUNDS: readonly (readonly (readonly [number, number])[])[] = [
  [[1, 2], [3, 4], [5, 6]],
  [[2, 5], [4, 6], [1, 3]],
  [[3, 5], [1, 4], [2, 6]],
  [[2, 4], [1, 5], [3, 6]],
  [[2, 3], [4, 5], [1, 6]],
]

export const ROUND_ROBIN_SEQUENCE: readonly (readonly [number, number])[] = ROUND_ROBIN_ROUNDS.flat()
