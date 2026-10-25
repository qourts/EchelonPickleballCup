import { describe, expect, it } from 'vitest'
import { qualifyDivision } from './qualification.ts'
import type { BracketStanding } from './standings.ts'
import type { TiebreakerResult } from './tiebreakers.ts'
import { finalStanding, record } from './testUtils.ts'
import type { BracketLetter } from './types.ts'

type Spec = readonly [wins: number, pe: number, pc: number]

/** A finished bracket; rows are listed in rank order and ids are `${letter}1`..`${letter}4`. */
function bracket(letter: BracketLetter, specs: readonly Spec[]): BracketStanding {
  return finalStanding(specs.map(([w, pe, pc], i) => record(`${letter}${i + 1}`, w, 3, pe, pc)))
}

const TAIL: readonly Spec[] = [
  [1, 20, 30],
  [0, 10, 33],
]

const threeBrackets = (a: readonly Spec[], b: readonly Spec[], c: readonly Spec[]) => ({
  A: bracket('A', [...a, ...TAIL]),
  B: bracket('B', [...b, ...TAIL]),
  C: bracket('C', [...c, ...TAIL]),
})

const NOVICE = { wildcard: true, brackets: ['A', 'B', 'C'] as BracketLetter[] }

const race = (key: TiebreakerResult['key'], a: string, b: string, scoreA: number, scoreB: number): TiebreakerResult => ({
  key,
  teamAId: a,
  teamBId: b,
  score: { a: scoreA, b: scoreB },
})

describe('semifinal qualification with a wildcard', () => {
  // Winners: A1 (3-0, PE 33, PC 10), B1 (3-0, 33, 12), C1 (2-1, 31, 22).
  // Seconds: A2 (2-1, 30, 20), B2 (2-1, 32, 18), C2 (2-1, 29, 25) -> B2 is the best second.
  const standings = threeBrackets(
    [[3, 33, 10], [2, 30, 20]],
    [[3, 33, 12], [2, 32, 18]],
    [[2, 31, 22], [2, 29, 25]],
  )

  it('seeds bracket winners #1-#3 and makes the best second-place team Seed #4', () => {
    const result = qualifyDivision({ ...NOVICE, standings, tiebreakerResults: [] })
    expect(result.status).toBe('ready')
    expect(result.qualifiers.map((q) => [q.seed, q.teamId, q.via])).toEqual([
      [1, 'A1', 'bracket-winner'],
      [2, 'B1', 'bracket-winner'],
      [3, 'C1', 'bracket-winner'],
      [4, 'B2', 'wildcard'],
    ])
  })

  it('keeps the wildcard at Seed #4 even though its record beats a bracket winner', () => {
    const result = qualifyDivision({ ...NOVICE, standings, tiebreakerResults: [] })
    const seed3 = result.qualifiers.find((q) => q.seed === 3)!
    const wildcard = result.qualifiers.find((q) => q.via === 'wildcard')!
    expect(wildcard.record.pe).toBeGreaterThan(seed3.record.pe)
    expect(wildcard.seed).toBe(4)
    expect(seed3.teamId).toBe('C1')
  })

  it('pairs #1 v #4 and #2 v #3 normally', () => {
    const result = qualifyDivision({ ...NOVICE, standings, tiebreakerResults: [] })
    expect(result.sameBracketException).toBe(false)
    expect(result.semifinals.map((s) => [s.a.teamId, s.b.teamId])).toEqual([
      ['A1', 'B2'],
      ['B1', 'C1'],
    ])
  })

  it('picks the wildcard by comparing only second-place records', () => {
    // C1 is a poor winner; the best second (B2) must not be ranked against winners to be chosen.
    const weakWinner = threeBrackets(
      [[3, 33, 10], [2, 30, 20]],
      [[3, 33, 12], [2, 32, 18]],
      [[1, 15, 40], [1, 40, 5]],
    )
    const result = qualifyDivision({ ...NOVICE, standings: weakWinner, tiebreakerResults: [] })
    // C2 (1-2, PE 40) is the best raw PE of any second, but 2-1 records win on win rate first.
    expect(result.qualifiers.find((q) => q.via === 'wildcard')!.teamId).toBe('B2')
    expect(result.qualifiers.find((q) => q.seed === 3)!.teamId).toBe('C1')
  })

  it('switches to #1 v #3 and #2 v #4 when Seed #1 and the wildcard share a bracket', () => {
    const sameBracket = threeBrackets(
      [[3, 33, 10], [2, 34, 15]],
      [[3, 33, 12], [2, 30, 18]],
      [[2, 31, 22], [2, 29, 25]],
    )
    const result = qualifyDivision({ ...NOVICE, standings: sameBracket, tiebreakerResults: [] })
    expect(result.qualifiers.find((q) => q.via === 'wildcard')!.teamId).toBe('A2')
    expect(result.sameBracketException).toBe(true)
    expect(result.semifinals.map((s) => [s.a.teamId, s.b.teamId])).toEqual([
      ['A1', 'C1'],
      ['B1', 'A2'],
    ])
  })

  it('does not apply the exception when the wildcard shares a bracket with Seed #2', () => {
    const result = qualifyDivision({ ...NOVICE, standings, tiebreakerResults: [] })
    expect(result.qualifiers.find((q) => q.seed === 2)!.bracket).toBe(
      result.qualifiers.find((q) => q.via === 'wildcard')!.bracket,
    )
    expect(result.sameBracketException).toBe(false)
  })
})

describe('Low Intermediate qualification (four brackets, no wildcard)', () => {
  const low = {
    wildcard: false,
    brackets: ['A', 'B', 'C', 'D'] as BracketLetter[],
    standings: {
      A: bracket('A', [[3, 33, 5], [2, 30, 20], ...TAIL]),
      B: bracket('B', [[3, 33, 9], [2, 30, 20], ...TAIL]),
      C: bracket('C', [[2, 30, 20], [2, 29, 22], ...TAIL]),
      D: bracket('D', [[3, 31, 3], [2, 30, 20], ...TAIL]),
    },
    tiebreakerResults: [],
  }

  it('advances only the four bracket winners, seeded #1-#4', () => {
    const result = qualifyDivision(low)
    expect(result.status).toBe('ready')
    expect(result.qualifiers.map((q) => [q.seed, q.teamId, q.via])).toEqual([
      [1, 'A1', 'bracket-winner'],
      [2, 'B1', 'bracket-winner'],
      [3, 'D1', 'bracket-winner'],
      [4, 'C1', 'bracket-winner'],
    ])
    expect(result.sameBracketException).toBe(false)
  })

  it('pairs #1 v #4 and #2 v #3 with no wildcard rules', () => {
    const result = qualifyDivision(low)
    expect(result.semifinals.map((s) => [s.a.teamId, s.b.teamId])).toEqual([
      ['A1', 'C1'],
      ['B1', 'D1'],
    ])
  })
})

describe('cross-bracket ties', () => {
  const tiedWinners = threeBrackets(
    [[3, 33, 10], [2, 30, 20]],
    [[3, 33, 10], [2, 32, 18]],
    [[2, 31, 22], [2, 29, 25]],
  )

  it('requires one race-to-6 match for a two-team tie in seeding', () => {
    const result = qualifyDivision({ ...NOVICE, standings: tiedWinners, tiebreakerResults: [] })
    expect(result.status).toBe('tiebreaker-required')
    expect(result.needs).toHaveLength(1)
    expect(result.needs[0]).toMatchObject({ key: 'seeding', format: 'single-match', matchesNeeded: [['A1', 'B1']] })
  })

  it('uses the deciding match to seed the tied teams and leaves preliminary records alone', () => {
    const result = qualifyDivision({
      ...NOVICE,
      standings: tiedWinners,
      tiebreakerResults: [race('seeding', 'A1', 'B1', 4, 6)],
    })
    expect(result.status).toBe('ready')
    expect(result.qualifiers.slice(0, 2).map((q) => q.teamId)).toEqual(['B1', 'A1'])
    expect(result.qualifiers[0]!.record).toEqual(record('B1', 3, 3, 33, 10))
    expect(result.qualifiers[1]!.record).toEqual(record('A1', 3, 3, 33, 10))
  })

  it('ignores tiebreaker results from a different context', () => {
    const result = qualifyDivision({
      ...NOVICE,
      standings: tiedWinners,
      tiebreakerResults: [race('wildcard', 'A1', 'B1', 6, 1)],
    })
    expect(result.status).toBe('tiebreaker-required')
  })

  const tiedSeconds = threeBrackets(
    [[3, 33, 10], [2, 30, 20]],
    [[3, 32, 12], [2, 30, 20]],
    [[2, 31, 22], [2, 30, 20]],
  )

  it('requires a mini round robin when three teams tie for the wildcard', () => {
    const result = qualifyDivision({ ...NOVICE, standings: tiedSeconds, tiebreakerResults: [] })
    expect(result.status).toBe('tiebreaker-required')
    expect(result.needs[0]).toMatchObject({ key: 'wildcard', format: 'mini-round-robin' })
    expect(result.needs[0]!.matchesNeeded).toEqual([
      ['A2', 'B2'],
      ['A2', 'C2'],
      ['B2', 'C2'],
    ])
  })

  it('ranks the mini round robin by wins, then tiebreaker PE, then lowest tiebreaker PC', () => {
    // Every team wins once, so tiebreaker PE then PC decide:
    // A2: beats C2 6-3, loses to B2 5-6 -> wins 1, PE 11, PC 9
    // B2: beats A2 6-5, loses to C2 4-6 -> wins 1, PE 10, PC 11
    // C2: beats B2 6-4, loses to A2 3-6 -> wins 1, PE 9, PC 10
    const result = qualifyDivision({
      ...NOVICE,
      standings: tiedSeconds,
      tiebreakerResults: [
        race('wildcard', 'A2', 'B2', 5, 6),
        race('wildcard', 'A2', 'C2', 6, 3),
        race('wildcard', 'B2', 'C2', 4, 6),
      ],
    })
    expect(result.status).toBe('ready')
    expect(result.qualifiers.find((q) => q.via === 'wildcard')!.teamId).toBe('A2')
  })

  it('breaks a 1-1-1 mini round robin on tiebreaker PE when the totals differ', () => {
    // A2 beats B2 6-3, B2 beats C2 6-3, C2 beats A2 6-4: A2 has the highest tiebreaker PE (10).
    const result = qualifyDivision({
      ...NOVICE,
      standings: tiedSeconds,
      tiebreakerResults: [
        race('wildcard', 'A2', 'B2', 6, 3),
        race('wildcard', 'B2', 'C2', 6, 3),
        race('wildcard', 'C2', 'A2', 6, 4),
      ],
    })
    expect(result.status).toBe('ready')
    expect(result.qualifiers.find((q) => q.via === 'wildcard')!.teamId).toBe('A2')
  })

  it('needs additional deciding matches when the mini round robin leaves all three level', () => {
    const result = qualifyDivision({
      ...NOVICE,
      standings: tiedSeconds,
      tiebreakerResults: [
        race('wildcard', 'A2', 'B2', 6, 3),
        race('wildcard', 'B2', 'C2', 6, 3),
        race('wildcard', 'C2', 'A2', 6, 3),
      ],
    })
    expect(result.status).toBe('tiebreaker-required')
    expect(result.needs[0]).toMatchObject({ key: 'wildcard', format: 'additional-deciders' })
  })

  it('does not block on ties that cannot change the wildcard', () => {
    const lowerTie = threeBrackets(
      [[3, 33, 10], [2, 35, 20]],
      [[3, 32, 12], [2, 30, 20]],
      [[2, 31, 22], [2, 30, 20]],
    )
    const result = qualifyDivision({ ...NOVICE, standings: lowerTie, tiebreakerResults: [] })
    expect(result.status).toBe('ready')
    expect(result.qualifiers.find((q) => q.via === 'wildcard')!.teamId).toBe('A2')
  })

  it('keeps ties of four or more teams pending an organizer decision', () => {
    const level: Spec = [3, 33, 10]
    const result = qualifyDivision({
      wildcard: false,
      brackets: ['A', 'B', 'C', 'D'],
      standings: {
        A: bracket('A', [level, ...TAIL]),
        B: bracket('B', [level, ...TAIL]),
        C: bracket('C', [level, ...TAIL]),
        D: bracket('D', [level, ...TAIL]),
      },
      tiebreakerResults: [],
    })
    expect(result.status).toBe('organizer-decision')
    expect(result.needs[0]).toMatchObject({ format: 'organizer-decision' })
    expect(result.qualifiers).toHaveLength(0)
  })
})

describe('qualification readiness', () => {
  it('stays pending until every bracket in the division is final', () => {
    const standings = threeBrackets([[3, 33, 10]], [[3, 33, 12]], [[2, 31, 22]])
    const partial = { ...standings, C: { ...standings.C, status: 'in-progress' as const } }
    const result = qualifyDivision({ ...NOVICE, standings: partial, tiebreakerResults: [] })
    expect(result.status).toBe('pending')
    expect(result.qualifiers).toHaveLength(0)
  })

  it('defers to the organizer when a bracket tie for first place cannot be settled', () => {
    const standings = threeBrackets([[3, 33, 10]], [[3, 33, 12]], [[2, 31, 22]])
    const unresolved = {
      ...standings,
      A: {
        ...standings.A,
        rows: standings.A.rows.map((row, i) => (i < 3 ? { ...row, rank: 1, tie: 'unresolved' as const } : row)),
      },
    }
    const result = qualifyDivision({ ...NOVICE, standings: unresolved, tiebreakerResults: [] })
    expect(result.status).toBe('organizer-decision')
  })
})
