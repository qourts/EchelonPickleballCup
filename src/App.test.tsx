// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App.tsx'
import type { Phase } from './config/publication.ts'
import { unconfiguredSource, type PortalDataSource } from './data/source.ts'
import { createFixtureSource } from './fixtures/fixtureSource.ts'

const SETTLE_MS = 80

function spySource(status: Phase | 'unreachable'): PortalDataSource & {
  getRoster: ReturnType<typeof vi.fn>
  getMatches: ReturnType<typeof vi.fn>
} {
  const inner = createFixtureSource(() => new Date('2026-11-21T12:00:00+08:00'))
  return {
    kind: 'http',
    getStatus: () =>
      status === 'unreachable'
        ? Promise.reject(new Error('offline'))
        : Promise.resolve({ phase: status, serverTime: null }),
    getRoster: vi.fn((signal?: AbortSignal) => inner.getRoster(signal)),
    getMatches: vi.fn((signal?: AbortSignal) => inner.getMatches(signal)),
  }
}

function openAt(now: string, route: string) {
  window.history.replaceState({}, '', `/?now=${encodeURIComponent(now)}`)
  window.location.hash = route
}

const settle = () => new Promise((resolve) => setTimeout(resolve, SETTLE_MS))

describe('publication phases in the running app', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn()
  })
  afterEach(() => cleanup())

  it('requests no gated data before Phase 2, even when its route is opened directly', async () => {
    openAt('2026-11-17T23:59:59+08:00', '#/brackets')
    const source = spySource(1)
    render(<App source={source} />)
    expect(await screen.findByText(/Opens November 18, 2026/)).toBeTruthy()
    await settle()
    expect(source.getRoster).not.toHaveBeenCalled()
    expect(source.getMatches).not.toHaveBeenCalled()
    expect(screen.queryByRole('heading', { name: /find your bracket/i })).toBeNull()
    expect(screen.queryAllByRole('link', { name: /^brackets$/i })).toHaveLength(0)
  })

  it('keeps standings and playoffs locked in Phase 2 while brackets are open', async () => {
    openAt('2026-11-18T00:00:00+08:00', '#/standings')
    const source = spySource(2)
    render(<App source={source} />)
    expect(await screen.findByText(/Opens November 21, 2026/)).toBeTruthy()
    expect(screen.queryAllByRole('link', { name: /^results$/i })).toHaveLength(0)
    expect(screen.getAllByRole('link', { name: /^brackets$/i }).length).toBeGreaterThan(0)
  })

  it('opens brackets and loads the roster at Philippine midnight on November 18', async () => {
    openAt('2026-11-18T00:00:00+08:00', '#/brackets')
    const source = spySource(2)
    render(<App source={source} />)
    expect(await screen.findByRole('heading', { name: /find your bracket/i })).toBeTruthy()
    await waitFor(() => expect(source.getRoster).toHaveBeenCalled())
    expect(await screen.findByRole('searchbox')).toBeTruthy()
  })

  it('lets the server phase win over the visitor clock', async () => {
    openAt('2026-11-19T10:00:00+08:00', '#/brackets')
    const source = spySource(1)
    render(<App source={source} />)
    expect(await screen.findByText(/Opens November 18, 2026/)).toBeTruthy()
    await settle()
    expect(source.getRoster).not.toHaveBeenCalled()
  })

  it('falls back to the clock when the status endpoint cannot be reached', async () => {
    openAt('2026-11-19T10:00:00+08:00', '#/brackets')
    const source = spySource('unreachable')
    render(<App source={source} />)
    await waitFor(() => expect(source.getRoster).toHaveBeenCalled())
  })

  it('shows a guide-only experience with pending states when no data source is configured', async () => {
    openAt('2026-11-19T10:00:00+08:00', '#/brackets')
    render(<App source={unconfiguredSource} />)
    expect(await screen.findByText(/will appear here/i)).toBeTruthy()
  })
})
