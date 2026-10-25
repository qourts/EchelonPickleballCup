import { CATEGORIES, DIVISIONS } from '../config/event.ts'
import type { Phase } from '../config/publication.ts'
import { isPhase } from '../domain/publication.ts'
import type {
  BracketLetter,
  CategoryId,
  DivisionId,
  Match,
  MatchStage,
  MatchStatus,
  Player,
  Score,
  Team,
  TeamSlot,
  TiebreakerKey,
} from '../domain/types.ts'
import { DataSourceError, type Loaded, type PortalStatus } from './source.ts'

/**
 * Hand-rolled validators for data crossing the network boundary. Every parser copies only the
 * fields the portal needs, so anything extra a source sends (for example contact details)
 * can never reach the interface.
 */

type Json = Record<string, unknown>

const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value)
const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() !== '' ? value : null)
const optionalText = (value: unknown): string | undefined => text(value) ?? undefined

const CATEGORY_IDS = new Set<string>(CATEGORIES.map((c) => c.id))
const DIVISION_IDS = new Set<string>(DIVISIONS.map((d) => d.id))
const STAGES = new Set<string>(['preliminary', 'semifinal', 'gold', 'bronze', 'tiebreaker'])
const STATUSES = new Set<string>(['scheduled', 'live', 'completed'])
const TIEBREAKER_KEYS = new Set<string>(['seeding', 'wildcard'])
const LETTERS = new Set<string>(['A', 'B', 'C', 'D'])

function parseScore(value: unknown): Score | null | undefined {
  if (value === null || value === undefined) return value
  if (!isObject(value)) return undefined
  const { a, b } = value
  if (typeof a !== 'number' || typeof b !== 'number' || !Number.isFinite(a) || !Number.isFinite(b)) return undefined
  return { a, b }
}

function parsePlayer(value: unknown): Player | null {
  if (!isObject(value)) return null
  const id = text(value.id)
  const name = text(value.name)
  return id && name ? { id, name } : null
}

export function parseTeam(value: unknown): Team | null {
  if (!isObject(value)) return null
  const id = text(value.id)
  const category = text(value.category)
  const division = text(value.division)
  const bracket = text(value.bracket)
  const slot = value.slot
  if (!id || !category || !division || !bracket) return null
  if (!CATEGORY_IDS.has(category) || !DIVISION_IDS.has(division) || !LETTERS.has(bracket)) return null
  const divisionInfo = DIVISIONS.find((d) => d.id === division)
  if (!divisionInfo?.brackets.includes(bracket as BracketLetter)) return null
  if (slot !== 1 && slot !== 2 && slot !== 3 && slot !== 4) return null
  if (!Array.isArray(value.players)) return null
  const players = value.players.map(parsePlayer)
  if (players.length === 0 || players.some((p) => p === null)) return null
  return {
    id,
    category: category as CategoryId,
    division: division as DivisionId,
    bracket: bracket as BracketLetter,
    slot: slot as TeamSlot,
    players: players as Player[],
  }
}

export function parseMatch(value: unknown): Match | null {
  if (!isObject(value)) return null
  const id = text(value.id)
  const stage = text(value.stage)
  const category = text(value.category)
  const division = text(value.division)
  const status = text(value.status)
  if (!id || !stage || !category || !division || !status) return null
  if (!STAGES.has(stage) || !CATEGORY_IDS.has(category) || !DIVISION_IDS.has(division) || !STATUSES.has(status)) {
    return null
  }
  const onCourt = parseScore(value.onCourt)
  const official = parseScore(value.official)
  if (onCourt === undefined && value.onCourt !== undefined) return null
  if (official === undefined && value.official !== undefined) return null

  const bracket = text(value.bracket)
  const tiebreakerKey = text(value.tiebreakerKey)
  const startsAt = text(value.startsAt)
  if (startsAt !== null && Number.isNaN(Date.parse(startsAt))) return null
  if (bracket !== null && !LETTERS.has(bracket)) return null
  if (tiebreakerKey !== null && !TIEBREAKER_KEYS.has(tiebreakerKey)) return null
  const semifinalIndex = value.semifinalIndex === 1 || value.semifinalIndex === 2 ? value.semifinalIndex : undefined
  const court = typeof value.court === 'number' && Number.isInteger(value.court) ? value.court : null

  return {
    id,
    stage: stage as MatchStage,
    category: category as CategoryId,
    division: division as DivisionId,
    bracket: (bracket ?? undefined) as BracketLetter | undefined,
    round: typeof value.round === 'number' ? value.round : undefined,
    semifinalIndex,
    tiebreakerKey: (tiebreakerKey ?? undefined) as TiebreakerKey | undefined,
    court,
    startsAt,
    teamAId: text(value.teamAId),
    teamBId: text(value.teamBId),
    labelA: optionalText(value.labelA),
    labelB: optionalText(value.labelB),
    status: status as MatchStatus,
    onCourt: onCourt ?? null,
    official: official ?? null,
    capReached: typeof value.capReached === 'boolean' ? value.capReached : undefined,
  }
}

function parseList<T>(payload: unknown, key: string, parseItem: (v: unknown) => T | null): Loaded<T> {
  const list = isObject(payload) ? payload[key] : undefined
  if (!Array.isArray(list)) throw new DataSourceError(`The data source response is missing "${key}".`)
  const items: T[] = []
  let skipped = 0
  for (const entry of list) {
    const parsed = parseItem(entry)
    if (parsed === null) skipped += 1
    else items.push(parsed)
  }
  if (skipped > 0) console.warn(`Portal data: ${skipped} malformed "${key}" record(s) were skipped.`)
  return { items, skipped }
}

export const parseRoster = (payload: unknown): Loaded<Team> => parseList(payload, 'teams', parseTeam)
export const parseMatches = (payload: unknown): Loaded<Match> => parseList(payload, 'matches', parseMatch)

export function parseStatus(payload: unknown): PortalStatus {
  if (!isObject(payload)) throw new DataSourceError('The status response was not understood.')
  const phase: Phase | null = isPhase(payload.phase) ? payload.phase : null
  if (phase === null) throw new DataSourceError('The status response did not include a valid phase.')
  return { phase, serverTime: text(payload.serverTime) }
}
