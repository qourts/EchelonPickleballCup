import {
  PUBLICATION,
  SECTION_MIN_PHASE,
  type Phase,
  type PortalSection,
} from '../config/publication.ts'

type PublicationConfig = Pick<typeof PUBLICATION, 'phase2OpensAt' | 'phase3OpensAt'>

function instant(iso: string): number {
  const value = Date.parse(iso)
  if (Number.isNaN(value)) throw new Error(`Invalid publication date: ${iso}`)
  return value
}

/** Phase in effect at `now`, by the published schedule. The boundaries are inclusive. */
export function phaseAt(now: Date | number, config: PublicationConfig = PUBLICATION): Phase {
  const time = typeof now === 'number' ? now : now.getTime()
  if (time >= instant(config.phase3OpensAt)) return 3
  if (time >= instant(config.phase2OpensAt)) return 2
  return 1
}

export function isPhase(value: unknown): value is Phase {
  return value === 1 || value === 2 || value === 3
}

/**
 * Phase the interface should assume. A phase reported by the portal API wins, because it
 * reflects the server's clock and any authorized Qourts override; the visitor's own clock is
 * only a fallback when the API cannot be reached.
 */
export function resolvePhase(now: Date | number, serverPhase: Phase | null): Phase {
  return serverPhase ?? phaseAt(now)
}

export function isSectionPublished(section: PortalSection, phase: Phase): boolean {
  return phase >= SECTION_MIN_PHASE[section]
}
