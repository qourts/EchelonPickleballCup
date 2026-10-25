import { describe, expect, it } from 'vitest'
import { normalizeName, searchPlayers } from './search.ts'
import { makeTeam } from './testUtils.ts'
import type { Team } from './types.ts'

const teams: Team[] = [
  makeTeam('t1', 'A', 1, ['Sample Alex Cruz', 'Sample Bea Reyes']),
  { ...makeTeam('t2', 'B', 2, ['Sample Alex Cruz', 'Sample Carlo Dela Peña']), division: 'high-intermediate' },
  { ...makeTeam('t3', 'C', 3, ['Sample José Santos', 'Sample Dana Lim']), category: 'mixed' },
]

describe('player search', () => {
  it('matches partial names without regard to case', () => {
    expect(searchPlayers(teams, 'cru').map((h) => h.player.name)).toEqual(['Sample Alex Cruz', 'Sample Alex Cruz'])
    expect(searchPlayers(teams, 'BEA')).toHaveLength(1)
  })

  it('matches words in any order and ignores accents and punctuation', () => {
    expect(searchPlayers(teams, 'cruz alex')).toHaveLength(2)
    expect(searchPlayers(teams, 'jose')).toHaveLength(1)
    expect(searchPlayers(teams, 'dela pena')).toHaveLength(1)
    expect(searchPlayers(teams, "  dela,  peña! ")).toHaveLength(1)
  })

  it('keeps players with identical names apart and gives context to tell them apart', () => {
    const hits = searchPlayers(teams, 'alex cruz')
    expect(hits).toHaveLength(2)
    expect(hits.map((h) => h.team.id).sort()).toEqual(['t1', 't2'])
    expect(hits.find((h) => h.team.id === 't1')!.partners.map((p) => p.name)).toEqual(['Sample Bea Reyes'])
    expect(hits.find((h) => h.team.id === 't2')!.team.division).toBe('high-intermediate')
  })

  it('returns nothing for empty or too-short queries', () => {
    expect(searchPlayers(teams, '')).toEqual([])
    expect(searchPlayers(teams, '   ')).toEqual([])
    expect(searchPlayers(teams, 'a')).toEqual([])
  })

  it('tolerates missing or malformed player data', () => {
    const broken = [
      { ...makeTeam('t4', 'A', 4), players: undefined },
      { ...makeTeam('t5', 'A', 1), players: [null, { id: 'x' }, { id: 'y', name: 'Sample Fine Name' }] },
      makeTeam('t6', 'A', 2),
    ] as unknown as Team[]
    expect(searchPlayers(broken, 'fine')).toHaveLength(1)
    expect(searchPlayers(broken, 'zzz')).toEqual([])
  })

  it('normalizes names predictably', () => {
    expect(normalizeName('  José  O’Neil-Cruz ')).toBe('jose o neil cruz')
  })
})
