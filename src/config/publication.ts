/**
 * Publication schedule: the single place that decides when each part of the portal opens.
 *
 * Instants carry an explicit +08:00 offset (Asia/Manila has no daylight saving), so the
 * switch happens at Philippine midnight whatever the visitor's own time zone is.
 *
 * This only drives the interface. Real protection comes from the data source: the portal API
 * must refuse to serve a phase's data before that phase opens (see docs/INTEGRATION.md).
 */
export type Phase = 1 | 2 | 3

export type PortalSection = 'home' | 'guide' | 'schedule' | 'brackets' | 'live' | 'standings' | 'playoffs'

export const PUBLICATION = {
  timezone: 'Asia/Manila',
  phase2OpensAt: '2026-11-18T00:00:00+08:00',
  phase3OpensAt: '2026-11-21T00:00:00+08:00',
} as const

export const PHASE_OPENS_LABEL: Record<2 | 3, string> = {
  2: 'November 18, 2026',
  3: 'November 21, 2026',
}

/** First phase in which each section is visible. */
export const SECTION_MIN_PHASE: Record<PortalSection, Phase> = {
  home: 1,
  guide: 1,
  schedule: 1,
  brackets: 2,
  live: 3,
  standings: 3,
  playoffs: 3,
}
