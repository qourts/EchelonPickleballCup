import type { Player, Team } from './types.ts'

export interface SearchHit {
  readonly team: Team
  readonly player: Player
  readonly partners: readonly Player[]
}

export const MIN_QUERY_LENGTH = 2
export const MAX_RESULTS = 50

/** Lowercase, strip accents and punctuation, and collapse whitespace. */
export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Find players by partial, case-insensitive name. Every word typed must appear somewhere in
 * the player's name, in any order. Each player on each team is its own hit, so two players
 * with the same name stay separate and the caller can show category, division, bracket and
 * partner to tell them apart. Teams with missing player data are skipped, not fatal.
 */
export function searchPlayers(teams: readonly Team[], query: string): SearchHit[] {
  const tokens = normalizeName(query).split(' ').filter(Boolean)
  if (tokens.length === 0 || normalizeName(query).length < MIN_QUERY_LENGTH) return []

  const hits: SearchHit[] = []
  for (const team of teams) {
    const players = Array.isArray(team.players) ? team.players : []
    for (const player of players) {
      if (!player || typeof player.name !== 'string') continue
      const haystack = normalizeName(player.name)
      if (tokens.every((token) => haystack.includes(token))) {
        hits.push({ team, player, partners: players.filter((other) => other !== player) })
      }
    }
  }
  return hits
    .sort(
      (x, y) =>
        x.player.name.localeCompare(y.player.name, 'en', { sensitivity: 'base' }) ||
        x.team.id.localeCompare(y.team.id),
    )
    .slice(0, MAX_RESULTS)
}
