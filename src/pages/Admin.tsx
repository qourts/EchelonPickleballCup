import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { stageLabel } from '../components/MatchRow.tsx'
import { Badge, Notice, PageHeader, SegmentedControl } from '../components/ui.tsx'
import { DIVISIONS } from '../config/event.ts'
import { TEAMS } from '../config/roster.ts'
import { freshSession, loadSession, signIn, signOut, type AdminSession } from '../data/adminAuth.ts'
import { callRpc } from '../data/supabase.ts'
import { byPlayingOrder } from '../domain/liveBoard.ts'
import { formatManilaTime } from '../domain/schedule.ts'
import { tryResolveOfficialScore, winningSide } from '../domain/scoring.ts'
import { buildTournamentView, teamLabel } from '../domain/tournament.ts'
import type { DivisionId, Match } from '../domain/types.ts'
import { usePortal } from '../hooks/portalContext.ts'

type Filter = 'all' | DivisionId
const TEAMS_BY_ID = new Map(TEAMS.map((t) => [t.id, t]))
const name = (id: string | null) => (id ? teamLabel(TEAMS_BY_ID.get(id)) : 'Not assigned')

/** Teams the rules put into a playoff match, once the results that decide them are in. */
function suggestedTeams(match: Match, matches: readonly Match[]): [string, string] | null {
  const view = buildTournamentView(TEAMS, matches)
  const division = view.division('genderless', match.division)
  if (!division) return null
  if (match.stage === 'semifinal') {
    const semi = division.qualification.semifinals.find((s) => s.index === match.semifinalIndex)
    return semi ? [semi.a.teamId, semi.b.teamId] : null
  }
  if (match.stage !== 'gold' && match.stage !== 'bronze') return null
  const outcome = (index: 1 | 2) => {
    const semi = matches.find((m) => m.division === match.division && m.stage === 'semifinal' && m.semifinalIndex === index)
    const score = semi && semi.status === 'completed' ? tryResolveOfficialScore(semi).score : null
    if (!semi || !score || !semi.teamAId || !semi.teamBId) return null
    const aWon = winningSide(score) === 'a'
    return { winner: aWon ? semi.teamAId : semi.teamBId, loser: aWon ? semi.teamBId : semi.teamAId }
  }
  const one = outcome(1)
  const two = outcome(2)
  if (!one || !two) return null
  return match.stage === 'gold' ? [one.winner, two.winner] : [one.loser, two.loser]
}

interface CardProps {
  match: Match
  suggestion: [string, string] | null
  run: (label: string, action: (token: string) => Promise<unknown>) => Promise<string | null>
}

function TeamPicker({
  label,
  value,
  onChange,
  division,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  division: DivisionId
}) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choose a pair</option>
        {TEAMS.filter((t) => t.division === division).map((t) => (
          <option key={t.id} value={t.id}>
            {t.slot}. {teamLabel(t)}
          </option>
        ))}
      </select>
    </label>
  )
}

function MatchCard({ match, suggestion, run }: CardProps) {
  const medal = match.stage === 'gold' || match.stage === 'bronze'
  const shown = match.onCourt ?? match.official
  const [a, setA] = useState(shown ? String(shown.a) : '')
  const [b, setB] = useState(shown ? String(shown.b) : '')
  const [cap, setCap] = useState(Boolean(match.capReached))
  const [teamA, setTeamA] = useState(match.teamAId ?? '')
  const [teamB, setTeamB] = useState(match.teamBId ?? '')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const hasTeams = Boolean(match.teamAId && match.teamBId)

  const act = async (label: string, rpc: string, args: object) => {
    setBusy(true)
    setMessage(await run(label, (token) => callRpc(rpc, { p_match: match.id, ...args }, token)))
    setBusy(false)
  }
  const score = (status: 'live' | 'completed') =>
    act(status === 'live' ? 'Live score saved' : 'Final score saved', 'echelon_save_score', {
      p_status: status,
      p_home: a === '' ? 0 : Number(a),
      p_away: b === '' ? 0 : Number(b),
      p_cap: !medal && cap,
    })

  return (
    <li className={`card admin-card is-${match.status}`}>
      <div className="admin-card-head">
        <span className="match-time">{formatManilaTime(match.startsAt)}</span>
        <span className="match-court">Court {match.court}</span>
        <span className="match-stage">{stageLabel(match)}</span>
        <Badge tone={match.status === 'live' ? 'live' : match.status === 'completed' ? 'ok' : 'neutral'}>
          {match.status === 'live' ? 'Live' : match.status === 'completed' ? 'Final' : 'Scheduled'}
        </Badge>
      </div>

      {match.stage !== 'preliminary' && match.status === 'scheduled' && (
        <div className="admin-teams">
          <TeamPicker label={match.labelA ?? 'Team A'} value={teamA} onChange={setTeamA} division={match.division} />
          <TeamPicker label={match.labelB ?? 'Team B'} value={teamB} onChange={setTeamB} division={match.division} />
          <div className="actions">
            {suggestion && (
              <button
                type="button"
                className="button button-ghost"
                disabled={busy}
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
              onClick={() => act('Teams saved', 'echelon_set_teams', { p_home: teamA, p_away: teamB })}
            >
              Save teams
            </button>
          </div>
        </div>
      )}

      <div className="admin-score">
        <label>
          <span>{name(match.teamAId)}</span>
          <input inputMode="numeric" type="number" min={0} value={a} onChange={(e) => setA(e.target.value)} />
        </label>
        <label>
          <span>{name(match.teamBId)}</span>
          <input inputMode="numeric" type="number" min={0} value={b} onChange={(e) => setB(e.target.value)} />
        </label>
      </div>
      {!medal && (
        <label className="admin-check">
          <input type="checkbox" checked={cap} onChange={(e) => setCap(e.target.checked)} />
          Ended at the 15-minute cap (the leader&apos;s official score becomes 11)
        </label>
      )}
      {match.official && match.status === 'completed' && (
        <p className="fine-print">
          Official result: {match.official.a}–{match.official.b}
        </p>
      )}
      <div className="actions">
        <button type="button" className="button button-ghost" disabled={busy || !hasTeams} onClick={() => score('live')}>
          Save as live
        </button>
        <button type="button" className="button button-primary" disabled={busy || !hasTeams} onClick={() => score('completed')}>
          Save final
        </button>
        {match.status !== 'scheduled' && (
          <button
            type="button"
            className="button button-ghost"
            disabled={busy}
            onClick={() => {
              if (window.confirm('Clear this score and set the match back to scheduled?')) {
                void act('Match reset', 'echelon_save_score', { p_status: 'scheduled', p_home: null, p_away: null, p_cap: false })
              }
            }}
          >
            Reset
          </button>
        )}
      </div>
      {message && (
        <p className="admin-message" role="status">
          {message}
        </p>
      )}
    </li>
  )
}

function SignIn({ onSignedIn }: { onSignedIn: (s: AdminSession) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      onSignedIn(await signIn(email, password))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card admin-signin" onSubmit={submit}>
      <label>
        <span>Email</span>
        <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        <span>Password</span>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && <p className="admin-message">{error}</p>}
      <button type="submit" className="button button-primary" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}

/** Match Control: admins record live and final scores and assign playoff pairs. */
export function Admin() {
  const { matches, reload } = usePortal()
  const [session, setSession] = useState<AdminSession | null>(loadSession)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [hideFinished, setHideFinished] = useState(true)

  useEffect(() => {
    if (!session) return
    let cancelled = false
    freshSession(session)
      .then((s) => callRpc<boolean>('echelon_is_admin', {}, s.accessToken))
      .then((ok) => {
        if (!cancelled) setIsAdmin(ok === true)
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false)
      })
    return () => {
      cancelled = true
    }
  }, [session])

  const items = useMemo(() => (matches.status === 'ready' ? matches.items : []), [matches])
  const shown = items
    .filter((m) => (filter === 'all' || m.division === filter) && (!hideFinished || m.status !== 'completed'))
    .slice()
    .sort(byPlayingOrder)

  const run: CardProps['run'] = async (label, action) => {
    if (!session) return 'Please sign in again.'
    try {
      const s = await freshSession(session)
      if (s !== session) setSession(s)
      await action(s.accessToken)
      reload()
      return label
    } catch (e) {
      return e instanceof Error ? e.message : 'Something went wrong.'
    }
  }

  if (!session) {
    return (
      <>
        <PageHeader eyebrow="Match Control" title="Admin sign-in" lead="For tournament officials only." />
        <SignIn onSignedIn={setSession} />
      </>
    )
  }

  return (
    <>
      <PageHeader eyebrow="Match Control" title="Scores" lead={`Signed in as ${session.email}.`} />
      <p className="actions">
        <button type="button" className="button button-ghost" onClick={reload}>
          Refresh
        </button>
        <button
          type="button"
          className="button button-ghost"
          onClick={() => {
            signOut(session)
            setSession(null)
            setIsAdmin(null)
          }}
        >
          Sign out
        </button>
      </p>
      {isAdmin === false && (
        <Notice tone="warn" title="This account is not an admin">
          <p>Ask the organizers to add your email to the Match Control admins, then sign in again.</p>
        </Notice>
      )}
      {isAdmin && (
        <>
          <div className="filters">
            <SegmentedControl<Filter>
              label="Division"
              value={filter}
              onChange={setFilter}
              options={[{ value: 'all', label: 'All' }, ...DIVISIONS.map((d) => ({ value: d.id, label: d.short }))]}
            />
            <label className="admin-check">
              <input type="checkbox" checked={hideFinished} onChange={(e) => setHideFinished(e.target.checked)} />
              Hide finished matches
            </label>
          </div>
          {matches.status !== 'ready' && <p className="muted">Loading matches…</p>}
          <ul className="admin-list">
            {shown.map((m) => (
              <MatchCard
                key={`${m.id}-${m.status}-${m.teamAId}-${m.teamBId}-${m.onCourt?.a}-${m.onCourt?.b}-${m.official?.a}`}
                match={m}
                suggestion={m.stage === 'preliminary' ? null : suggestedTeams(m, items)}
                run={run}
              />
            ))}
          </ul>
        </>
      )}
    </>
  )
}
