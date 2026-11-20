import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Badge, Notice, PageHeader, SegmentedControl } from '../components/ui.tsx'
import { loadAdminMatches, loadRole, type AdminMatch, type AdminRole } from '../data/adminApi.ts'
import { freshSession, loadSession, signIn, signOut, type AdminSession } from '../data/adminAuth.ts'
import { ScoringPanel } from './admin/ScoringPanel.tsx'
import { ActivityTab, CourtsTab, HelpTab, ScoresTab, StandingsTab, TeamsTab } from './admin/Tabs.tsx'

const REFRESH_MS = 5_000
type Tab = 'courts' | 'scores' | 'standings' | 'activity' | 'teams' | 'help'
type Connection = 'connecting' | 'live' | 'offline'

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
        <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      {error && <p className="admin-message">{error}</p>}
      <button type="submit" className="button button-primary" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}

/** Match Control: the scoring console for tournament officials. */
export function Admin() {
  const [session, setSession] = useState<AdminSession | null>(loadSession)
  const sessionRef = useRef(session)
  const [role, setRole] = useState<AdminRole | null | undefined>(undefined)
  const [matches, setMatches] = useState<AdminMatch[]>([])
  const [connection, setConnection] = useState<Connection>('connecting')
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('courts')
  const [openId, setOpenId] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const getToken = useCallback(async () => {
    const current = sessionRef.current
    if (!current) throw new Error('Please sign in again.')
    const fresh = await freshSession(current)
    if (fresh !== current) {
      sessionRef.current = fresh
      setSession(fresh)
    }
    return fresh.accessToken
  }, [])
  const refresh = useCallback(() => setTick((n) => n + 1), [])

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    if (!session) return
    let cancelled = false
    getToken()
      .then(loadRole)
      .then((r) => !cancelled && setRole(r))
      .catch(() => !cancelled && setRole(null))
    return () => {
      cancelled = true
    }
  }, [session, getToken])

  useEffect(() => {
    if (!session || !role) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const rows = await loadAdminMatches(await getToken(), controller.signal)
        if (controller.signal.aborted) return
        setMatches(rows)
        setConnection('live')
        setError(null)
      } catch (e) {
        if (controller.signal.aborted) return
        setConnection('offline')
        setError(e instanceof Error ? e.message : null)
      }
    }
    void load()
    const id = window.setInterval(() => document.visibilityState === 'visible' && void load(), REFRESH_MS)
    return () => {
      controller.abort()
      window.clearInterval(id)
    }
  }, [session, role, getToken, tick])

  if (!session) {
    return (
      <>
        <PageHeader eyebrow="Match Control" title="Admin sign-in" lead="For tournament officials only." />
        <SignIn onSignedIn={(s) => [setSession(s), setRole(undefined)]} />
      </>
    )
  }

  const open = matches.find((m) => m.id === openId)
  return (
    <>
      <header className="admin-head">
        <div>
          <p className="eyebrow">Match Control</p>
          <h1>Scoring</h1>
          <p className="muted">
            {session.email}
            {role ? ` · ${role === 'supervisor' ? 'Supervisor' : 'Scorer'}` : ''}
          </p>
        </div>
        <div className="actions">
          <Badge tone={connection === 'live' ? 'ok' : connection === 'offline' ? 'live' : 'neutral'}>
            {connection === 'live' ? 'Live' : connection === 'offline' ? "Can't reach the score server, trying again" : 'Connecting…'}
          </Badge>
          <button type="button" className="button button-ghost" onClick={refresh}>
            Refresh
          </button>
          <button
            type="button"
            className="button button-ghost"
            onClick={() => {
              signOut(session)
              setSession(null)
              setRole(undefined)
              setMatches([])
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      {role === null && (
        <Notice tone="warn" title="This account is not a Match Control admin">
          <p>Ask a supervisor to add your email to the admins, then sign out and in again.</p>
        </Notice>
      )}
      {error && connection === 'offline' && <p className="admin-message">{error}</p>}

      {role && (
        <>
          <nav className="admin-tabs" aria-label="Match Control">
            <SegmentedControl<Tab>
              label="Section"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'courts', label: 'Courts' },
                { value: 'scores', label: 'Scores' },
                { value: 'standings', label: 'Standings' },
                { value: 'activity', label: 'Activity' },
                { value: 'teams', label: 'Teams' },
                { value: 'help', label: 'Help' },
              ]}
            />
          </nav>
          {tab === 'courts' && <CourtsTab matches={matches} onOpen={setOpenId} />}
          {tab === 'scores' && <ScoresTab matches={matches} onOpen={setOpenId} />}
          {tab === 'standings' && <StandingsTab matches={matches} />}
          {tab === 'activity' && <ActivityTab getToken={getToken} matches={matches} />}
          {tab === 'teams' && <TeamsTab />}
          {tab === 'help' && <HelpTab />}
          {open && (
            <ScoringPanel
              key={open.id}
              match={open}
              matches={matches}
              role={role}
              getToken={getToken}
              onChanged={refresh}
              onClose={() => setOpenId(null)}
            />
          )}
        </>
      )}
    </>
  )
}
