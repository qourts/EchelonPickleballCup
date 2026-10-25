import { useMemo, useState } from 'react'
import { DataNotice, SkippedNotice } from '../components/DataNotice.tsx'
import { MatchRow, sideName, stageLabel } from '../components/MatchRow.tsx'
import { Badge, Notice, PageHeader, SegmentedControl } from '../components/ui.tsx'
import { CATEGORIES, EVENT } from '../config/event.ts'
import { buildLiveBoard, type CourtStatus } from '../domain/liveBoard.ts'
import { formatManilaTime } from '../domain/schedule.ts'
import type { CategoryId, Match, Team } from '../domain/types.ts'
import { useQueryParam } from '../hooks/useQueryParam.ts'
import { useTournament } from '../hooks/useTournament.ts'

type CategoryFilter = 'all' | CategoryId
const FILTERS: readonly CategoryFilter[] = ['all', ...CATEGORIES.map((c) => c.id)]
const QUEUE_PREVIEW = 12

function MatchList({ matches, teamsById }: { matches: readonly Match[]; teamsById: ReadonlyMap<string, Team> }) {
  return (
    <ul className="match-list">
      {matches.map((match) => (
        <li key={match.id}>
          <MatchRow match={match} teamsById={teamsById} />
        </li>
      ))}
    </ul>
  )
}

function CourtTile({ status, teamsById }: { status: CourtStatus; teamsById: ReadonlyMap<string, Team> }) {
  const { court, live, next } = status
  const shown = live ?? next
  return (
    <li className={`court-tile${live ? ' is-live' : next ? ' is-next' : ''}`}>
      <div className="court-head">
        <span className="court-no">Court {court}</span>
        {live ? <Badge tone="live">Live</Badge> : next ? <Badge tone="gold">Next</Badge> : <Badge>Done</Badge>}
      </div>
      {shown ? (
        <>
          <p className="court-stage">{stageLabel(shown)}</p>
          <p className="court-team">
            <span>{sideName(shown, 'a', teamsById)}</span>
            {live?.onCourt && <span className="match-score">{live.onCourt.a}</span>}
          </p>
          <p className="court-team">
            <span>{sideName(shown, 'b', teamsById)}</span>
            {live?.onCourt && <span className="match-score">{live.onCourt.b}</span>}
          </p>
          {!live && <p className="court-time">{formatManilaTime(shown.startsAt)}</p>}
          {live && next && <p className="court-time">Then {formatManilaTime(next.startsAt)}</p>}
        </>
      ) : (
        <p className="muted">No more matches scheduled on this court.</p>
      )}
    </li>
  )
}

export function Live() {
  const { roster, matches, view, skipped, reload } = useTournament()
  const [filter, setFilter] = useQueryParam<CategoryFilter>('cat', FILTERS, 'all')
  const [showAllQueue, setShowAllQueue] = useState(false)

  const board = useMemo(
    () =>
      buildLiveBoard(matches.status === 'ready' ? matches.items : [], {
        category: filter === 'all' ? undefined : filter,
        courts: EVENT.courts,
      }),
    [matches, filter],
  )
  const ready = matches.status === 'ready' && view !== null
  const teamsById = view?.teamsById ?? new Map<string, Team>()
  const queue = showAllQueue ? board.queue : board.queue.slice(0, QUEUE_PREVIEW)

  return (
    <>
      <PageHeader
        eyebrow="Tournament day"
        title="Live & upcoming"
        lead="What is on court right now, who plays next, and the queue. This page refreshes by itself every 30 seconds."
      />
      <SegmentedControl<CategoryFilter>
        label="Category"
        value={filter}
        onChange={setFilter}
        options={[{ value: 'all', label: 'All' }, ...CATEGORIES.map((c) => ({ value: c.id, label: c.short }))]}
      />
      <DataNotice resource={roster} noun="team names" onRetry={reload} />
      {roster.status === 'ready' && <DataNotice resource={matches} noun="the live schedule" onRetry={reload} />}
      <SkippedNotice skipped={skipped} />

      {ready && (
        <>
          <section className="section" aria-labelledby="live-now">
            <h2 id="live-now">On court now</h2>
            {board.live.length === 0 ? (
              <Notice tone="gold" title="No match in progress right now">
                <p>The next matches are listed below.</p>
              </Notice>
            ) : (
              <MatchList matches={board.live} teamsById={teamsById} />
            )}
          </section>

          <section className="section" aria-labelledby="up-next">
            <h2 id="up-next">
              Up next
              {board.upNext[0] && <small className="h2-time">{formatManilaTime(board.upNext[0].startsAt)}</small>}
            </h2>
            {board.upNext.length === 0 ? (
              <p className="muted">Nothing left to play in this view.</p>
            ) : (
              <MatchList matches={board.upNext} teamsById={teamsById} />
            )}
          </section>

          <section className="section" aria-labelledby="by-court">
            <h2 id="by-court">By court</h2>
            <ul className="court-grid">
              {board.courts.map((status) => (
                <CourtTile key={status.court} status={status} teamsById={teamsById} />
              ))}
            </ul>
          </section>

          <section className="section" aria-labelledby="in-queue">
            <h2 id="in-queue">In the queue</h2>
            {board.queue.length === 0 ? (
              <p className="muted">No further matches are queued.</p>
            ) : (
              <>
                <p className="muted">
                  {board.queue.length} more match{board.queue.length === 1 ? '' : 'es'}, in playing order. Times shift if
                  matches run long; this list always shows the latest published schedule.
                </p>
                <MatchList matches={queue} teamsById={teamsById} />
                {board.queue.length > QUEUE_PREVIEW && (
                  <button type="button" className="button button-ghost" onClick={() => setShowAllQueue((v) => !v)}>
                    {showAllQueue ? 'Show fewer' : `Show all ${board.queue.length}`}
                  </button>
                )}
              </>
            )}
          </section>
        </>
      )}
    </>
  )
}
