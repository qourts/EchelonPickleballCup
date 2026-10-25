import { DataNotice, SkippedNotice } from '../components/DataNotice.tsx'
import { DivisionPicker, ResultsTabs, useDivisionChoice } from '../components/DivisionPicker.tsx'
import { MatchRow } from '../components/MatchRow.tsx'
import { Badge, Notice, PageHeader, TableScroll } from '../components/ui.tsx'
import { categoryInfo, divisionInfo } from '../config/event.ts'
import type { DivisionQualification, Qualifier } from '../domain/qualification.ts'
import { tryResolveOfficialScore, winningSide } from '../domain/scoring.ts'
import { teamLabel, type DivisionView } from '../domain/tournament.ts'
import type { Match, Team } from '../domain/types.ts'
import { useTournament } from '../hooks/useTournament.ts'

type TeamsById = ReadonlyMap<string, Team>

function QualificationStatus({
  division,
  teamsById,
}: {
  division: DivisionView
  teamsById: TeamsById
}) {
  const { qualification } = division
  const finished = division.brackets.filter((b) => b.standing.status === 'final').length
  const populated = division.brackets.filter((b) => b.teams.length > 0).length

  switch (qualification.status) {
    case 'pending':
      return (
        <Notice tone="gold" title="Waiting for preliminary results">
          <p>
            {finished} of {populated} brackets have finished. Semifinal qualifiers are decided once every bracket in
            this division is complete.
          </p>
        </Notice>
      )
    case 'organizer-decision':
      return (
        <Notice tone="warn" title="Pending an official organizer decision">
          <p>{qualification.reason}</p>
          <NeedList qualification={qualification} teamsById={teamsById} />
        </Notice>
      )
    case 'tiebreaker-required':
      return (
        <Notice tone="warn" title="Tiebreaker matches needed">
          <p>{qualification.reason}</p>
          <NeedList qualification={qualification} teamsById={teamsById} />
        </Notice>
      )
    case 'ready':
      return null
  }
}

function NeedList({ qualification, teamsById }: { qualification: DivisionQualification; teamsById: TeamsById }) {
  const name = (id: string) => teamLabel(teamsById.get(id))
  return (
    <ul className="need-list">
      {qualification.needs.map((need) => (
        <li key={`${need.key}-${need.format}`}>
          <strong>{need.key === 'wildcard' ? 'Wildcard' : 'Seeding'}:</strong> {need.note}
          <br />
          <span className="muted">Teams: {need.teamIds.map(name).join('; ')}</span>
          {need.matchesNeeded.length > 0 && (
            <ul>
              {need.matchesNeeded.map(([a, b]) => (
                <li key={`${a}-${b}`}>
                  {name(a)} v {name(b)}
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  )
}

function SeedTable({ qualifiers, teamsById }: { qualifiers: readonly Qualifier[]; teamsById: TeamsById }) {
  return (
    <TableScroll label="Semifinal qualifiers and seeds">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Seed</th>
            <th scope="col">Team</th>
            <th scope="col">From</th>
            <th scope="col">W–L</th>
            <th scope="col">PE</th>
            <th scope="col">PC</th>
          </tr>
        </thead>
        <tbody>
          {qualifiers.map((q) => (
            <tr key={q.teamId}>
              <td>#{q.seed}</td>
              <td className="cell-team">
                <span>{teamLabel(teamsById.get(q.teamId))}</span>
                {q.via === 'wildcard' && <Badge tone="blue">Wildcard</Badge>}
              </td>
              <td>Bracket {q.bracket}</td>
              <td>
                {q.record.wins}–{q.record.losses}
              </td>
              <td>{q.record.pe}</td>
              <td>{q.record.pc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  )
}

function Pairings({ qualification, teamsById }: { qualification: DivisionQualification; teamsById: TeamsById }) {
  return (
    <>
      <ul className="pairing-list">
        {qualification.semifinals.map((semi) => (
          <li key={semi.index} className="card pairing">
            <p className="pairing-title">Semifinal {semi.index}</p>
            <p>
              <Badge tone="gold">#{semi.a.seed}</Badge> {teamLabel(teamsById.get(semi.a.teamId))}
            </p>
            <p className="muted">versus</p>
            <p>
              <Badge tone={semi.b.via === 'wildcard' ? 'blue' : 'gold'}>#{semi.b.seed}</Badge>{' '}
              {teamLabel(teamsById.get(semi.b.teamId))}
            </p>
          </li>
        ))}
      </ul>
      {qualification.sameBracketException && (
        <p className="fine-print">
          Seed #1 and the wildcard come from the same preliminary bracket, so the pairings are Seed #1 v Seed #3 and Seed #2 v
          Seed #4 to avoid an immediate rematch.
        </p>
      )}
    </>
  )
}

interface Podium {
  readonly gold: { winner: string; runnerUp: string } | null
  readonly bronze: { winner: string } | null
}

function podiumOf(matches: readonly Match[], teamsById: TeamsById): Podium {
  const decided = (stage: 'gold' | 'bronze') => {
    const match = matches.find((m) => m.stage === stage && m.status === 'completed' && m.teamAId && m.teamBId)
    if (!match) return null
    const { score } = tryResolveOfficialScore(match)
    if (!score) return null
    const aWins = winningSide(score) === 'a'
    const winnerId = aWins ? match.teamAId : match.teamBId
    const loserId = aWins ? match.teamBId : match.teamAId
    return { winner: teamLabel(teamsById.get(winnerId!)), loser: teamLabel(teamsById.get(loserId!)) }
  }
  const gold = decided('gold')
  const bronze = decided('bronze')
  return {
    gold: gold ? { winner: gold.winner, runnerUp: gold.loser } : null,
    bronze: bronze ? { winner: bronze.winner } : null,
  }
}

function PodiumCard({ podium }: { podium: Podium }) {
  if (!podium.gold && !podium.bronze) return null
  return (
    <section className="card podium" aria-label="Medal results">
      <h3>Medal results</h3>
      <ul>
        {podium.gold && (
          <>
            <li>
              <Badge tone="gold">Gold</Badge> {podium.gold.winner}
            </li>
            <li>
              <Badge>Runner-up</Badge> {podium.gold.runnerUp}
            </li>
          </>
        )}
        {podium.bronze && (
          <li>
            <Badge tone="warn">Bronze</Badge> {podium.bronze.winner}
          </li>
        )}
      </ul>
    </section>
  )
}

export function Playoffs() {
  const choice = useDivisionChoice()
  const { roster, matches, view, skipped, reload } = useTournament()
  const division = view?.division(choice.category, choice.division)
  const teamsById: TeamsById = view?.teamsById ?? new Map()

  return (
    <>
      <PageHeader
        eyebrow="Results"
        title="Playoffs"
        lead="Semifinal qualifiers, seeds and pairings, then the Gold and Bronze matches."
      />
      <ResultsTabs />
      <DivisionPicker {...choice} />
      <DataNotice resource={roster} noun="playoff information" onRetry={reload} />
      {roster.status === 'ready' && <DataNotice resource={matches} noun="match results" onRetry={reload} />}
      <SkippedNotice skipped={skipped} />
      {division && (
        <section aria-labelledby="playoffs-title">
          <h2 id="playoffs-title">
            {categoryInfo(choice.category).name} · {divisionInfo(choice.division).name}
          </h2>
          <QualificationStatus division={division} teamsById={teamsById} />
          {division.qualification.status === 'ready' && (
            <>
              <h3>Qualifiers</h3>
              <SeedTable qualifiers={division.qualification.qualifiers} teamsById={teamsById} />
              <h3>Semifinal pairings</h3>
              <Pairings qualification={division.qualification} teamsById={teamsById} />
            </>
          )}
          <PodiumCard podium={podiumOf(division.playoffMatches, teamsById)} />
          <h3>Playoff matches</h3>
          {division.playoffMatches.length === 0 ? (
            <p className="muted">No playoff matches have been published for this division yet.</p>
          ) : (
            <ul className="match-list">
              {[...division.playoffMatches]
                .sort((x, y) => (x.startsAt ?? '').localeCompare(y.startsAt ?? '') || x.id.localeCompare(y.id))
                .map((match) => (
                  <li key={match.id}>
                    <MatchRow match={match} teamsById={teamsById} />
                  </li>
                ))}
            </ul>
          )}
          <p className="fine-print">
            Semifinals use the same scoring as preliminaries (first to 11, 15-minute cap). Gold and Bronze are first to 11,
            win by two, with no time cap.
          </p>
        </section>
      )}
    </>
  )
}
