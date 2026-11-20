import { SCORING } from '../config/rules.ts'
import type { Match, Score } from './types.ts'

export class ScoreError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ScoreError'
  }
}

function assertWholeScore(score: Score): void {
  for (const value of [score.a, score.b]) {
    if (!Number.isInteger(value) || value < 0) {
      throw new ScoreError(`Scores must be whole numbers of zero or more (received ${score.a}-${score.b}).`)
    }
  }
}

/**
 * Official result of a time-capped match (preliminaries and semifinals).
 *
 * When the 15-minute cap is reached the leading team wins and its official score becomes 11;
 * the losing team keeps its actual score (8-6 -> 11-6). A tie at the cap is not a final state:
 * play continues until one team leads, and that on-court score is what gets normalized
 * (7-7 continues to 8-7 -> 11-7).
 */
export function normalizeTimeCapScore(onCourt: Score): Score {
  assertWholeScore(onCourt)
  if (onCourt.a === onCourt.b) {
    throw new ScoreError('A tie at the time cap is not final: play continues until one team leads.')
  }
  const target = SCORING.regulationTarget
  const lead = Math.max(onCourt.a, onCourt.b)
  if (lead > target) {
    throw new ScoreError(`A time-capped match cannot exceed ${target} points (received ${onCourt.a}-${onCourt.b}).`)
  }
  return onCourt.a > onCourt.b ? { a: target, b: onCourt.b } : { a: onCourt.a, b: target }
}

/** First to `target`, no deuce: exactly one side reaches the target and the other is below it. */
export function isValidRaceScore(score: Score, target: number): boolean {
  const { a, b } = score
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) return false
  return (a === target && b < target) || (b === target && a < target)
}

/** Gold and Bronze: first to 11 with deuce, win by two, no time cap. */
export function isValidMedalScore(score: Score): boolean {
  const { a, b } = score
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) return false
  const winner = Math.max(a, b)
  const loser = Math.min(a, b)
  if (winner < SCORING.medalTarget) return false
  if (winner === SCORING.medalTarget) return loser <= SCORING.medalTarget - SCORING.medalWinBy
  return winner - loser === SCORING.medalWinBy
}

/** Winning side of a decided score. */
export function winningSide(score: Score): 'a' | 'b' {
  if (score.a === score.b) throw new ScoreError('A decided match cannot end level.')
  return score.a > score.b ? 'a' : 'b'
}

function validateOfficial(match: Match, score: Score): Score {
  const valid =
    match.stage === 'gold' || match.stage === 'bronze'
      ? isValidMedalScore(score)
      : match.stage === 'tiebreaker'
        ? isValidRaceScore(score, SCORING.tiebreakerTarget)
        : isValidRaceScore(score, SCORING.regulationTarget)
  if (!valid) {
    throw new ScoreError(`Match ${match.id}: ${score.a}-${score.b} is not a valid ${match.stage} result.`)
  }
  return score
}

/**
 * The result that counts for standings and progression.
 *
 * A published `official` score wins. Otherwise it is derived from the on-court score: capped
 * preliminaries and semifinals are normalized, everything else is taken as played.
 * Returns null while the match has no result. Throws ScoreError for impossible scores.
 */
export function resolveOfficialScore(match: Match): Score | null {
  if (match.status !== 'completed') return null
  if (match.official) return validateOfficial(match, match.official)
  if (!match.onCourt) return null
  const timeCapped = match.stage === 'preliminary' || match.stage === 'semifinal'
  const official = timeCapped && match.capReached ? normalizeTimeCapScore(match.onCourt) : match.onCourt
  return validateOfficial(match, official)
}

/** Same as resolveOfficialScore but reports bad data as `invalid` instead of throwing. */
export function tryResolveOfficialScore(match: Match): { score: Score | null; invalid: boolean } {
  try {
    return { score: resolveOfficialScore(match), invalid: false }
  } catch (error) {
    if (error instanceof ScoreError) return { score: null, invalid: true }
    throw error
  }
}
