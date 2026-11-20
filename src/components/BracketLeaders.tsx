import { Link } from 'react-router-dom'
import { BRACKET_FORMAT } from '../config/rules.ts'
import { DIVISIONS } from '../config/event.ts'
import { teamLabel, type BracketView, type DivisionView } from '../domain/tournament.ts'
import type { CategoryId, Team } from '../domain/types.ts'
import { Badge } from './ui.tsx'

function Leaders({ bracket }: { bracket: BracketView }) {
  const teamsById = new Map<string, Team>(bracket.teams.map((t) => [t.id, t]))
  const top = bracket.standing.rows.slice(0, BRACKET_FORMAT.qualifiersPerDivision)

  if (bracket.standing.status === 'pending') return <p className="muted">Awaiting results</p>
  return (
    <ul>
      {top.map((row, i) => (
        <li key={row.teamId} className="leader">
          <span className="leader-bracket">{row.tie === 'unresolved' ? `T${row.rank}` : row.rank}</span>
          <div className="leader-body">
            <p className={i === 0 ? 'leader-first' : 'leader-second'}>
              <span className="leader-name">{teamLabel(teamsById.get(row.teamId))}</span>
              <span className="leader-record">
                {row.record.wins}–{row.record.losses} · {row.record.pe}-{row.record.pc}
              </span>
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}

/**
 * The current top four of each division: the semifinal places, by the official order
 * (win rate, then PE, then PC, then head-to-head).
 */
export function BracketLeaders({
  category,
  divisions,
}: {
  category: CategoryId
  divisions: readonly DivisionView[]
}) {
  return (
    <section className="leaders" aria-labelledby="leaders-title">
      <div className="leaders-head">
        <h2 id="leaders-title">Semifinal race</h2>
        <p className="muted">
          Current top four in each division. W–L · points earned-conceded.{' '}
          <Link to="/standings">Full standings →</Link>
        </p>
      </div>
      <div className="leaders-grid">
        {DIVISIONS.map((info) => {
          const division = divisions.find((d) => d.category === category && d.division === info.id)
          const group = division?.brackets[0]
          if (!group) return null
          return (
            <div key={info.id} className="leaders-division">
              <h3>
                {info.name}{' '}
                {group.standing.status === 'final' && <Badge tone="ok">Final</Badge>}
                {group.standing.status === 'in-progress' && <Badge tone="blue">Live</Badge>}
              </h3>
              <Leaders bracket={group} />
            </div>
          )
        })}
      </div>
    </section>
  )
}
