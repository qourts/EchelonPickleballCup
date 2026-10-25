import { BRACKET_FORMAT } from '../config/rules.ts'
import { tryResolveOfficialScore, winningSide } from './scoring.ts'
import type { Match, Score } from './types.ts'

export interface TeamRecord {
  readonly teamId: string
  readonly played: number
  readonly wins: number
  readonly losses: number
  /** Points Earned, from official adjusted scores. */
  readonly pe: number
  /** Points Conceded, from official adjusted scores. */
  readonly pc: number
}

export type TieStatus = 'none' | 'head-to-head' | 'unresolved'

export interface StandingRow {
  readonly teamId: string
  /** Null until the bracket has a result. Tied rows that cannot be separated share a rank. */
  readonly rank: number | null
  readonly record: TeamRecord
  readonly tie: TieStatus
}

export interface BracketStanding {
  readonly status: 'pending' | 'in-progress' | 'final'
  readonly rows: readonly StandingRow[]
  readonly completedMatches: number
  /** Matches whose scores could not be interpreted. They are excluded from the standings. */
  readonly invalidMatchIds: readonly string[]
}

export function winRate(record: Pick<TeamRecord, 'wins' | 'played'>): number {
  return record.played === 0 ? 0 : record.wins / record.played
}

/**
 * Negative when `x` ranks ahead of `y`: higher win rate, then higher PE, then lower PC.
 * Win rates are compared by cross-multiplication so no floating point rounding is involved.
 */
export function compareRecords(x: TeamRecord, y: TeamRecord): number {
  const lhs = x.wins * (y.played || 1)
  const rhs = y.wins * (x.played || 1)
  if (lhs !== rhs) return rhs - lhs
  if (x.pe !== y.pe) return y.pe - x.pe
  return x.pc - y.pc
}

function isPreliminaryBetween(match: Match, teamIds: ReadonlySet<string>): boolean {
  return (
    match.stage === 'preliminary' &&
    match.teamAId !== null &&
    match.teamBId !== null &&
    teamIds.has(match.teamAId) &&
    teamIds.has(match.teamBId)
  )
}

interface ScoredMatch {
  readonly match: Match
  readonly score: Score
}

function scoredPreliminaries(teamIds: readonly string[], matches: readonly Match[]) {
  const ids = new Set(teamIds)
  const scored: ScoredMatch[] = []
  const invalidMatchIds: string[] = []
  const seenPairs = new Set<string>()
  for (const match of matches) {
    if (!isPreliminaryBetween(match, ids)) continue
    const { score, invalid } = tryResolveOfficialScore(match)
    if (invalid) {
      invalidMatchIds.push(match.id)
    } else if (score) {
      // A pairing can only be played once; repeats are data errors and are not counted.
      const pair = [match.teamAId, match.teamBId].sort().join('|')
      if (seenPairs.has(pair)) invalidMatchIds.push(match.id)
      else {
        seenPairs.add(pair)
        scored.push({ match, score })
      }
    }
  }
  return { scored, invalidMatchIds }
}

function recordsFrom(teamIds: readonly string[], scored: readonly ScoredMatch[]): TeamRecord[] {
  return teamIds.map((teamId) => {
    let played = 0
    let wins = 0
    let pe = 0
    let pc = 0
    for (const { match, score } of scored) {
      const isA = match.teamAId === teamId
      if (!isA && match.teamBId !== teamId) continue
      played += 1
      pe += isA ? score.a : score.b
      pc += isA ? score.b : score.a
      if (winningSide(score) === (isA ? 'a' : 'b')) wins += 1
    }
    return { teamId, played, wins, losses: played - wins, pe, pc }
  })
}

/** Records computed from official preliminary results only (tiebreaker matches never count). */
export function computeRecords(teamIds: readonly string[], matches: readonly Match[]): TeamRecord[] {
  return recordsFrom(teamIds, scoredPreliminaries(teamIds, matches).scored)
}

function headToHeadWinner(a: string, b: string, scored: readonly ScoredMatch[]): string | null {
  const found = scored.find(
    ({ match }) =>
      (match.teamAId === a && match.teamBId === b) || (match.teamAId === b && match.teamBId === a),
  )
  if (!found) return null
  return winningSide(found.score) === 'a' ? found.match.teamAId : found.match.teamBId
}

/**
 * Rank the teams of one preliminary bracket.
 *
 * Order: win rate, PE, PC. A remaining two-team tie is settled by head-to-head. A tie that
 * head-to-head cannot settle (three or more teams, or the pair has not played) is reported
 * as `unresolved` and the tied rows share a rank. Nothing falls back to names, ids or chance.
 * `teamIds` is in bracket slot order, which only decides display order of tied rows.
 */
export function rankBracket(teamIds: readonly string[], matches: readonly Match[]): BracketStanding {
  const { scored, invalidMatchIds } = scoredPreliminaries(teamIds, matches)
  const records = recordsFrom(teamIds, scored)
  const completedMatches = scored.length

  if (completedMatches === 0) {
    return {
      status: 'pending',
      rows: records.map((record) => ({ teamId: record.teamId, rank: null, record, tie: 'none' })),
      completedMatches,
      invalidMatchIds,
    }
  }

  const sorted = [...records].sort(compareRecords)
  const rows: StandingRow[] = []
  let position = 0
  while (position < sorted.length) {
    let end = position + 1
    while (end < sorted.length && compareRecords(sorted[position]!, sorted[end]!) === 0) end += 1
    const group = sorted.slice(position, end)
    const rank = position + 1
    if (group.length === 1) {
      rows.push({ teamId: group[0]!.teamId, rank, record: group[0]!, tie: 'none' })
    } else if (group.length === 2) {
      const [first, second] = group as [TeamRecord, TeamRecord]
      const winner = headToHeadWinner(first.teamId, second.teamId, scored)
      if (winner === null) {
        rows.push({ teamId: first.teamId, rank, record: first, tie: 'unresolved' })
        rows.push({ teamId: second.teamId, rank, record: second, tie: 'unresolved' })
      } else {
        const [ahead, behind] = winner === first.teamId ? [first, second] : [second, first]
        rows.push({ teamId: ahead.teamId, rank, record: ahead, tie: 'head-to-head' })
        rows.push({ teamId: behind.teamId, rank: rank + 1, record: behind, tie: 'head-to-head' })
      }
    } else {
      for (const record of group) rows.push({ teamId: record.teamId, rank, record, tie: 'unresolved' })
    }
    position = end
  }

  const expectedMatches = (teamIds.length * (teamIds.length - 1)) / 2
  const isFinal = teamIds.length === BRACKET_FORMAT.teamsPerBracket && completedMatches >= expectedMatches
  return { status: isFinal ? 'final' : 'in-progress', rows, completedMatches, invalidMatchIds }
}
