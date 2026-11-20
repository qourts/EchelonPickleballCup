import { SUPABASE } from '../config/backend.ts'
import { DataSourceError } from './source.ts'

export interface AdminSession {
  readonly accessToken: string
  readonly refreshToken: string
  /** Epoch milliseconds. */
  readonly expiresAt: number
  readonly email: string
}

const STORAGE_KEY = 'echelon-cup-admin-session'
const REFRESH_MARGIN_MS = 60_000

async function tokenRequest(grant: 'password' | 'refresh_token', body: object): Promise<AdminSession> {
  let response: Response
  try {
    response = await fetch(`${SUPABASE.url}/auth/v1/token?grant_type=${grant}`, {
      method: 'POST',
      headers: { apikey: SUPABASE.publishableKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (error) {
    throw new DataSourceError('Could not reach the sign-in service.', { cause: error })
  }
  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null
  if (!response.ok || !data || typeof data.access_token !== 'string') {
    const message = data?.error_description ?? data?.msg ?? data?.message
    throw new DataSourceError(typeof message === 'string' ? message : 'Sign-in failed.')
  }
  const user = data.user as { email?: string } | undefined
  return {
    accessToken: data.access_token,
    refreshToken: String(data.refresh_token ?? ''),
    expiresAt: Date.now() + Number(data.expires_in ?? 3600) * 1000,
    email: user?.email ?? '',
  }
}

export function loadSession(): AdminSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AdminSession) : null
  } catch {
    return null
  }
}

function saveSession(session: AdminSession | null): void {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage blocked (private mode): the session lasts until the page is closed.
  }
}

export async function signIn(email: string, password: string): Promise<AdminSession> {
  const session = await tokenRequest('password', { email: email.trim(), password })
  saveSession(session)
  return session
}

/** A session that is still valid for at least a minute, refreshed if needed. */
export async function freshSession(session: AdminSession): Promise<AdminSession> {
  if (session.expiresAt - Date.now() > REFRESH_MARGIN_MS) return session
  const next = await tokenRequest('refresh_token', { refresh_token: session.refreshToken })
  const merged = { ...next, email: next.email || session.email }
  saveSession(merged)
  return merged
}

export function signOut(session: AdminSession | null): void {
  saveSession(null)
  if (!session) return
  void fetch(`${SUPABASE.url}/auth/v1/logout`, {
    method: 'POST',
    headers: { apikey: SUPABASE.publishableKey, Authorization: `Bearer ${session.accessToken}` },
  }).catch(() => undefined)
}
