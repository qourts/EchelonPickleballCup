import { describe, expect, it } from 'vitest'
import { compareRecords, computeRecords, rankBracket } from './standings.ts'
import { bracketMatches, record } from './testUtils.ts'
import type { Match } from './types.ts'

const TEAMS = ['T1', 'T2', 'T3', 'T4']

// T1 and T2 finish level on win rate (2-1), PE (28) and PC (25); T1 won their meeting.
const TWO_WAY_TIE_SCORES = [
  { a: 11, b: 6 }, // T1 v T2
  { a: 11, b: 8 }, // T3 v T4
  { a: 11, b: 8 }, // T1 v T3
  { a: 11, b: 7 }, // T2 v T4
  { a: 6, b: 11 }, // T1 v T4
  { a: 7, b: 11 }, // T3 v T2
]

// T1, T2, T3 form a cycle and each beats T4 by the same scores: a genuine three-way tie.
const THREE_WAY_TIE_SCORES = [
  { a: 11, b: 5 },
  { a: 11, b: 5 },
  { a: 5, b: 11 },
  { a: 11, b: 5 },
  { a: 11, b: 5 },
  { a: 5, b: 11 },
]

describe('preliminary standings', () => {
  it('counts PE and PC from official adjusted scores, not on-court scores', () => {
    const capped: Match = {
      ...bracketMatches(TEAMS, [])[0]!,
      official: undefined,
      onCourt: { a: 8, b: 6 },
      capReached: true,
    }
    const [t1, t2] = computeRecords(['T1', 'T2'], [capped])
    expect(t1).toMatchObject({ wins: 1, pe: 11, pc: 6 })
    expect(t2).toMatchObject({ wins: 0, pe: 6, pc: 11 })
  })

  it('ranks by win rate, then points earned, then fewest points conceded', () => {
    expect(compareRecords(record('x', 3, 3, 20, 30), record('y', 2, 3, 40, 10))).toBeLessThan(0)
    expect(compareRecords(record('x', 2, 3, 30, 30), record('y', 2, 3, 28, 10))).toBeLessThan(0)
    expect(compareRecords(record('x', 2, 3, 30, 20), record('y', 2, 3, 30, 25))).toBeLessThan(0)
    expect(compareRecords(record('x', 2, 3, 30, 20), record('y', 2, 3, 30, 20))).toBe(0)
  })

  it('compares win rates exactly when teams have played different numbers of matches', () => {
    expect(compareRecords(record('x', 1, 2, 0, 0), record('y', 2, 4, 0, 0))).toBe(0)
    expect(compareRecords(record('x', 2, 3, 0, 0), record('y', 3, 5, 0, 0))).toBeLessThan(0)
  })

  it('settles a two-team tie by head-to-head', () => {
    const matches = bracketMatches(TEAMS, TWO_WAY_TIE_SCORES)
    const standing = rankBracket(TEAMS, matches)
    expect(standing.status).toBe('final')
    const records = computeRecords(TEAMS, matches)
    expect(compareRecords(records[0]!, records[1]!)).toBe(0)

    expect(standing.rows.slice(0, 2).map((r) => [r.teamId, r.rank, r.tie])).toEqual([
      ['T1', 1, 'head-to-head'],
      ['T2', 2, 'head-to-head'],
    ])
  })

  it('lets the head-to-head winner rank first regardless of slot order', () => {
    // Same scenario with T1 and T2 swapped: now T2 owns the head-to-head win.
    const swap = (id: string) => ({ T1: 'T2', T2: 'T1' })[id as 'T1' | 'T2'] ?? id
    const matches = bracketMatches(TEAMS, TWO_WAY_TIE_SCORES).map((m) => ({
      ...m,
      teamAId: swap(m.teamAId!),
      teamBId: swap(m.teamBId!),
    }))
    const standing = rankBracket(TEAMS, matches)
    expect(standing.rows[0]).toMatchObject({ teamId: 'T2', rank: 1, tie: 'head-to-head' })
    expect(standing.rows[1]).toMatchObject({ teamId: 'T1', rank: 2, tie: 'head-to-head' })
  })

  it('reports a three-team tie as unresolved with a shared rank, not an invented order', () => {
    const standing = rankBracket(TEAMS, bracketMatches(TEAMS, THREE_WAY_TIE_SCORES))
    const tied = standing.rows.filter((r) => r.tie === 'unresolved')
    expect(tied.map((r) => r.teamId).sort()).toEqual(['T1', 'T2', 'T3'])
    expect(new Set(tied.map((r) => r.rank))).toEqual(new Set([1]))
    expect(standing.rows[3]).toMatchObject({ teamId: 'T4', rank: 4, tie: 'none' })
  })

  it('reports pending, in-progress and final bracket states', () => {
    const all = bracketMatches(TEAMS, TWO_WAY_TIE_SCORES)
    expect(rankBracket(TEAMS, bracketMatches(TEAMS, [])).status).toBe('pending')
    expect(rankBracket(TEAMS, all.slice(0, 3)).status).toBe('in-progress')
    expect(rankBracket(TEAMS, all).status).toBe('final')
  })

  it('leaves preliminary records untouched by tiebreaker matches', () => {
    const matches = bracketMatches(TEAMS, THREE_WAY_TIE_SCORES)
    const before = computeRecords(TEAMS, matches)
    const tiebreaker: Match = {
      id: 'tb1',
      stage: 'tiebreaker',
      tiebreakerKey: 'seeding',
      category: 'genderless',
      division: 'novice',
      court: 1,
      startsAt: null,
      teamAId: 'T1',
      teamBId: 'T2',
      status: 'completed',
      official: { a: 6, b: 2 },
    }
    expect(computeRecords(TEAMS, [...matches, tiebreaker])).toEqual(before)
  })

  it('excludes matches with impossible scores and says so', () => {
    const matches = bracketMatches(TEAMS, TWO_WAY_TIE_SCORES)
    const broken = [{ ...matches[0]!, official: { a: 9, b: 7 } }, ...matches.slice(1)]
    const standing = rankBracket(TEAMS, broken)
    expect(standing.invalidMatchIds).toEqual(['m1'])
    expect(standing.completedMatches).toBe(5)
  })
})
