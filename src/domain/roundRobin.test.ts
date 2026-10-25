import { describe, expect, it } from 'vitest'
import { roundRobinPairings } from './roundRobin.ts'

describe('four-team round robin', () => {
  const pairings = roundRobinPairings(['T1', 'T2', 'T3', 'T4'])

  it('produces six distinct matches', () => {
    expect(pairings).toHaveLength(6)
    const keys = pairings.map((p) => [p.teamA, p.teamB].sort().join('-'))
    expect(new Set(keys).size).toBe(6)
  })

  it('gives every team exactly three matches against three different opponents', () => {
    for (const id of ['T1', 'T2', 'T3', 'T4']) {
      const mine = pairings.filter((p) => p.teamA === id || p.teamB === id)
      expect(mine).toHaveLength(3)
      const opponents = mine.map((p) => (p.teamA === id ? p.teamB : p.teamA))
      expect(new Set(opponents).size).toBe(3)
    }
  })

  it('follows the published wave order', () => {
    expect(pairings.map((p) => `${p.teamA}v${p.teamB}`)).toEqual([
      'T1vT2',
      'T3vT4',
      'T1vT3',
      'T2vT4',
      'T1vT4',
      'T3vT2',
    ])
    expect(pairings.map((p) => p.round)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('rejects brackets that are not four distinct teams', () => {
    expect(() => roundRobinPairings(['T1', 'T2', 'T3'])).toThrow()
    expect(() => roundRobinPairings(['T1', 'T1', 'T3', 'T4'])).toThrow()
  })
})
