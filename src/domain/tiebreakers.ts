import { SCORING } from '../config/rules.ts'
import { isValidRaceScore, winningSide } from './scoring.ts'
import { compareRecords, type TeamRecord } from './standings.ts'
import type { Match, Score, TiebreakerKey } from './types.ts'

/** One completed race-to-6 match. Kept apart from preliminary Win Rate, PE and PC. */
export interface TiebreakerResult {
  readonly key: TiebreakerKey
  readonly teamAId: string
  readonly teamBId: string
  readonly score: Score
}

export type TiebreakerFormat = 'single-match' | 'mini-round-robin' | 'additional-deciders' | 'organizer-decision'

export interface TiebreakerNeed {
  readonly key: TiebreakerKey
  readonly format: TiebreakerFormat
  readonly teamIds: readonly string[]
  /** Race-to-6 matches still to be played. Empty when the organizer has to decide first. */
  readonly matchesNeeded: readonly (readonly [string, string])[]
  readonly note: string
}

export interface TieEntry {
  readonly teamId: string
  readonly record: TeamRecord
}

export type OrderOutcome =
  | { readonly kind: 'resolved'; readonly order: readonly string[] }
  | { readonly kind: 'blocked'; readonly need: TiebreakerNeed }

export function tiebreakerResultsFrom(matches: readonly Match[]): TiebreakerResult[] {
  const results: TiebreakerResult[] = []
  for (const match of matches) {
    if (match.stage !== 'tiebreaker' || match.status !== 'completed' || !match.tiebreakerKey) continue
    if (!match.teamAId || !match.teamBId) continue
    const score = match.official ?? match.onCourt
    if (!score || !isValidRaceScore(score, SCORING.tiebreakerTarget)) continue
    results.push({ key: match.tiebreakerKey, teamAId: match.teamAId, teamBId: match.teamBId, score })
  }
  return results
}

function resultsBetween(a: string, b: string, key: TiebreakerKey, results: readonly TiebreakerResult[]) {
  return results.filter(
    (r) => r.key === key && ((r.teamAId === a && r.teamBId === b) || (r.teamAId === b && r.teamBId === a)),
  )
}

function winnerOf(result: TiebreakerResult): string {
  return winningSide(result.score) === 'a' ? result.teamAId : result.teamBId
}

const pairsOf = (ids: readonly string[]): [string, string][] => {
  const pairs: [string, string][] = []
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) pairs.push([ids[i]!, ids[j]!])
  }
  return pairs
}

function blocked(
  key: TiebreakerKey,
  format: TiebreakerFormat,
  teamIds: readonly string[],
  matchesNeeded: readonly (readonly [string, string])[],
  note: string,
): OrderOutcome {
  return { kind: 'blocked', need: { key, format, teamIds, matchesNeeded, note } }
}

/** Order two teams by their race-to-6 deciding match. */
function decideByMatch(
  pair: readonly [string, string],
  key: TiebreakerKey,
  results: readonly TiebreakerResult[],
  note: string,
): OrderOutcome {
  const found = resultsBetween(pair[0], pair[1], key, results)[0]
  if (!found) return blocked(key, 'single-match', pair, [[pair[0], pair[1]]], note)
  const winner = winnerOf(found)
  return { kind: 'resolved', order: winner === pair[0] ? [pair[0], pair[1]] : [pair[1], pair[0]] }
}

interface MiniStats {
  teamId: string
  wins: number
  pe: number
  pc: number
}

function resolveThreeTeamTie(
  teamIds: readonly string[],
  key: TiebreakerKey,
  results: readonly TiebreakerResult[],
  topOnly: boolean,
): OrderOutcome {
  const pairs = pairsOf(teamIds)
  const missing = pairs.filter(([a, b]) => resultsBetween(a, b, key, results).length === 0)
  if (missing.length > 0) {
    return blocked(
      key,
      'mini-round-robin',
      teamIds,
      missing,
      'Three teams are level on Win Rate, PE and PC. They play a mini round robin: every match is first to 6, no deuce, no time cap.',
    )
  }

  const stats = new Map<string, MiniStats>(teamIds.map((id) => [id, { teamId: id, wins: 0, pe: 0, pc: 0 }]))
  for (const [a, b] of pairs) {
    const result = resultsBetween(a, b, key, results)[0]!
    const aIsTeamA = result.teamAId === a
    const scoreA = aIsTeamA ? result.score.a : result.score.b
    const scoreB = aIsTeamA ? result.score.b : result.score.a
    const statsA = stats.get(a)!
    const statsB = stats.get(b)!
    statsA.pe += scoreA
    statsA.pc += scoreB
    statsB.pe += scoreB
    statsB.pc += scoreA
    if (scoreA > scoreB) statsA.wins += 1
    else statsB.wins += 1
  }

  // Mini round robin order: most tiebreaker wins, then tiebreaker PE, then lowest tiebreaker PC.
  const compare = (x: MiniStats, y: MiniStats) => y.wins - x.wins || y.pe - x.pe || x.pc - y.pc
  const sorted = [...stats.values()].sort(compare)
  const order: string[] = []
  let position = 0
  while (position < sorted.length) {
    let end = position + 1
    while (end < sorted.length && compare(sorted[position]!, sorted[end]!) === 0) end += 1
    const group = sorted.slice(position, end).map((s) => s.teamId)
    if (group.length === 1) {
      order.push(group[0]!)
    } else {
      // With three teams a level 1-1-1 mini round robin ties all three or none, so a
      // remaining tie always involves every team.
      return blocked(
        key,
        'additional-deciders',
        group,
        [],
        'All three teams are still level after the mini round robin. Additional race-to-6 deciding matches are required; their format has not been specified.',
      )
    }
    if (topOnly) break
    position = end
  }
  return { kind: 'resolved', order }
}

function resolveTieGroup(
  teamIds: readonly string[],
  key: TiebreakerKey,
  results: readonly TiebreakerResult[],
  topOnly: boolean,
): OrderOutcome {
  if (teamIds.length === 2) {
    return decideByMatch(
      [teamIds[0]!, teamIds[1]!],
      key,
      results,
      'Two teams are level on Win Rate, PE and PC. One deciding match is played: first to 6, no deuce, no time cap.',
    )
  }
  if (teamIds.length === 3) return resolveThreeTeamTie(teamIds, key, results, topOnly)
  return blocked(
    key,
    'organizer-decision',
    teamIds,
    [],
    `${teamIds.length} teams are level on Win Rate, PE and PC. The procedure for ties of four or more teams has not been specified; an official organizer decision is pending.`,
  )
}

/**
 * Order cross-bracket candidates by Win Rate, PE and PC, settling ties with tiebreaker matches.
 *
 * `topOnly` is for the wildcard, where only the best candidate matters; ties further down
 * the list are irrelevant and are not reported. Otherwise the whole order is resolved.
 */
export function orderWithTiebreakers(
  entries: readonly TieEntry[],
  key: TiebreakerKey,
  results: readonly TiebreakerResult[],
  topOnly: boolean,
): OrderOutcome {
  const sorted = [...entries].sort((x, y) => compareRecords(x.record, y.record))
  const order: string[] = []
  let position = 0
  while (position < sorted.length) {
    let end = position + 1
    while (end < sorted.length && compareRecords(sorted[position]!.record, sorted[end]!.record) === 0) end += 1
    const group = sorted.slice(position, end).map((entry) => entry.teamId)
    if (group.length === 1) {
      order.push(group[0]!)
    } else {
      const outcome = resolveTieGroup(group, key, results, topOnly)
      if (outcome.kind === 'blocked') return outcome
      order.push(...outcome.order)
    }
    if (topOnly) break
    position = end
  }
  return { kind: 'resolved', order }
}
