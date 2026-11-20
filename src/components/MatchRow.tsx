import { divisionInfo } from '../config/event.ts'
import { tryResolveOfficialScore, winningSide } from '../domain/scoring.ts'
import { formatManilaTime } from '../domain/schedule.ts'
import { teamLabel } from '../domain/tournament.ts'
import type { Match, Team } from '../domain/types.ts'
import { Badge } from './ui.tsx'

export function stageLabel(match: Match): string {
  switch (match.stage) {
    case 'preliminary':
      return `${divisionInfo(match.division).short}${match.round ? ` · Round ${match.round}` : ''}`
    case 'semifinal':
      return `${divisionInfo(match.division).short} · Semifinal${match.semifinalIndex ? ` ${match.semifinalIndex}` : ''}`
    case 'gold':
      return `${divisionInfo(match.division).short} · Gold medal match`
    case 'bronze':
      return `${divisionInfo(match.division).short} · Bronze medal match`
    case 'tiebreaker':
      return `${divisionInfo(match.division).short} · Tiebreaker (first to 6)`
  }
}

export function sideName(match: Match, side: 'a' | 'b', teamsById: ReadonlyMap<string, Team>): string {
  const id = side === 'a' ? match.teamAId : match.teamBId
  if (id) return teamLabel(teamsById.get(id))
  return (side === 'a' ? match.labelA : match.labelB) ?? 'To be determined'
}

export function MatchRow({ match, teamsById }: { match: Match; teamsById: ReadonlyMap<string, Team> }) {
  const { score } = match.status === 'completed' ? tryResolveOfficialScore(match) : { score: null }
  const shown = score ?? (match.status === 'live' ? match.onCourt ?? null : null)
  const winner = score ? winningSide(score) : null
  const adjusted =
    score && match.capReached && match.onCourt && (match.onCourt.a !== score.a || match.onCourt.b !== score.b)

  return (
    <article className="match-row" aria-label={stageLabel(match)}>
      <div className="match-when">
        <span className="match-time">{formatManilaTime(match.startsAt)}</span>
        <span className="match-court">{match.court ? `Court ${match.court}` : 'Court TBA'}</span>
        {match.plannedCourt && match.court && match.plannedCourt !== match.court && (
          <span className="match-moved">Moved here from Court {match.plannedCourt}</span>
        )}
      </div>
      <div className="match-body">
        <p className="match-stage">{stageLabel(match)}</p>
        <p className={`match-team${winner === 'a' ? ' is-winner' : ''}`}>
          <span>{sideName(match, 'a', teamsById)}</span>
          {shown && <span className="match-score">{shown.a}</span>}
        </p>
        <p className={`match-team${winner === 'b' ? ' is-winner' : ''}`}>
          <span>{sideName(match, 'b', teamsById)}</span>
          {shown && <span className="match-score">{shown.b}</span>}
        </p>
        {match.forfeit && <p className="match-note">Result recorded as a forfeit.</p>}
        {match.note && <p className="match-note match-public-note">{match.note}</p>}
        {adjusted && match.onCourt && (
          <p className="match-note">
            Official adjusted score. Played on court: {match.onCourt.a}–{match.onCourt.b} (15-minute cap).
          </p>
        )}
      </div>
      <div className="match-status">
        {match.status === 'live' && <Badge tone="live">Live</Badge>}
        {match.status === 'completed' && <Badge tone="ok">Final</Badge>}
        {match.status === 'scheduled' && <Badge>Scheduled</Badge>}
      </div>
    </article>
  )
}
