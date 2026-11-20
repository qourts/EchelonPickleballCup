import { useMemo } from 'react'
import { DataNotice, SkippedNotice } from '../components/DataNotice.tsx'
import { MatchRow } from '../components/MatchRow.tsx'
import { Badge, Notice, PageHeader, SegmentedControl } from '../components/ui.tsx'
import { DIVISIONS, EVENT, divisionInfo } from '../config/event.ts'
import { DAY_PLAN } from '../config/schedule.ts'
import { byPlayingOrder } from '../domain/liveBoard.ts'
import { formatClock } from '../domain/schedule.ts'
import type { Match } from '../domain/types.ts'
import { useQueryParam } from '../hooks/useQueryParam.ts'
import { useTournament } from '../hooks/useTournament.ts'

const DIVISION_FILTERS = ['all', ...DIVISIONS.map((d) => d.id)] as const
type DivisionFilter = (typeof DIVISION_FILTERS)[number]

function DayPlan() {
  return (
    <section className="section" aria-labelledby="day-plan">
      <h2 id="day-plan">The day at a glance</h2>
      <p>
        {EVENT.timetable}, Philippine time, at {EVENT.venue}. Preliminary rounds use courts 8, 9 and 10; every match has
        a 25-minute slot.
      </p>
      <ol className="timeline">
        {DAY_PLAN.map((row) => (
          <li
            key={`${row.start}-${row.what}`}
            className={`timeline-item${row.courts ? '' : ' is-break'}${row.division ? ` is-${row.division}` : row.courts ? ' is-playoff' : ''}`}
          >
            <span className="timeline-time">
              {formatClock(row.start)}
              <small>to {formatClock(row.end)}</small>
            </span>
            <span className="timeline-body">
              <strong>{row.what}</strong>
              {row.courts && <span className="muted">{row.courts}</span>}
            </span>
          </li>
        ))}
      </ol>
      <p className="fine-print">
        Medal matches have no time cap, so their slots are targets, not guaranteed finish times. Delays and court
        changes are handled by Qourts on the day and appear here once published.
      </p>
    </section>
  )
}

function PublishedMatches() {
  const { roster, matches, view, skipped, reload } = useTournament()
  const [divisionFilter, setDivisionFilter] = useQueryParam<DivisionFilter>('div', DIVISION_FILTERS, 'all')

  const rows = useMemo<Match[]>(() => {
    if (matches.status !== 'ready') return []
    return matches.items.filter((m) => divisionFilter === 'all' || m.division === divisionFilter).slice().sort(byPlayingOrder)
  }, [matches, divisionFilter])

  return (
    <section className="section" aria-labelledby="published">
      <h2 id="published">Every match</h2>
      <SkippedNotice skipped={skipped} />
      <div className="filters">
        <SegmentedControl<DivisionFilter>
          label="Division"
          value={divisionFilter}
          onChange={setDivisionFilter}
          options={[{ value: 'all', label: 'All' }, ...DIVISIONS.map((d) => ({ value: d.id, label: d.short }))]}
        />
      </div>
      <DataNotice resource={matches} noun="the match schedule" onRetry={reload} />
      {matches.status === 'ready' && roster.status !== 'ready' && (
        <DataNotice resource={roster} noun="team names" onRetry={reload} />
      )}
      {matches.status === 'ready' && rows.length === 0 && (
        <Notice title="No matches yet">
          <p>
            No matches{divisionFilter === 'all' ? '' : ` for ${divisionInfo(divisionFilter).name}`} have been published.
          </p>
        </Notice>
      )}
      <ul className="match-list">
        {rows.map((match) => (
          <li key={match.id}>
            <MatchRow match={match} teamsById={view?.teamsById ?? new Map()} />
          </li>
        ))}
      </ul>
      {matches.status === 'ready' && (
        <p className="fine-print">
          <Badge tone="live">Live</Badge> This list refreshes automatically while you keep the page open.
        </p>
      )}
    </section>
  )
}

export function Schedule() {
  return (
    <>
      <PageHeader
        eyebrow="Schedule"
        title="Saturday, November 21"
        lead="Two divisions, six pairs each, three courts: one morning of round robin, then semifinals and medals."
      />
      <DayPlan />
      <PublishedMatches />
    </>
  )
}
