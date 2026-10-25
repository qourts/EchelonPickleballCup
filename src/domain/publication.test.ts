import { describe, expect, it } from 'vitest'
import { isSectionPublished, phaseAt, resolvePhase } from './publication.ts'

describe('publication phases (Asia/Manila)', () => {
  it('is Phase 1 until Philippine midnight on November 18', () => {
    expect(phaseAt(new Date('2026-10-25T12:00:00+08:00'))).toBe(1)
    expect(phaseAt(new Date('2026-11-17T23:59:59.999+08:00'))).toBe(1)
  })

  it('opens Phase 2 at 12:00 AM on November 18, Philippine time', () => {
    expect(phaseAt(new Date('2026-11-18T00:00:00+08:00'))).toBe(2)
    expect(phaseAt(new Date('2026-11-20T23:59:59.999+08:00'))).toBe(2)
  })

  it('opens Phase 3 at 12:00 AM on November 21, Philippine time', () => {
    expect(phaseAt(new Date('2026-11-21T00:00:00+08:00'))).toBe(3)
    expect(phaseAt(new Date('2027-01-01T00:00:00+08:00'))).toBe(3)
  })

  it('switches at the same instant for visitors in any time zone (UTC equivalents)', () => {
    expect(phaseAt(new Date('2026-11-17T15:59:59Z'))).toBe(1)
    expect(phaseAt(new Date('2026-11-17T16:00:00Z'))).toBe(2)
    expect(phaseAt(new Date('2026-11-20T15:59:59Z'))).toBe(2)
    expect(phaseAt(new Date('2026-11-20T16:00:00Z'))).toBe(3)
    // Still the 17th / 20th in Los Angeles even though it is already the 18th / 21st in Manila.
    expect(phaseAt(new Date('2026-11-17T08:00:00-08:00'))).toBe(2)
  })

  it('lets a phase reported by the server win over the local clock', () => {
    const now = new Date('2026-11-19T10:00:00+08:00')
    expect(resolvePhase(now, null)).toBe(2)
    expect(resolvePhase(now, 1)).toBe(1)
    expect(resolvePhase(now, 3)).toBe(3)
  })

  it('shows sections only once their phase is open', () => {
    expect(isSectionPublished('guide', 1)).toBe(true)
    expect(isSectionPublished('schedule', 1)).toBe(true)
    expect(isSectionPublished('brackets', 1)).toBe(false)
    expect(isSectionPublished('brackets', 2)).toBe(true)
    expect(isSectionPublished('standings', 2)).toBe(false)
    expect(isSectionPublished('playoffs', 2)).toBe(false)
    expect(isSectionPublished('standings', 3)).toBe(true)
    expect(isSectionPublished('playoffs', 3)).toBe(true)
  })
})
