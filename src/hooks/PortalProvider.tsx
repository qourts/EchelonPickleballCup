import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Phase } from '../config/publication.ts'
import { currentTime } from '../config/runtime.ts'
import {
  NotConfiguredError,
  NotPublishedError,
  type Loaded,
  type PortalDataSource,
} from '../data/source.ts'
import { resolvePhase } from '../domain/publication.ts'
import type { Match, Team } from '../domain/types.ts'
import { PortalContext, type PortalContextValue, type ResourceState } from './portalContext.ts'

const CLOCK_TICK_MS = 30_000
const STATUS_POLL_MS = 60_000
const ROSTER_POLL_MS = 5 * 60_000
const LIVE_MATCH_POLL_MS = 30_000
const IDLE_MATCH_POLL_MS = 5 * 60_000

type Setter<T> = (update: (previous: ResourceState<T>) => ResourceState<T>) => void

async function loadInto<T>(
  fetcher: (signal: AbortSignal) => Promise<Loaded<T>>,
  set: Setter<T>,
  signal: AbortSignal,
): Promise<void> {
  try {
    const { items, skipped } = await fetcher(signal)
    if (!signal.aborted) set(() => ({ status: 'ready', items, skipped }))
  } catch (error) {
    if (signal.aborted) return
    // Data already on screen is kept when a refresh fails; only a first load shows the problem.
    set((previous) => {
      if (previous.status === 'ready') return previous
      if (error instanceof NotConfiguredError) return { status: 'not-configured' }
      if (error instanceof NotPublishedError) return { status: 'not-published' }
      return { status: 'error', message: error instanceof Error ? error.message : 'Something went wrong.' }
    })
  }
}

function everyWhileVisible(task: () => void, intervalMs: number): () => void {
  const id = window.setInterval(() => {
    if (document.visibilityState === 'visible') task()
  }, intervalMs)
  return () => window.clearInterval(id)
}

export function PortalProvider({ source, children }: { source: PortalDataSource; children: ReactNode }) {
  const [now, setNow] = useState(currentTime)
  const [serverPhase, setServerPhase] = useState<Phase | null>(null)
  // Gated data waits for the first status answer so the server's phase (and any override) decides first.
  const [statusSettled, setStatusSettled] = useState(source.kind === 'unconfigured')
  const [roster, setRoster] = useState<ResourceState<Team>>({ status: 'idle' })
  const [matches, setMatches] = useState<ResourceState<Match>>({ status: 'idle' })
  const [reloadToken, setReloadToken] = useState(0)

  const phase = resolvePhase(now, serverPhase)
  const reload = useCallback(() => setReloadToken((n) => n + 1), [])

  useEffect(() => {
    const id = window.setInterval(() => setNow(currentTime()), CLOCK_TICK_MS)
    return () => window.clearInterval(id)
  }, [])

  // Server-reported phase wins over the visitor's clock; if the server is unreachable the clock is used.
  useEffect(() => {
    if (source.kind === 'unconfigured') return
    const controller = new AbortController()
    const refresh = () => {
      source
        .getStatus(controller.signal)
        .then((status) => {
          if (!controller.signal.aborted) setServerPhase(status.phase)
        })
        .catch(() => undefined)
        .finally(() => {
          if (!controller.signal.aborted) setStatusSettled(true)
        })
    }
    refresh()
    const stop = everyWhileVisible(refresh, STATUS_POLL_MS)
    return () => {
      controller.abort()
      stop()
    }
  }, [source, reloadToken])

  // Gated data is only requested once its phase is open.
  const dataOpen = phase >= 2 && statusSettled
  useEffect(() => {
    if (!dataOpen) return
    const controller = new AbortController()
    const refreshRoster = () => void loadInto((s) => source.getRoster(s), setRoster, controller.signal)
    const refreshMatches = () => void loadInto((s) => source.getMatches(s), setMatches, controller.signal)
    refreshRoster()
    refreshMatches()
    const stopRoster = everyWhileVisible(refreshRoster, ROSTER_POLL_MS)
    const stopMatches = everyWhileVisible(refreshMatches, phase >= 3 ? LIVE_MATCH_POLL_MS : IDLE_MATCH_POLL_MS)
    return () => {
      controller.abort()
      stopRoster()
      stopMatches()
    }
  }, [source, dataOpen, phase, reloadToken])

  const value = useMemo<PortalContextValue>(
    () => ({ phase, now, source, roster, matches, reload }),
    [phase, now, source, roster, matches, reload],
  )
  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>
}
