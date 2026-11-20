import { useEffect, useRef, useState } from 'react'
import { stageLabel } from '../../components/MatchRow.tsx'
import { Badge } from '../../components/ui.tsx'
import { TEAMS } from '../../config/roster.ts'
import {
  act,
  explain,
  isConflict,
  isOffline,
  readyToConfirm,
  suggestedTeams,
  type AdminMatch,
  type AdminRole,
} from '../../data/adminApi.ts'
import { formatManilaTime } from '../../domain/schedule.ts'
import { teamLabel } from '../../domain/tournament.ts'
import type { DivisionId } from '../../domain/types.ts'

const TEAMS_BY_ID = new Map(TEAMS.map((t) => [t.id, t]))
const pairName = (id: string | null) => (id ? teamLabel(TEAMS_BY_ID.get(id)) : 'Pair not set')
const SAVE_DELAY_MS = 400
const RETRY_MS = 3000

type Sync = { kind: 'idle' | 'saving' | 'saved' | 'offline' | 'error'; text?: string }

interface Props {
  match: AdminMatch
  matches: readonly AdminMatch[]
  role: AdminRole
  getToken: () => Promise<string>
  onChanged: () => void
  onClose: () => void
}

function PairPicker(props: { label: string; value: string; onChange: (v: string) => void; division: DivisionId }) {
  return (
    <label>
      <span>{props.label}</span>
      <select value={props.value} onChange={(e) => props.onChange(e.target.value)}>
        <option value="">Choose a pair</option>
        {TEAMS.filter((t) => t.division === props.division).map((t) => (
          <option key={t.id} value={t.id}>
            {t.slot}. {teamLabel(t)}
          </option>
        ))}
      </select>
    </label>
  )
}

export function ScoringPanel({ match, matches, role, getToken, onChanged, onClose }: Props) {
  const version = useRef(match.version)
  const pending = useRef<{ a: number; b: number } | null>(null)
  const inflight = useRef(false)
  const timer = useRef<number | undefined>(undefined)
  const [score, setScore] = useState({ a: match.onCourt?.a ?? 0, b: match.onCourt?.b ?? 0 })
  const [sync, setSync] = useState<Sync>({ kind: 'idle' })
  const [busy, setBusy] = useState(false)
  const [cap, setCap] = useState(Boolean(match.capReached))
  const [teamA, setTeamA] = useState(match.teamAId ?? '')
  const [teamB, setTeamB] = useState(match.teamBId ?? '')
  const [reason, setReason] = useState('')
  const [forfeitWinner, setForfeitWinner] = useState<'a' | 'b'>('a')
  const [court, setCourt] = useState(match.court ?? 8)
  const [note, setNote] = useState(match.privateNote ?? '')
  const [notePublic, setNotePublic] = useState(match.notePublic)
  const medal = match.stage === 'gold' || match.stage === 'bronze'
  const hasPairs = Boolean(match.teamAId && match.teamBId)

  // Take the server's copy when someone else changed the match and nothing is waiting to save here.
  useEffect(() => {
    if (match.version === version.current || pending.current || inflight.current) return
    version.current = match.version
    setScore({ a: match.onCourt?.a ?? 0, b: match.onCourt?.b ?? 0 })
    setCap(Boolean(match.capReached))
  }, [match])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  // A function declaration, so the retry timer can call it again.
  async function flush(): Promise<void> {
    if (inflight.current || !pending.current) return
    const next = pending.current
    inflight.current = true
    try {
      version.current = await act(await getToken(), 'echelon_live_score', match, version.current, {
        p_home: next.a,
        p_away: next.b,
      })
      if (pending.current === next) pending.current = null
      setSync({ kind: 'saved', text: 'Saved' })
    } catch (error) {
      if (isOffline(error)) {
        setSync({ kind: 'offline', text: 'No connection · retrying' })
        timer.current = window.setTimeout(() => void flush(), RETRY_MS)
      } else {
        pending.current = null
        setSync({ kind: 'error', text: explain(error) })
        if (isConflict(error)) onChanged()
      }
    } finally {
      inflight.current = false
    }
    if (pending.current && pending.current !== next) void flush()
  }

  const point = (side: 'a' | 'b', delta: 1 | -1) => {
    const next = { ...score, [side]: Math.max(0, score[side] + delta) }
    setScore(next)
    pending.current = next
    setSync({ kind: 'saving', text: 'Saving…' })
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void flush(), SAVE_DELAY_MS)
  }

  /** One-off actions: wait for any score still saving, then run, then reload everything. */
  const run = async (fn: string, args: object = {}, done = 'Saved') => {
    if (pending.current || inflight.current) {
      setSync({ kind: 'error', text: 'Wait for the score to finish saving.' })
      return
    }
    setBusy(true)
    try {
      version.current = await act(await getToken(), fn, match, version.current, args)
      setSync({ kind: 'saved', text: done })
      setReason('')
      onChanged()
    } catch (error) {
      setSync({ kind: isOffline(error) ? 'offline' : 'error', text: isOffline(error) ? 'No connection. Try again.' : explain(error) })
      if (isConflict(error)) onChanged()
    } finally {
      setBusy(false)
    }
  }

  const suggestion = match.stage !== 'preliminary' ? suggestedTeams(match, matches) : null
  const live = match.status === 'live'
  const ready = readyToConfirm({ ...match, onCourt: score }) || (live && cap && score.a !== score.b)
  const busyCourts = new Set(
    matches.filter((m) => m.id !== match.id && m.startsAt === match.startsAt && m.status !== 'completed').map((m) => m.court),
  )

  return (
    <div className="admin-overlay" role="dialog" aria-modal="true" aria-labelledby="panel-title" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="admin-panel">
        <div className="admin-panel-head">
          <div>
            <p className="eyebrow">
              {formatManilaTime(match.startsAt)} · Court {match.court}
              {match.plannedCourt && match.plannedCourt !== match.court ? ` (moved from ${match.plannedCourt})` : ''}
            </p>
            <h2 id="panel-title">{stageLabel(match)}</h2>
          </div>
          <button type="button" className="button button-ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <p>
          <Badge tone={live ? 'live' : match.status === 'completed' ? 'ok' : 'neutral'}>
            {live ? (ready ? 'Ready to confirm' : 'Live') : match.status === 'completed' ? (match.forfeit ? 'Final · forfeit' : 'Final') : 'Not started'}
          </Badge>
        </p>

        {match.stage !== 'preliminary' && match.status === 'scheduled' && (
          <section className="admin-block">
            <h3>Pairs</h3>
            <div className="admin-teams">
              <PairPicker label={match.labelA ?? 'Pair A'} value={teamA} onChange={setTeamA} division={match.division} />
              <PairPicker label={match.labelB ?? 'Pair B'} value={teamB} onChange={setTeamB} division={match.division} />
            </div>
            <div className="actions">
              {suggestion && (
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => {
                    setTeamA(suggestion[0])
                    setTeamB(suggestion[1])
                  }}
                >
                  Use results
                </button>
              )}
              <button
                type="button"
                className="button button-primary"
                disabled={busy || !teamA || !teamB || teamA === teamB}
                onClick={() => run('echelon_set_teams', { p_home: teamA, p_away: teamB }, 'Pairs saved')}
              >
                Save pairs
              </button>
            </div>
          </section>
        )}

        <section className="admin-scoreboard" aria-live="polite">
          {(['a', 'b'] as const).map((side) => (
            <div key={side} className="admin-side">
              <p className="admin-side-name">{pairName(side === 'a' ? match.teamAId : match.teamBId)}</p>
              <p className="admin-side-score">
                {live ? score[side] : match.status === 'completed' ? (match.official?.[side] ?? '–') : '–'}
              </p>
              {live && (
                <div className="admin-side-buttons">
                  <button
                    type="button"
                    className="button button-ghost admin-minus"
                    aria-label="Remove a point"
                    onClick={() => point(side, -1)}
                    disabled={score[side] === 0}
                  >
                    −
                  </button>
                  <button type="button" className="button button-primary admin-plus" aria-label="Add a point" onClick={() => point(side, 1)}>
                    +
                  </button>
                </div>
              )}
            </div>
          ))}
        </section>
        {sync.text && <p className={`admin-sync is-${sync.kind}`}>{sync.text}</p>}

        {match.status === 'scheduled' && (
          <div className="actions">
            <button type="button" className="button button-primary" disabled={busy || !hasPairs} onClick={() => run('echelon_start', {}, 'Match started')}>
              Start match
            </button>
          </div>
        )}

        {live && (
          <section className="admin-block">
            {!medal && (
              <label className="admin-check">
                <input type="checkbox" checked={cap} onChange={(e) => setCap(e.target.checked)} />
                Ended at the 15-minute cap (the leader&apos;s official score becomes 11)
              </label>
            )}
            <div className="actions">
              <button
                type="button"
                className="button button-primary"
                disabled={busy || !ready}
                onClick={() => run('echelon_confirm', { p_home: score.a, p_away: score.b, p_cap: !medal && cap }, 'Result confirmed')}
              >
                Confirm result
              </button>
              {score.a + score.b === 0 && (
                <button type="button" className="button button-ghost" disabled={busy} onClick={() => run('echelon_undo_start', {}, 'Start undone')}>
                  Undo start
                </button>
              )}
            </div>
            {!ready && (
              <p className="fine-print">Confirm unlocks at {medal ? '11 with a two-point lead' : '11, or when the cap box is ticked'}.</p>
            )}
          </section>
        )}

        {match.status === 'completed' && (
          <section className="admin-block">
            <p>
              Official result:{' '}
              <strong>
                {match.official?.a}–{match.official?.b}
              </strong>
              {match.capReached && match.onCourt ? ` (played ${match.onCourt.a}–${match.onCourt.b} at the cap)` : ''}
            </p>
            {role === 'supervisor' ? (
              <>
                <label className="admin-field">
                  <span>Reason (required)</span>
                  <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this result being corrected?" />
                </label>
                <div className="actions">
                  <button
                    type="button"
                    className="button button-ghost"
                    disabled={busy || !reason.trim()}
                    onClick={() => run('echelon_reopen', { p_reason: reason }, 'Match reopened')}
                  >
                    Reopen
                  </button>
                  <button
                    type="button"
                    className="button button-ghost"
                    disabled={busy || !reason.trim()}
                    onClick={() => {
                      if (window.confirm('Clear this result and set the match back to not started?')) {
                        void run('echelon_reset', { p_reason: reason }, 'Match reset')
                      }
                    }}
                  >
                    Reset
                  </button>
                </div>
              </>
            ) : (
              <p className="fine-print">Only a supervisor can reopen or reset a confirmed result.</p>
            )}
          </section>
        )}

        {match.status !== 'completed' && hasPairs && (
          <details className="admin-block">
            <summary>Forfeit</summary>
            <p className="fine-print">For a no-show or injury. The present pair wins 11–0.</p>
            <div className="admin-teams">
              <label>
                <span>Winner</span>
                <select value={forfeitWinner} onChange={(e) => setForfeitWinner(e.target.value as 'a' | 'b')}>
                  <option value="a">{pairName(match.teamAId)}</option>
                  <option value="b">{pairName(match.teamBId)}</option>
                </select>
              </label>
              <label className="admin-field">
                <span>Reason (required)</span>
                <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. no-show after 5 minutes" />
              </label>
            </div>
            <button
              type="button"
              className="button button-ghost"
              disabled={busy || !reason.trim()}
              onClick={() => {
                if (window.confirm('Record this match as a forfeit (11–0)?')) {
                  void run(
                    'echelon_forfeit',
                    { p_home: forfeitWinner === 'a' ? 11 : 0, p_away: forfeitWinner === 'b' ? 11 : 0, p_reason: reason },
                    'Forfeit recorded',
                  )
                }
              }}
            >
              Record forfeit 11–0
            </button>
          </details>
        )}

        <details className="admin-block">
          <summary>Court &amp; notes</summary>
          {match.status !== 'completed' && (
            <div className="admin-teams">
              <label>
                <span>Court</span>
                <select value={court} onChange={(e) => setCourt(Number(e.target.value))}>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((c) => (
                    <option key={c} value={c}>
                      Court {c}
                      {c === match.plannedCourt ? ' (scheduled)' : busyCourts.has(c) ? ' (busy)' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="button button-ghost"
                disabled={busy || court === match.court}
                onClick={() => {
                  if (!busyCourts.has(court) || window.confirm(`Court ${court} already has a match at this time. Move anyway?`)) {
                    void run('echelon_set_court', { p_court: court }, `Moved to court ${court}`)
                  }
                }}
              >
                Move match
              </button>
            </div>
          )}
          <label className="admin-field">
            <span>Note (up to 500 characters)</span>
            <textarea rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <label className="admin-check">
            <input type="checkbox" checked={notePublic} onChange={(e) => setNotePublic(e.target.checked)} />
            Show this note to players on the portal
          </label>
          <button
            type="button"
            className="button button-ghost"
            disabled={busy}
            onClick={() => run('echelon_set_note', { p_note: note, p_public: notePublic }, 'Note saved')}
          >
            Save note
          </button>
        </details>

        {live && (
          <p className="fine-print">
            Started by mistake or wrong score?{' '}
            <button
              type="button"
              className="link-button"
              disabled={busy}
              onClick={() => {
                if (window.confirm('Clear the score and set this match back to not started?')) {
                  void run('echelon_reset', { p_reason: 'Reset during play' }, 'Match reset')
                }
              }}
            >
              Reset this match
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
