import { createContext, useContext } from 'react'
import type { Phase } from '../config/publication.ts'
import type { PortalDataSource } from '../data/source.ts'
import type { Match, Team } from '../domain/types.ts'

export type ResourceState<T> =
  | { readonly status: 'idle' }
  | { readonly status: 'ready'; readonly items: readonly T[]; readonly skipped: number }
  | { readonly status: 'not-configured' }
  | { readonly status: 'not-published' }
  | { readonly status: 'error'; readonly message: string }

export interface PortalContextValue {
  readonly phase: Phase
  readonly now: Date
  readonly source: PortalDataSource
  readonly roster: ResourceState<Team>
  readonly matches: ResourceState<Match>
  /** Try the data requests again, for example after a network error. */
  readonly reload: () => void
}

export const PortalContext = createContext<PortalContextValue | null>(null)

export function usePortal(): PortalContextValue {
  const value = useContext(PortalContext)
  if (!value) throw new Error('usePortal must be used inside <PortalProvider>.')
  return value
}
