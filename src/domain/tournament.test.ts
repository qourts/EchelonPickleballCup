import { describe, expect, it } from 'vitest'
import { buildDemoMatches, buildDemoTeams } from '../fixtures/demoTournament.ts'
import { buildTournamentView, teamLabel } from './tournament.ts'

const teams = buildDemoTeams()

describe('tournament view', () => {
  it('has no standings or qualifiers before any result is published', () => {
    const view = buildTournamentView(teams, buildDemoMatches(teams, { completedWaves: 0 }))
    expect(view.divisions).toHaveLength(2)
    for (const division of view.divisions) {
      expect(division.brackets.every((b) => b.standing.status === 'pending')).toBe(true)
      expect(division.qualification.status).toBe('pending')
    }
  })

  it('finishes each group after five rounds and resolves or flags each division honestly', () => {
    const view = buildTournamentView(teams, buildDemoMatches(teams, { completedWaves: 5 }))
    for (const division of view.divisions) {
      expect(division.brackets.every((b) => b.standing.status === 'final')).toBe(true)
      const { status, qualifiers, semifinals } = division.qualification
      expect(['ready', 'organizer-decision']).toContain(status)
      if (status === 'ready') {
        expect(qualifiers.map((q) => q.seed)).toEqual([1, 2, 3, 4])
        expect(semifinals.map((s) => [s.a.seed, s.b.seed])).toEqual([
          [1, 4],
          [2, 3],
        ])
        expect(qualifiers.every((q) => q.via !== 'wildcard')).toBe(true)
      } else {
        expect(semifinals).toHaveLength(0)
      }
    }
  })

  it('takes the top four of the group in standings order', () => {
    const view = buildTournamentView(teams, buildDemoMatches(teams, { completedWaves: 5 }))
    for (const division of view.divisions.filter((d) => d.qualification.status === 'ready')) {
      const order = division.brackets[0]!.standing.rows.slice(0, 4).map((r) => r.teamId)
      expect(division.qualification.qualifiers.map((q) => q.teamId)).toEqual(order)
    }
  })

  it('labels teams by their players, with a safe fallback', () => {
    expect(teamLabel(teams[1])).toBe('Sample Player 003 / Sample Player 004')
    expect(teamLabel(undefined)).toBe('To be determined')
    expect(teamLabel({ ...teams[1]!, players: [] })).toBe('Team 2')
  })
})

describe('partial rosters', () => {
  it('does not throw for empty or partly published divisions', () => {
    const none = buildTournamentView([], [])
    expect(none.divisions.every((d) => d.qualification.status === 'pending')).toBe(true)
    const partial = teams.filter((t) => t.slot <= 3)
    const view = buildTournamentView(partial, buildDemoMatches(partial, { completedWaves: 5 }))
    expect(view.divisions.every((d) => d.qualification.status === 'pending')).toBe(true)
  })

  it('ignores duplicate pairings and live scores in standings', () => {
    const matches = buildDemoMatches(teams, { completedWaves: 5 }).filter((m) => m.stage === 'preliminary')
    const first = matches.find((m) => m.division === 'novice')!
    const other = matches.find((m) => m.division === 'novice' && m !== first)!
    const dup = [...matches.filter((m) => m !== other), { ...first, id: 'dup' }]
    const view = buildTournamentView(teams, dup)
    const group = view.division('genderless', 'novice')!.brackets[0]!
    expect(group.standing.invalidMatchIds).toContain('dup')
    expect(group.standing.status).not.toBe('final')
    const live = matches.map((m) => (m === first ? { ...m, status: 'live' as const } : m))
    expect(buildTournamentView(teams, live).division('genderless', 'novice')!.brackets[0]!.standing.completedMatches).toBe(14)
  })
})
