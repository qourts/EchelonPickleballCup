// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Admin } from './Admin.tsx'

interface Row {
  id: string
  division: string
  stage: string
  round: number
  court: number
  plannedCourt: number
  startsAt: string
  homeId: string | null
  awayId: string | null
  status: string
  onCourt: { a: number; b: number } | null
  official: { a: number; b: number } | null
  capReached: boolean
  forfeit: boolean
  note: string | null
  notePublic: boolean
  version: number
  updatedBy: string | null
  updatedAt: string | null
}

const base: Row = {
  id: 'N-R1-C8',
  division: 'novice',
  stage: 'preliminary',
  round: 1,
  court: 8,
  plannedCourt: 8,
  startsAt: '2026-11-21T09:00:00+08:00',
  homeId: 'N1',
  awayId: 'N2',
  status: 'scheduled',
  onCourt: null,
  official: null,
  capReached: false,
  forfeit: false,
  note: null,
  notePublic: false,
  version: 0,
  updatedBy: null,
  updatedAt: null,
}

/** A tiny stand-in for the Supabase functions, enforcing versions like the real ones. */
function fakeServer(initial: Row) {
  const state = { row: { ...initial }, calls: [] as { fn: string; body: Record<string, unknown> }[] }
  const reply = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status }))
  const fetchMock = vi.fn((url: string, init: RequestInit) => {
    const fn = url.split('/rpc/')[1] ?? ''
    const body = JSON.parse(String(init.body ?? '{}')) as Record<string, unknown>
    state.calls.push({ fn, body })
    if (fn === 'echelon_admin_role') return reply(200, 'supervisor')
    if (fn === 'echelon_admin_matches') return reply(200, [state.row])
    if (body.p_version !== state.row.version) {
      return reply(400, { message: 'This match was changed by someone else. The latest score has been loaded.' })
    }
    if (fn === 'echelon_start') state.row = { ...state.row, status: 'live', onCourt: { a: 0, b: 0 } }
    if (fn === 'echelon_live_score') state.row = { ...state.row, onCourt: { a: Number(body.p_home), b: Number(body.p_away) } }
    state.row = { ...state.row, version: state.row.version + 1 }
    return reply(200, { ok: true, version: state.row.version })
  })
  vi.stubGlobal('fetch', fetchMock)
  return state
}

describe('Match Control', () => {
  beforeEach(() => {
    localStorage.setItem(
      'echelon-cup-admin-session',
      JSON.stringify({ accessToken: 'token', refreshToken: 'r', expiresAt: Date.now() + 3_600_000, email: 'official@example.com' }),
    )
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('starts a match from the court board and saves each point with the latest version', async () => {
    const server = fakeServer(base)
    render(<Admin />)
    fireEvent.click(await screen.findByText('Tap to start'))
    fireEvent.click(await screen.findByRole('button', { name: 'Start match' }))
    await waitFor(() => expect(server.calls.some((c) => c.fn === 'echelon_start' && c.body.p_version === 0)).toBe(true))

    const plus = await screen.findAllByRole('button', { name: 'Add a point' })
    fireEvent.click(plus[0]!)
    fireEvent.click(plus[0]!)
    await waitFor(() => {
      const saves = server.calls.filter((c) => c.fn === 'echelon_live_score')
      expect(saves.at(-1)?.body).toMatchObject({ p_home: 2, p_away: 0 })
    })
    expect(server.row.onCourt).toEqual({ a: 2, b: 0 })
    expect(await screen.findByText('Saved')).toBeTruthy()
  })

  it('refuses a stale save and tells the official the match changed', async () => {
    const server = fakeServer({ ...base, status: 'live', onCourt: { a: 3, b: 3 }, version: 5 })
    render(<Admin />)
    fireEvent.click(await screen.findByText('Tap to score'))
    server.row = { ...server.row, version: 6 } // someone else saved in the meantime
    fireEvent.click((await screen.findAllByRole('button', { name: 'Add a point' }))[1]!)
    expect(await screen.findByText(/changed by someone else/)).toBeTruthy()
  })

  it('shows the sign-in form when nobody is signed in', () => {
    localStorage.clear()
    fakeServer(base)
    render(<Admin />)
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy()
  })
})
