import { CATEGORIES, DIVISIONS } from '../config/event.ts'
import { qualifyDivision, type DivisionQualification } from './qualification.ts'
import { rankBracket, type BracketStanding } from './standings.ts'
import { tiebreakerResultsFrom } from './tiebreakers.ts'
import type { BracketLetter, CategoryId, DivisionId, Match, Team } from './types.ts'

export interface BracketView {
  readonly category: CategoryId
  readonly division: DivisionId
  readonly letter: BracketLetter
  /** In bracket slot order. */
  readonly teams: readonly Team[]
  readonly standing: BracketStanding
  readonly matches: readonly Match[]
}

export interface DivisionView {
  readonly category: CategoryId
  readonly division: DivisionId
  readonly brackets: readonly BracketView[]
  readonly qualification: DivisionQualification
  /** Semifinal, Gold, Bronze and tiebreaker matches published for this division. */
  readonly playoffMatches: readonly Match[]
}

export interface TournamentView {
  readonly teamsById: ReadonlyMap<string, Team>
  readonly divisions: readonly DivisionView[]
  division(category: CategoryId, division: DivisionId): DivisionView | undefined
}

/** Players of a team joined for display, e.g. "Alex Cruz / Bea Reyes". */
export function teamLabel(team: Team | undefined): string {
  if (!team) return 'To be determined'
  const names = team.players.map((p) => p.name).filter(Boolean)
  return names.length > 0 ? names.join(' / ') : `Team ${team.slot}`
}

/**
 * Join roster and published matches into the views the pages need: bracket standings,
 * semifinal qualification and playoff matches for every category and division.
 */
export function buildTournamentView(teams: readonly Team[], matches: readonly Match[]): TournamentView {
  const teamsById = new Map(teams.map((t) => [t.id, t]))
  const divisions: DivisionView[] = []

  for (const category of CATEGORIES) {
    for (const division of DIVISIONS) {
      const inDivision = matches.filter((m) => m.category === category.id && m.division === division.id)
      const brackets: BracketView[] = division.brackets.map((letter) => {
        const bracketTeams = teams
          .filter((t) => t.category === category.id && t.division === division.id && t.bracket === letter)
          .sort((x, y) => x.slot - y.slot)
        const bracketMatches = inDivision.filter((m) => m.stage === 'preliminary' && m.bracket === letter)
        return {
          category: category.id,
          division: division.id,
          letter,
          teams: bracketTeams,
          standing: rankBracket(
            bracketTeams.map((t) => t.id),
            bracketMatches,
          ),
          matches: bracketMatches,
        }
      })
      const populated = brackets.filter((b) => b.teams.length > 0)
      divisions.push({
        category: category.id,
        division: division.id,
        brackets,
        qualification: qualifyDivision({
          wildcard: division.wildcard,
          brackets: division.brackets,
          standings: Object.fromEntries(populated.map((b) => [b.letter, b.standing])),
          tiebreakerResults: tiebreakerResultsFrom(inDivision),
        }),
        playoffMatches: inDivision.filter((m) => m.stage !== 'preliminary'),
      })
    }
  }

  return {
    teamsById,
    divisions,
    division: (category, division) => divisions.find((d) => d.category === category && d.division === division),
  }
}
