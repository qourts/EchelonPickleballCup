import { PUBLICATION } from '../config/publication.ts'
import { EVENT } from '../config/event.ts'
import { BLOCK_PATTERN, type BlockSegment, type CategoryBlock } from '../config/schedule.ts'

export interface TimedSegment extends BlockSegment {
  readonly startMinutes: number
  readonly endMinutes: number
}

/** Place the standard block pattern on the clock for one category block. */
export function timelineFor(block: CategoryBlock): TimedSegment[] {
  return BLOCK_PATTERN.map((segment) => ({
    ...segment,
    startMinutes: block.startMinutes + segment.offsetMinutes,
    endMinutes: block.startMinutes + segment.offsetMinutes + segment.durationMinutes,
  }))
}

/** 540 -> "9:00 AM", 1260 -> "9:00 PM". */
export function formatClock(totalMinutes: number): string {
  const minutes = ((totalMinutes % 1440) + 1440) % 1440
  const h24 = Math.floor(minutes / 60)
  const m = minutes % 60
  const suffix = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`
}

export const formatRange = (start: number, end: number) => `${formatClock(start)}–${formatClock(end)}`

/** ISO instant (Asia/Manila, +08:00) for a clock time on event day. Handy for fixtures and tests. */
export function eventInstant(minutesAfterMidnight: number): string {
  const h = String(Math.floor(minutesAfterMidnight / 60)).padStart(2, '0')
  const m = String(minutesAfterMidnight % 60).padStart(2, '0')
  return `${EVENT.dateIso}T${h}:${m}:00+08:00`
}

const clockFormatter = new Intl.DateTimeFormat('en-PH', {
  timeZone: PUBLICATION.timezone,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

/** Format a published match start in Philippine time regardless of the viewer's device zone. */
export function formatManilaTime(iso: string | null): string {
  if (!iso) return 'Time to be announced'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Time to be announced'
  return clockFormatter.format(date).replace(/\s+/g, ' ').toUpperCase()
}
