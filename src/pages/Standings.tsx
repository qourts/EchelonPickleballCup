import { Link } from 'react-router-dom'
import { DataNotice, SkippedNotice } from '../components/DataNotice.tsx'
import { DivisionPicker, ResultsTabs, useDivisionChoice } from '../components/DivisionPicker.tsx'
import { StandingsTable } from '../components/StandingsTable.tsx'
import { Notice, PageHeader } from '../components/ui.tsx'
import { categoryInfo, divisionInfo } from '../config/event.ts'
import { useTournament } from '../hooks/useTournament.ts'

export function Standings() {
  const choice = useDivisionChoice()
  const { roster, matches, view, skipped, reload } = useTournament()
  const division = view?.division(choice.category, choice.division)
  const qualifiers = new Map((division?.qualification.qualifiers ?? []).map((q) => [q.teamId, q]))
  const anyResults = division?.brackets.some((b) => b.standing.status !== 'pending') ?? false

  return (
    <>
      <PageHeader
        eyebrow="Results"
        title="Standings"
        lead="Preliminary bracket standings from official adjusted scores: win rate, then points earned, then fewest points conceded."
      />
      <ResultsTabs />
      <DivisionPicker {...choice} />
      <DataNotice resource={roster} noun="bracket standings" onRetry={reload} />
      {roster.status === 'ready' && <DataNotice resource={matches} noun="match results" onRetry={reload} />}
      <SkippedNotice skipped={skipped} />
      {division && (
        <section aria-labelledby="standings-title">
          <h2 id="standings-title">
            {categoryInfo(choice.category).name} · {divisionInfo(choice.division).name}
          </h2>
          {!anyResults && matches.status === 'ready' && (
            <Notice tone="gold" title="No results yet">
              <p>
                Standings appear as official scores are published. Every team in this division has three guaranteed
                matches.
              </p>
            </Notice>
          )}
          <div className="standings-grid">
            {division.brackets
              .filter((b) => b.teams.length > 0)
              .map((bracket) => (
                <StandingsTable key={bracket.letter} bracket={bracket} qualifiers={qualifiers} />
              ))}
          </div>
          {division.brackets.every((b) => b.teams.length === 0) && (
            <Notice title="No teams assigned">
              <p>No teams have been published for this category and division.</p>
            </Notice>
          )}
          <p className="fine-print">
            Win rate, PE and PC use official adjusted scores (an 8–6 result at the 15-minute cap counts as 11–6).{' '}
            <Link to={`/playoffs?cat=${choice.category}&div=${choice.division}`}>See this division&apos;s playoffs →</Link>
          </p>
        </section>
      )}
    </>
  )
}
