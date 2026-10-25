import { Link } from 'react-router-dom'
import { DIVISIONS, categoryInfo } from '../config/event.ts'
import { teamLabel, type BracketView, type DivisionView } from '../domain/tournament.ts'
import type { CategoryId, Team } from '../domain/types.ts'
import { Badge } from './ui.tsx'

function Leader({ bracket }: { bracket: BracketView }) {
  const teamsById = new Map<string, Team>(bracket.teams.map((t) => [t.id, t]))
  const [first, second] = bracket.standing.rows
  const pending = bracket.standing.status === 'pending'

  return (
    <li className="leader">
      <span className="leader-bracket">{bracket.letter}</span>
      {pending || !first ? (
        <span className="muted">Awaiting results</span>
      ) : (
        <div className="leader-body">
          <p className="leader-first">
            <span className="leader-name">{teamLabel(teamsById.get(first.teamId))}</span>
            <span className="leader-record">
              {first.record.wins}–{first.record.losses} · {first.record.pe}-{first.record.pc}
            </span>
          </p>
          {second && (
            <p className="leader-second">
              <span className="leader-name">{teamLabel(teamsById.get(second.teamId))}</span>
              <span className="leader-record">
                {second.record.wins}–{second.record.losses} · {second.record.pe}-{second.record.pc}
              </span>
            </p>
          )}
        </div>
      )}
      {bracket.standing.status === 'final' && <Badge tone="ok">Final</Badge>}
      {bracket.standing.status === 'in-progress' && <Badge tone="blue">Live</Badge>}
    </li>
  )
}

/**
 * First and second place of every bracket in the category being played, by the official
 * order (win rate, then PE, then PC). Brackets are ranked separately, so there is deliberately
 * no single list that mixes teams from different brackets.
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
        <h2 id="leaders-title">Bracket leaders · {categoryInfo(category).short}</h2>
        <p className="muted">
          1st and 2nd in each bracket. W–L · points earned-conceded.{' '}
          <Link to={`/standings?cat=${category}`}>Full standings →</Link>
        </p>
      </div>
      <div className="leaders-grid">
        {DIVISIONS.map((info) => {
          const division = divisions.find((d) => d.category === category && d.division === info.id)
          if (!division) return null
          return (
            <div key={info.id} className="leaders-division">
              <h3>{info.name}</h3>
              <ul>
                {division.brackets
                  .filter((b) => b.teams.length > 0)
                  .map((bracket) => (
                    <Leader key={bracket.letter} bracket={bracket} />
                  ))}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}
