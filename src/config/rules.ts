/** Confirmed scoring and format constants. Change these here, never inside logic or UI. */
export const SCORING = {
  /** Preliminary matches and semifinals: first to 11, no deuce. */
  regulationTarget: 11,
  matchCapMinutes: 15,
  transitionMinutes: 5,
  slotMinutes: 20,
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
  teamsPerBracket: 4,
  preliminaryMatchesPerBracket: 6,
  guaranteedMatchesPerTeam: 3,
} as const

/** Order in which a four-team bracket plays its single round robin. Numbers are team slots. */
export const ROUND_ROBIN_SEQUENCE: readonly (readonly [number, number])[] = [
  [1, 2],
  [3, 4],
  [1, 3],
  [2, 4],
  [1, 4],
  [3, 2],
]
