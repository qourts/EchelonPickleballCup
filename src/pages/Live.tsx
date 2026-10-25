import { useMemo, useState } from 'react'
import { DataNotice, SkippedNotice } from '../components/DataNotice.tsx'
import { MatchRow, sideName, stageLabel } from '../components/MatchRow.tsx'
import { Badge, SegmentedControl } from '../components/ui.tsx'
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
  const main = live ?? next
  return (
    <li className={`court-tile${live ? ' is-live' : next ? ' is-next' : ''}`}>
      <div className="court-head">
        <span className="court-no">Court {court}</span>
        {live ? <Badge tone="live">Live</Badge> : next ? <Badge tone="gold">Next</Badge> : <Badge>Done</Badge>}
      </div>
      {main ? (
        <>
          <p className="court-stage">{stageLabel(main)}</p>
          <p className="court-team">
            <span>{sideName(main, 'a', teamsById)}</span>
            {live?.onCourt && <span className="match-score">{live.onCourt.a}</span>}
          </p>
          <p className="court-team">
            <span>{sideName(main, 'b', teamsById)}</span>
            {live?.onCourt && <span className="match-score">{live.onCourt.b}</span>}
          </p>
          {!live && <p className="court-time">{formatManilaTime(main.startsAt)}</p>}
        </>
      ) : (
        <p className="muted court-empty">No more matches on this court.</p>
      )}
      {live && next && (
        <div className="court-next">
          <span className="court-next-label">Next · {formatManilaTime(next.startsAt)}</span>
          <span className="court-next-teams">
            {sideName(next, 'a', teamsById)} v {sideName(next, 'b', teamsById)}
          </span>
        </div>
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
  const waiting = [...board.upNext, ...board.queue]
  const queue = showAllQueue ? waiting : waiting.slice(0, QUEUE_PREVIEW)

  return (
    <>
      <header className="live-head">
        <div>
          <p className="eyebrow">Tournament day</p>
          <h1>Live &amp; upcoming</h1>
        </div>
        <SegmentedControl<CategoryFilter>
          label="Category"
          value={filter}
          onChange={setFilter}
          options={[{ value: 'all', label: 'All' }, ...CATEGORIES.map((c) => ({ value: c.id, label: c.short }))]}
        />
      </header>
      <DataNotice resource={roster} noun="team names" onRetry={reload} />
      {roster.status === 'ready' && <DataNotice resource={matches} noun="the live schedule" onRetry={reload} />}
      <SkippedNotice skipped={skipped} />

      {ready && (
        <>
          <p className="live-summary" aria-live="polite">
            <strong>{board.live.length}</strong> on court
            {board.upNext[0] && (
              <>
                {' '}
                · next start <strong>{formatManilaTime(board.upNext[0].startsAt)}</strong>
              </>
            )}{' '}
            · <strong>{board.upNext.length + board.queue.length}</strong> waiting · refreshes every 30 seconds
          </p>
          <ul className="court-grid" aria-label="Courts">
            {board.courts.map((status) => (
              <CourtTile key={status.court} status={status} teamsById={teamsById} />
            ))}
          </ul>

          <section className="section" aria-labelledby="in-queue">
            <h2 id="in-queue">In the queue</h2>
            {waiting.length === 0 ? (
              <p className="muted">No further matches are queued.</p>
            ) : (
              <>
                <p className="muted">
                  {waiting.length} match{waiting.length === 1 ? '' : 'es'}, in playing order. Times shift if matches
                  run long; this list always shows the latest published schedule.
                </p>
                <MatchList matches={queue} teamsById={teamsById} />
                {waiting.length > QUEUE_PREVIEW && (
                  <button type="button" className="button button-ghost" onClick={() => setShowAllQueue((v) => !v)}>
                    {showAllQueue ? 'Show fewer' : `Show all ${waiting.length}`}
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
