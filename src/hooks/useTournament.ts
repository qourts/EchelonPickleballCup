import { useMemo } from 'react'
import { buildTournamentView, type TournamentView } from '../domain/tournament.ts'
import { usePortal, type ResourceState } from './portalContext.ts'
import type { Match, Team } from '../domain/types.ts'

export interface TournamentData {
  readonly roster: ResourceState<Team>
  readonly matches: ResourceState<Match>
  /** Present once the roster is available; matches may still be loading, in which case it has no results. */
  readonly view: TournamentView | null
  readonly skipped: number
  readonly reload: () => void
}

const NO_MATCHES: readonly Match[] = []

/** Roster and published matches joined into standings, qualification and playoff views. */
export function useTournament(): TournamentData {
  const { roster, matches, reload } = usePortal()
  const teams = roster.status === 'ready' ? roster.items : null
  const published = matches.status === 'ready' ? matches.items : NO_MATCHES

  const view = useMemo(() => (teams ? buildTournamentView(teams, published) : null), [teams, published])
  const skipped = (roster.status === 'ready' ? roster.skipped : 0) + (matches.status === 'ready' ? matches.skipped : 0)
  return { roster, matches, view, skipped, reload }
}
