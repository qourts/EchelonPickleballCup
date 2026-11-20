import { useEffect, useMemo, useState } from 'react'
import { stageLabel } from '../../components/MatchRow.tsx'
import { StandingsTable } from '../../components/StandingsTable.tsx'
import { Badge, SegmentedControl } from '../../components/ui.tsx'
import { DIVISIONS, EVENT } from '../../config/event.ts'
import { TEAMS } from '../../config/roster.ts'
import { loadActivity, readyToConfirm, type ActivityEntry, type AdminMatch } from '../../data/adminApi.ts'
import { buildLiveBoard, byPlayingOrder } from '../../domain/liveBoard.ts'
import { formatManilaTime } from '../../domain/schedule.ts'
import { normalizeName } from '../../domain/search.ts'
import { tryResolveOfficialScore, winningSide } from '../../domain/scoring.ts'
import { buildTournamentView, teamLabel } from '../../domain/tournament.ts'
import type { DivisionId } from '../../domain/types.ts'

const TEAMS_BY_ID = new Map(TEAMS.map((t) => [t.id, t]))
const pair = (id: string | null, fallback?: string) => (id ? teamLabel(TEAMS_BY_ID.get(id)) : (fallback ?? 'To be decided'))

type Open = (id: string) => void

function statusOf(m: AdminMatch): { tone: 'live' | 'ok' | 'gold' | 'neutral'; label: string } {
  if (m.status === 'completed') return { tone: 'ok', label: m.forfeit ? 'Final · forfeit' : 'Final' }
  if (m.status === 'live') return readyToConfirm(m) ? { tone: 'gold', label: 'Ready to confirm' } : { tone: 'live', label: 'Live' }
  return { tone: 'neutral', label: 'Not started' }
}

function scoreText(m: AdminMatch): string {
  const s = m.status === 'completed' ? m.official : m.onCourt
  return s ? `${s.a}–${s.b}` : ''
}

function MatchButton({ match, onOpen }: { match: AdminMatch; onOpen: Open }) {
  const status = statusOf(match)
  return (
    <button type="button" className="admin-row" onClick={() => onOpen(match.id)}>
      <span className="admin-row-when">
        {formatManilaTime(match.startsAt)} · Court {match.court}
      </span>
      <span className="admin-row-stage">{stageLabel(match)}</span>
      <span className="admin-row-pairs">
        {pair(match.teamAId, match.labelA)} <em>v</em> {pair(match.teamBId, match.labelB)}
      </span>
      <span className="admin-row-score">{scoreText(match)}</span>
      <Badge tone={status.tone}>{status.label}</Badge>
    </button>
  )
}

export function CourtsTab({ matches, onOpen }: { matches: readonly AdminMatch[]; onOpen: Open }) {
  const board = buildLiveBoard(matches, { courts: EVENT.courtNumbers })
  const extra = board.live.filter((m) => !EVENT.courtNumbers.includes(m.court as 8 | 9 | 10))
  return (
    <>
      <ul className="court-grid admin-courts">
        {board.courts.map(({ court, live, next }) => {
          const main = live ?? next
          return (
            <li key={court} className={`court-tile${live ? ' is-live' : next ? ' is-next' : ''}`}>
              <div className="court-head">
                <span className="court-no">Court {court}</span>
                {live ? <Badge tone={readyToConfirm(live) ? 'gold' : 'live'}>{readyToConfirm(live) ? 'Ready' : 'Live'}</Badge> : next ? <Badge tone="gold">Next</Badge> : <Badge>Free</Badge>}
              </div>
              {main ? (
                <button type="button" className="court-open" onClick={() => onOpen(main.id)}>
                  <span className="court-stage">
                    {formatManilaTime(main.startsAt)} · {stageLabel(main)}
                  </span>
                  <span className="court-team">
                    <span>{pair(main.teamAId, main.labelA)}</span>
                    {live?.onCourt && <span className="match-score">{live.onCourt.a}</span>}
                  </span>
                  <span className="court-team">
                    <span>{pair(main.teamBId, main.labelB)}</span>
                    {live?.onCourt && <span className="match-score">{live.onCourt.b}</span>}
                  </span>
                  <span className="court-next-label">{live ? 'Tap to score' : 'Tap to start'}</span>
                </button>
              ) : (
                <p className="muted">No more matches here.</p>
              )}
            </li>
          )
        })}
      </ul>
      {extra.length > 0 && (
        <section className="section">
          <h2>Live on other courts</h2>
          {extra.map((m) => (
            <MatchButton key={m.id} match={m} onOpen={onOpen} />
          ))}
        </section>
      )}
      <section className="section">
        <h2>Up next</h2>
        {board.upNext.length === 0 && <p className="muted">Nothing left to play.</p>}
        {[...board.upNext, ...board.queue].slice(0, 6).map((m) => (
          <MatchButton key={m.id} match={m} onOpen={onOpen} />
        ))}
      </section>
    </>
  )
}

type DivisionFilter = 'all' | DivisionId
type StatusFilter = 'all' | 'scheduled' | 'live' | 'ready' | 'final'

export function ScoresTab({ matches, onOpen }: { matches: readonly AdminMatch[]; onOpen: Open }) {
  const [division, setDivision] = useState<DivisionFilter>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [query, setQuery] = useState('')
  const q = normalizeName(query)
  const shown = matches
    .filter((m) => division === 'all' || m.division === division)
    .filter((m) => {
      if (status === 'scheduled') return m.status === 'scheduled'
      if (status === 'live') return m.status === 'live' && !readyToConfirm(m)
      if (status === 'ready') return readyToConfirm(m)
      if (status === 'final') return m.status === 'completed'
      return true
    })
    .filter((m) => !q || normalizeName(`${pair(m.teamAId, '')} ${pair(m.teamBId, '')} ${m.id}`).includes(q))
    .slice()
    .sort(byPlayingOrder)
  return (
    <>
      <div className="filters">
        <SegmentedControl<DivisionFilter>
          label="Division"
          value={division}
          onChange={setDivision}
          options={[{ value: 'all', label: 'All' }, ...DIVISIONS.map((d) => ({ value: d.id, label: d.short }))]}
        />
        <SegmentedControl<StatusFilter>
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'All' },
            { value: 'scheduled', label: 'Not started' },
            { value: 'live', label: 'Live' },
            { value: 'ready', label: 'Ready to confirm' },
            { value: 'final', label: 'Final' },
          ]}
        />
      </div>
      <label className="search-field admin-search">
        <span className="visually-hidden">Search by player or pair</span>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by player" />
      </label>
      <p className="muted">{shown.length} matches</p>
      <div className="admin-rows">
        {shown.map((m) => (
          <MatchButton key={m.id} match={m} onOpen={onOpen} />
        ))}
      </div>
    </>
  )
}

export function StandingsTab({ matches }: { matches: readonly AdminMatch[] }) {
  const view = useMemo(() => buildTournamentView(TEAMS, matches), [matches])
  return (
    <>
      <p className="muted">From confirmed results only, with the same ranking rules as the player portal.</p>
      {view.divisions.map((division) => {
        const info = DIVISIONS.find((d) => d.id === division.division)!
        const group = division.brackets[0]!
        const q = division.qualification
        const placings = (['gold', 'bronze'] as const).flatMap((stage) => {
          const m = division.playoffMatches.find((x) => x.stage === stage && x.status === 'completed')
          const s = m ? tryResolveOfficialScore(m).score : null
          if (!m || !s || !m.teamAId || !m.teamBId) return []
          const aWon = winningSide(s) === 'a'
          const [w, l] = aWon ? [m.teamAId, m.teamBId] : [m.teamBId, m.teamAId]
          return stage === 'gold'
            ? [
                ['1st · Gold', w],
                ['2nd', l],
              ]
            : [['3rd · Bronze', w]]
        })
        return (
          <section key={division.division} className="section">
            <h2>{info.name}</h2>
            <StandingsTable bracket={group} qualifiers={new Map(q.qualifiers.map((x) => [x.teamId, x]))} />
            <div className="card">
              <h3>Semifinals</h3>
              {q.status === 'ready' ? (
                q.semifinals.map((s) => (
                  <p key={s.index}>
                    SF{s.index}: <strong>#{s.a.seed}</strong> {pair(s.a.teamId)} <em>v</em> <strong>#{s.b.seed}</strong> {pair(s.b.teamId)}
                  </p>
                ))
              ) : (
                <p className="muted">{q.reason ?? 'Waiting for the round robin to finish.'}</p>
              )}
              {placings.length > 0 && (
                <>
                  <h3>Final placings</h3>
                  {placings.map(([label, id]) => (
                    <p key={label}>
                      <strong>{label}</strong> {pair(id!)}
                    </p>
                  ))}
                </>
              )}
            </div>
          </section>
        )
      })}
    </>
  )
}

const ACTION_LABEL: Record<string, string> = {
  start: 'Started',
  'undo-start': 'Undid start',
  score: 'Score',
  confirm: 'Confirmed result',
  forfeit: 'Forfeit',
  reopen: 'Reopened',
  reset: 'Reset',
  court: 'Moved court',
  note: 'Note',
  teams: 'Set pairs',
}

function describe(entry: ActivityEntry): string {
  const d = entry.detail ?? {}
  if (entry.action === 'score' || entry.action === 'forfeit') return `${d.home ?? ''}–${d.away ?? ''}`
  if (entry.action === 'confirm') return `${d.home}–${d.away}${d.cap ? ' at the cap' : ''}, official ${JSON.stringify(d.official ?? '')}`
  if (entry.action === 'court') return `Court ${d.from} → ${d.to}`
  if (entry.action === 'note') return `${d.public ? 'Public' : 'Private'}: ${d.note ?? '(cleared)'}`
  if (entry.action === 'teams') return `${pair(String(d.home))} v ${pair(String(d.away))}`
  return ''
}

export function ActivityTab({ getToken, matches }: { getToken: () => Promise<string>; matches: readonly AdminMatch[] }) {
  const [entries, setEntries] = useState<ActivityEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [hideScores, setHideScores] = useState(true)
  const [tick, setTick] = useState(0)
  const byId = new Map(matches.map((m) => [m.id, m]))

  useEffect(() => {
    let cancelled = false
    getToken()
      .then(loadActivity)
      .then((rows) => {
        if (!cancelled) {
          setEntries(rows)
          setError(null)
        }
      })
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : 'Could not load activity.'))
    return () => {
      cancelled = true
    }
  }, [getToken, tick])

  const q = normalizeName(query)
  const shown = (entries ?? [])
    .filter((e) => !hideScores || e.action !== 'score')
    .filter((e) => !q || normalizeName(`${e.matchId} ${e.by ?? ''} ${e.reason ?? ''}`).includes(q))
  return (
    <>
      <div className="actions">
        <button type="button" className="button button-ghost" onClick={() => setTick((n) => n + 1)}>
          Refresh
        </button>
        <label className="admin-check">
          <input type="checkbox" checked={hideScores} onChange={(e) => setHideScores(e.target.checked)} />
          Hide point-by-point scores
        </label>
      </div>
      <label className="search-field admin-search">
        <span className="visually-hidden">Search activity</span>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by match, admin or reason" />
      </label>
      {error && <p className="admin-message">{error}</p>}
      {!entries && !error && <p className="muted">Loading…</p>}
      <ul className="admin-activity">
        {shown.map((e) => {
          const m = byId.get(e.matchId)
          return (
            <li key={e.id}>
              <span className="admin-row-when">{new Date(e.at).toLocaleString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', second: '2-digit' })}</span>
              <strong>{ACTION_LABEL[e.action] ?? e.action}</strong>
              <span>{m ? `${stageLabel(m)} · Court ${m.court}` : e.matchId}</span>
              <span className="muted">{describe(e)}</span>
              {e.reason && <span>Reason: {e.reason}</span>}
              <span className="muted">by {e.by ?? 'unknown'}</span>
            </li>
          )
        })}
      </ul>
    </>
  )
}

export function TeamsTab() {
  const [query, setQuery] = useState('')
  const q = normalizeName(query)
  return (
    <>
      <label className="search-field admin-search">
        <span className="visually-hidden">Search pairs</span>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by player" />
      </label>
      <div className="split">
        {DIVISIONS.map((d) => (
          <div key={d.id} className="card">
            <h3>{d.name}</h3>
            <ol className="bracket-teams">
              {TEAMS.filter((t) => t.division === d.id && (!q || normalizeName(teamLabel(t)).includes(q))).map((t) => (
                <li key={t.id}>
                  <span className="slot">{t.slot}</span>
                  <span>{teamLabel(t)}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </>
  )
}

export function HelpTab() {
  return (
    <div className="guide-content">
      <h2>Scoring a match</h2>
      <ol className="rule-list">
        <li>Open the match from <strong>Courts</strong> or <strong>Scores</strong>. When both pairs are on court, tap <strong>Start match</strong>. It turns Live on the player portal. Started by mistake? <strong>Undo start</strong> is there until the first point.</li>
        <li>Tap <strong>+</strong> for the pair that won the rally (<strong>−</strong> to take one back). Each change saves on its own within a second and reaches the portal on its next refresh.</li>
        <li>At 11 (medal matches: 11 with a two-point lead) the match shows <strong>Ready to confirm</strong>. Check the score and tap <strong>Confirm result</strong>. The match locks and the standings update.</li>
        <li>If time ran out at 15 minutes, tick <strong>Ended at the 15-minute cap</strong> and confirm: the leader&apos;s official score becomes 11, the other pair keeps its points. Not for Gold or Bronze, which have no cap.</li>
      </ol>
      <h2>Semifinals and medal matches</h2>
      <p>Open the match, tap <strong>Use results</strong> to fill the pairs from the standings (or from the semifinal results for Bronze and Gold), check them and tap <strong>Save pairs</strong>. Then start it like any other match.</p>
      <h2>Fixing mistakes</h2>
      <ul className="rule-list">
        <li><strong>Wrong live score:</strong> use + and −, or <strong>Reset this match</strong> to start over.</li>
        <li><strong>Wrong confirmed result:</strong> a supervisor opens the match, gives a reason and taps <strong>Reopen</strong> (keeps the score, back to Live) or <strong>Reset</strong> (back to not started).</li>
        <li><strong>No-show or injury:</strong> open <strong>Forfeit</strong>, choose the winner, give a reason. The present pair wins 11–0.</li>
        <li><strong>Two people scoring the same match:</strong> the second save is refused with &ldquo;changed by someone else&rdquo; and the latest score loads.</li>
        <li><strong>Wi-Fi drops:</strong> the score stays on screen with &ldquo;No connection · retrying&rdquo; and saves when the connection is back.</li>
      </ul>
      <h2>Courts and notes</h2>
      <p>Open <strong>Court &amp; notes</strong> in a match to move it to another court (busy courts are marked) or add a note. Notes are private unless you tick <strong>Show this note to players</strong>.</p>
      <h2>Roles</h2>
      <p><strong>Scorers</strong> record matches. <strong>Supervisors</strong> can also reopen and reset confirmed results. Every action is in <strong>Activity</strong> with who did it and when.</p>
    </div>
  )
}
