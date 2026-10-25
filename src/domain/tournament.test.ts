import { describe, expect, it } from 'vitest'
import { buildDemoMatches, buildDemoTeams } from '../fixtures/demoTournament.ts'
import { buildTournamentView, teamLabel } from './tournament.ts'

const teams = buildDemoTeams()

describe('tournament view', () => {
  it('has no standings or qualifiers before any result is published', () => {
    const view = buildTournamentView(teams, buildDemoMatches(teams, { completedWaves: 0 }))
    expect(view.divisions).toHaveLength(12)
    for (const division of view.divisions) {
      expect(division.brackets.every((b) => b.standing.status === 'pending')).toBe(true)
      expect(division.qualification.status).toBe('pending')
    }
  })

  it('finishes every bracket after six waves and resolves or flags each division honestly', () => {
    const view = buildTournamentView(teams, buildDemoMatches(teams, { completedWaves: 6 }))
    for (const division of view.divisions) {
      expect(division.brackets.every((b) => b.standing.status === 'final')).toBe(true)
      const { status, qualifiers, semifinals } = division.qualification
      expect(['ready', 'tiebreaker-required', 'organizer-decision']).toContain(status)
      if (status === 'ready') {
        expect(qualifiers).toHaveLength(4)
        expect(semifinals).toHaveLength(2)
        expect(new Set(qualifiers.map((q) => q.teamId)).size).toBe(4)
      } else {
        expect(semifinals).toHaveLength(0)
      }
    }
  })

  it('sends a wildcard only from three-bracket divisions', () => {
    const view = buildTournamentView(teams, buildDemoMatches(teams, { completedWaves: 6 }))
    for (const division of view.divisions) {
      const wildcards = division.qualification.qualifiers.filter((q) => q.via === 'wildcard')
      expect(wildcards).toHaveLength(
        division.qualification.status === 'ready' && division.division !== 'low-intermediate' ? 1 : 0,
      )
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
    const partial = teams.filter((t) => t.bracket === 'A')
    const view = buildTournamentView(partial, buildDemoMatches(partial, { completedWaves: 6 }))
    expect(view.divisions.every((d) => d.qualification.status === 'pending')).toBe(true)
  })

  it('ignores duplicate pairings and live scores in standings', () => {
    const matches = buildDemoMatches(teams, { completedWaves: 6 }).filter((m) => m.stage === 'preliminary')
    const first = matches[0]!
    const dup = [...matches.filter((m) => m !== matches[5]), { ...first, id: 'dup' }]
    const view = buildTournamentView(teams, dup)
    const bracket = view.divisions[0]!.brackets[0]!
    expect(bracket.standing.invalidMatchIds).toContain('dup')
    expect(bracket.standing.status).not.toBe('final')
    const live = matches.map((m) => (m === first ? { ...m, status: 'live' as const } : m))
    expect(buildTournamentView(teams, live).divisions[0]!.brackets[0]!.standing.completedMatches).toBe(5)
  })
})
