import type { Qualifier } from '../domain/qualification.ts'
import { winRate } from '../domain/standings.ts'
import { teamLabel, type BracketView } from '../domain/tournament.ts'
import { Badge, TableScroll } from './ui.tsx'

const STATUS_BADGE = {
  pending: { tone: 'neutral', label: 'Awaiting results' },
  'in-progress': { tone: 'blue', label: 'Provisional' },
  final: { tone: 'ok', label: 'Final' },
} as const

export function StandingsTable({
  bracket,
  qualifiers,
}: {
  bracket: BracketView
  qualifiers: ReadonlyMap<string, Qualifier>
}) {
  const teamsById = new Map(bracket.teams.map((t) => [t.id, t]))
  const status = STATUS_BADGE[bracket.standing.status]
  const hasUnresolved = bracket.standing.rows.some((r) => r.tie === 'unresolved')

  return (
    <section className="card standings-card" aria-labelledby={`bracket-${bracket.letter}-${bracket.division}`}>
      <div className="card-head">
        <h3 id={`bracket-${bracket.letter}-${bracket.division}`}>Bracket {bracket.letter}</h3>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      <TableScroll label={`Bracket ${bracket.letter} standings`}>
        <table className="data-table standings-table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Team</th>
              <th scope="col" title="Wins and losses">
                W–L
              </th>
              <th scope="col" title="Win rate">
                Win %
              </th>
              <th scope="col" title="Points earned (official adjusted scores)">
                PE
              </th>
              <th scope="col" title="Points conceded (official adjusted scores)">
                PC
              </th>
            </tr>
          </thead>
          <tbody>
            {bracket.standing.rows.map((row) => {
              const qualifier = qualifiers.get(row.teamId)
              const { record } = row
              return (
                <tr key={row.teamId} className={qualifier ? 'is-qualified' : undefined}>
                  <td>{row.rank === null ? '–' : row.tie === 'unresolved' ? `T${row.rank}` : row.rank}</td>
                  <td className="cell-team">
                    <span>{teamLabel(teamsById.get(row.teamId))}</span>
                    {row.tie === 'head-to-head' && <small className="tie-note">Ranked by head-to-head</small>}
                    {row.tie === 'unresolved' && <small className="tie-note">Tied, not yet resolved</small>}
                    {qualifier && (
                      <Badge tone={qualifier.via === 'wildcard' ? 'blue' : 'gold'}>
                        {qualifier.via === 'wildcard' ? 'Wildcard · Seed #4' : `Seed #${qualifier.seed}`}
                      </Badge>
                    )}
                  </td>
                  <td>{record.played === 0 ? '–' : `${record.wins}–${record.losses}`}</td>
                  <td>{record.played === 0 ? '–' : `${Math.round(winRate(record) * 100)}%`}</td>
                  <td>{record.played === 0 ? '–' : record.pe}</td>
                  <td>{record.played === 0 ? '–' : record.pc}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </TableScroll>
      {hasUnresolved && (
        <p className="fine-print">
          Tied rows share a rank and are listed in draw order for display only. Head-to-head settles two-team ties;
          other ties wait for an official decision.
        </p>
      )}
      {bracket.standing.invalidMatchIds.length > 0 && (
        <p className="fine-print">
          {bracket.standing.invalidMatchIds.length} published score(s) could not be read and are not counted yet.
        </p>
      )}
    </section>
  )
}
