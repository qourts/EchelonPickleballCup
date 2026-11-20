import { eventInstant } from '../domain/schedule.ts'
import type { DivisionId, Match } from '../domain/types.ts'
import { DIVISIONS, EVENT } from './event.ts'
import { ROUND_ROBIN_ROUNDS } from './rules.ts'

/**
 * The published tournament-day schedule. The same ids, courts and times are seeded in
 * supabase/echelon_cup.sql; keep the two in step.
 */
const hm = (h: number, m: number) => h * 60 + m

type EventDivision = 'novice' | 'low-intermediate'

/** Start of each preliminary round, minutes after midnight (Asia/Manila). */
const ROUND_STARTS: Record<EventDivision, readonly number[]> = {
  novice: [hm(9, 0), hm(9, 50), hm(10, 40), hm(11, 30), hm(12, 20)],
  'low-intermediate': [hm(9, 25), hm(10, 15), hm(11, 5), hm(11, 55), hm(12, 45)],
}

/** Novice plays its playoffs on court 8, Low Intermediate on court 10. */
const PLAYOFF_COURT: Record<EventDivision, number> = { novice: 8, 'low-intermediate': 10 }

function scheduled(match: Omit<Match, 'category' | 'bracket' | 'status'>): Match {
  return { ...match, category: 'genderless', bracket: 'A', status: 'scheduled' }
}

function buildSchedule(): Match[] {
  const matches: Match[] = []
  for (const division of DIVISIONS) {
    const id = division.id as EventDivision
    const c = division.code
    ROUND_ROBIN_ROUNDS.forEach((pairs, i) => {
      pairs.forEach(([a, b], j) => {
        const court = EVENT.courtNumbers[j]!
        matches.push(
          scheduled({
            id: `${c}-R${i + 1}-C${court}`,
            stage: 'preliminary',
            division: id,
            round: i + 1,
            court,
            startsAt: eventInstant(ROUND_STARTS[id][i]!),
            teamAId: `${c}${a}`,
            teamBId: `${c}${b}`,
          }),
        )
      })
    })
    const court = PLAYOFF_COURT[id]
    const playoff = (
      suffix: string,
      stage: Match['stage'],
      at: number,
      labelA: string,
      labelB: string,
      semifinalIndex?: 1 | 2,
    ) =>
      scheduled({
        id: `${c}-${suffix}`,
        stage,
        division: id,
        round: semifinalIndex ?? 1,
        semifinalIndex,
        court,
        startsAt: eventInstant(at),
        teamAId: null,
        teamBId: null,
        labelA,
        labelB,
      })
    matches.push(
      playoff('SF1', 'semifinal', hm(13, 20), 'Seed #1', 'Seed #4', 1),
      playoff('SF2', 'semifinal', hm(13, 45), 'Seed #2', 'Seed #3', 2),
      playoff('BRONZE', 'bronze', hm(14, 20), 'Loser SF1', 'Loser SF2'),
      playoff('GOLD', 'gold', hm(14, 45), 'Winner SF1', 'Winner SF2'),
    )
  }
  return matches
}

/** All 38 matches: 15 preliminaries per division, two semifinals, Bronze and Gold. */
export const EVENT_MATCHES: readonly Match[] = buildSchedule()

export interface DayPlanRow {
  readonly start: number
  readonly end: number
  readonly what: string
  readonly courts: string
  readonly division?: DivisionId
}

const round = (division: EventDivision, n: number): DayPlanRow => ({
  start: ROUND_STARTS[division][n - 1]!,
  end: ROUND_STARTS[division][n - 1]! + 25,
  what: `${division === 'novice' ? 'Novice' : 'Low Intermediate'} · Round ${n}`,
  courts: 'Courts 8, 9 and 10',
  division,
})

const PLAYOFF_COURTS_TEXT = 'Novice court 8 · Low Int. court 10'

/** The day at a glance, in order. */
export const DAY_PLAN: readonly DayPlanRow[] = [
  ...[1, 2, 3, 4, 5].flatMap((n) => [round('novice', n), round('low-intermediate', n)]),
  { start: hm(13, 10), end: hm(13, 20), what: 'Break', courts: '' },
  { start: hm(13, 20), end: hm(13, 45), what: 'Semifinals · #1 v #4', courts: PLAYOFF_COURTS_TEXT },
  { start: hm(13, 45), end: hm(14, 10), what: 'Semifinals · #2 v #3', courts: PLAYOFF_COURTS_TEXT },
  { start: hm(14, 10), end: hm(14, 20), what: 'Break', courts: '' },
  { start: hm(14, 20), end: hm(14, 45), what: 'Bronze medal matches', courts: PLAYOFF_COURTS_TEXT },
  { start: hm(14, 45), end: hm(15, 10), what: 'Gold medal matches', courts: PLAYOFF_COURTS_TEXT },
  { start: hm(15, 10), end: hm(15, 30), what: 'Awarding', courts: '' },
]
