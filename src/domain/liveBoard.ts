import type { CategoryId, Match } from './types.ts'

export interface CourtStatus {
  readonly court: number
  /** Match in progress on this court, if any. */
  readonly live: Match | null
  /** Next scheduled match on this court. */
  readonly next: Match | null
}

export interface LiveBoard {
  /** Matches in progress, by court. */
  readonly live: readonly Match[]
  /** The earliest scheduled start time still to play, across all courts. */
  readonly upNext: readonly Match[]
  /** Every scheduled match after that, in playing order. */
  readonly queue: readonly Match[]
  readonly courts: readonly CourtStatus[]
}

function startTime(match: Match): number {
  const time = match.startsAt ? Date.parse(match.startsAt) : Number.NaN
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time
}

/** Playing order: start time, then court, then id. Matches without a time go last. */
export function byPlayingOrder(x: Match, y: Match): number {
  const tx = startTime(x)
  const ty = startTime(y)
  if (tx !== ty) return tx < ty ? -1 : 1
  return (x.court ?? 99) - (y.court ?? 99) || x.id.localeCompare(y.id)
}

/**
 * Live, up-next and queued matches from the published schedule. It only reads the status the
 * source publishes (scheduled, live, completed); it never guesses that a match has started.
 * Matches whose start time has passed but are still `scheduled` stay at the front of the
 * queue until Match Control marks them live.
 */
export function buildLiveBoard(
  matches: readonly Match[],
  options: { category?: CategoryId; courts?: number } = {},
): LiveBoard {
  const { category, courts: courtCount = 10 } = options
  const relevant = matches.filter((m) => !category || m.category === category)
  const live = relevant.filter((m) => m.status === 'live').sort(byPlayingOrder)
  const scheduled = relevant.filter((m) => m.status === 'scheduled').sort(byPlayingOrder)

  const first = scheduled[0]
  const firstTime = first ? startTime(first) : null
  const upNext = scheduled.filter((m) => startTime(m) === firstTime)
  const queue = scheduled.slice(upNext.length)

  const courts: CourtStatus[] = Array.from({ length: courtCount }, (_, i) => {
    const court = i + 1
    return {
      court,
      live: live.find((m) => m.court === court) ?? null,
      next: scheduled.find((m) => m.court === court) ?? null,
    }
  })
  return { live, upNext, queue, courts }
}
