import type { ResourceState } from '../hooks/portalContext.ts'
import { Notice } from './ui.tsx'

/**
 * Explains why published data is not on screen. Renders nothing once the data is ready, so a
 * page can place it unconditionally and then check `resource.status === 'ready'`.
 */
export function DataNotice({
  resource,
  noun,
  onRetry,
}: {
  resource: ResourceState<unknown>
  noun: string
  onRetry: () => void
}) {
  switch (resource.status) {
    case 'ready':
      return null
    case 'idle':
      return (
        <div className="skeleton-stack" aria-busy="true" aria-live="polite">
          <p className="visually-hidden">Loading {noun}…</p>
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton skeleton-short" />
        </div>
      )
    case 'not-configured':
      return (
        <Notice tone="gold" title={`Official ${noun} will appear here`}>
          <p>
            This website only shows data that Qourts publishes. That live data feed is not connected to this
            deployment yet, so there is nothing to display. No sample or placeholder data is being shown.
          </p>
        </Notice>
      )
    case 'not-published':
      return (
        <Notice tone="gold" title="Not published yet">
          <p>The official source has not released {noun} yet. This page checks again automatically.</p>
        </Notice>
      )
    case 'error':
      return (
        <Notice tone="warn" title={`We couldn't load ${noun}`}>
          <p>{resource.message}</p>
          <button type="button" className="button button-ghost" onClick={onRetry}>
            Try again
          </button>
        </Notice>
      )
  }
}

export function SkippedNotice({ skipped }: { skipped: number }) {
  if (skipped === 0) return null
  return (
    <Notice tone="warn" title="Some records were left out">
      <p>
        {skipped} record{skipped === 1 ? '' : 's'} from the data feed could not be read and are not shown. If your
        team is missing, please tell the Qourts match control desk.
      </p>
    </Notice>
  )
}
