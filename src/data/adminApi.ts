import { TEAMS } from '../config/roster.ts'
import { buildTournamentView } from '../domain/tournament.ts'
import { tryResolveOfficialScore, winningSide } from '../domain/scoring.ts'
import type { Match } from '../domain/types.ts'
import { DataSourceError } from './source.ts'
import { callRpc, toMatch, type MatchRow } from './supabase.ts'
import { parseMatch } from './validate.ts'

export type AdminRole = 'scorer' | 'supervisor'

/** A match as Match Control sees it: everything public plus private notes and the edit version. */
export interface AdminMatch extends Match {
  readonly version: number
  readonly notePublic: boolean
  readonly privateNote: string | null
  readonly updatedBy: string | null
  readonly updatedAt: string | null
}

export interface ActivityEntry {
  readonly id: number
  readonly matchId: string
  readonly by: string | null
  readonly at: string
  readonly action: string
  readonly reason: string | null
  readonly detail: Record<string, unknown>
}

interface AdminRow extends MatchRow {
  readonly version: number
  readonly notePublic: boolean
  readonly updatedBy: string | null
  readonly updatedAt: string | null
}

export async function loadRole(token: string): Promise<AdminRole | null> {
  const role = await callRpc<string | null>('echelon_admin_role', {}, token)
  return role === 'scorer' || role === 'supervisor' ? role : null
}

export async function loadAdminMatches(token: string, signal?: AbortSignal): Promise<AdminMatch[]> {
  const rows = await callRpc<AdminRow[]>('echelon_admin_matches', {}, token, signal)
  if (!Array.isArray(rows)) throw new DataSourceError('The scoring service sent an unexpected answer.')
  const matches: AdminMatch[] = []
  for (const row of rows) {
    const match = parseMatch(toMatch(row))
    if (!match) continue
    matches.push({
      ...match,
      version: row.version,
      notePublic: row.notePublic,
      privateNote: row.note ?? null,
      updatedBy: row.updatedBy,
      updatedAt: row.updatedAt,
    })
  }
  return matches
}

export async function loadActivity(token: string): Promise<ActivityEntry[]> {
  const rows = await callRpc<ActivityEntry[]>('echelon_activity', { p_limit: 500 }, token)
  return Array.isArray(rows) ? rows : []
}

/** Run a Match Control write. Every write checks the version the admin last saw. */
export async function act(token: string, fn: string, match: AdminMatch | string, version: number, args: object = {}) {
  const id = typeof match === 'string' ? match : match.id
  const result = await callRpc<{ version: number }>(fn, { p_match: id, p_version: version, ...args }, token)
  return result.version
}

export const isOffline = (error: unknown) => error instanceof Error && error.message.startsWith('Could not reach')
export const isConflict = (error: unknown) => error instanceof Error && error.message.includes('changed by someone else')

/** Friendlier wording for the database's lock timeout. */
export function explain(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Something went wrong.'
  if (message.includes('lock timeout')) return 'This match is busy. Wait a moment and try again.'
  return message
}

/** A live match whose score already decides it, so it only needs confirming. */
export function readyToConfirm(match: Match): boolean {
  if (match.status !== 'live' || !match.onCourt) return false
  const { a, b } = match.onCourt
  const hi = Math.max(a, b)
  const lo = Math.min(a, b)
  if (match.stage === 'gold' || match.stage === 'bronze') return hi >= 11 && hi - lo >= 2
  return hi >= 11
}

/** Pairs the rules put into a playoff match, once the results that decide them are in. */
export function suggestedTeams(match: Match, matches: readonly Match[]): [string, string] | null {
  const division = buildTournamentView(TEAMS, matches).division('genderless', match.division)
  if (!division) return null
  if (match.stage === 'semifinal') {
    const semi = division.qualification.semifinals.find((s) => s.index === match.semifinalIndex)
    return semi ? [semi.a.teamId, semi.b.teamId] : null
  }
  if (match.stage !== 'gold' && match.stage !== 'bronze') return null
  const outcome = (index: 1 | 2) => {
    const semi = matches.find((m) => m.division === match.division && m.stage === 'semifinal' && m.semifinalIndex === index)
    const score = semi && semi.status === 'completed' ? tryResolveOfficialScore(semi).score : null
    if (!semi || !score || !semi.teamAId || !semi.teamBId) return null
    const aWon = winningSide(score) === 'a'
    return { winner: aWon ? semi.teamAId : semi.teamBId, loser: aWon ? semi.teamBId : semi.teamAId }
  }
  const one = outcome(1)
  const two = outcome(2)
  if (!one || !two) return null
  return match.stage === 'gold' ? [one.winner, two.winner] : [one.loser, two.loser]
}
