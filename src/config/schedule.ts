import type { CategoryId, DivisionId } from '../domain/types.ts'
import { SCORING } from './rules.ts'

/** Category blocks in tournament-day order. Times are minutes after midnight, Asia/Manila. */
export interface CategoryBlock {
  readonly category: CategoryId
  readonly startMinutes: number
  readonly endMinutes: number
}

const hour = (h: number) => h * 60

export const CATEGORY_BLOCKS: readonly CategoryBlock[] = [
  { category: 'genderless', startMinutes: hour(9), endMinutes: hour(12) },
  { category: 'mens', startMinutes: hour(12), endMinutes: hour(15) },
  { category: 'mixed', startMinutes: hour(15), endMinutes: hour(18) },
  { category: 'womens', startMinutes: hour(18), endMinutes: hour(21) },
]

export type BlockSegmentKind = 'wave' | 'tabulation' | 'semifinals' | 'medals'

export interface BlockSegment {
  readonly kind: BlockSegmentKind
  /** 1-6 for preliminary waves. */
  readonly wave?: number
  readonly offsetMinutes: number
  readonly durationMinutes: number
}

const PRELIMINARY_WAVES = 6

/** Inside every three-hour block: six 20-minute waves, tabulation, semifinals, medal window. */
export const BLOCK_PATTERN: readonly BlockSegment[] = [
  ...Array.from({ length: PRELIMINARY_WAVES }, (_, i): BlockSegment => ({
    kind: 'wave',
    wave: i + 1,
    offsetMinutes: i * SCORING.slotMinutes,
    durationMinutes: SCORING.slotMinutes,
  })),
  { kind: 'tabulation', offsetMinutes: PRELIMINARY_WAVES * SCORING.slotMinutes, durationMinutes: SCORING.slotMinutes },
  { kind: 'semifinals', offsetMinutes: (PRELIMINARY_WAVES + 1) * SCORING.slotMinutes, durationMinutes: SCORING.slotMinutes },
  { kind: 'medals', offsetMinutes: (PRELIMINARY_WAVES + 2) * SCORING.slotMinutes, durationMinutes: SCORING.slotMinutes },
]

/** Courts used for preliminary brackets, in bracket order A, B, C, D. */
export const PRELIMINARY_COURTS: Record<DivisionId, readonly number[]> = {
  'high-intermediate': [1, 2, 3],
  'low-intermediate': [4, 5, 6, 7],
  novice: [8, 9, 10],
}

export interface PlayoffCourts {
  /** Semifinal "#2 v #3" side and "#1 v #4" side, as laid out in the reference matrix. */
  readonly semifinalTwoVsThree: number
  readonly semifinalOneVsFour: number
  readonly gold: number
  readonly bronze: number
}

/** Semifinal and medal courts from the supplied reference matrix. */
export const PLAYOFF_COURTS: Record<DivisionId, PlayoffCourts> = {
  'high-intermediate': { semifinalTwoVsThree: 3, semifinalOneVsFour: 4, gold: 4, bronze: 3 },
  'low-intermediate': { semifinalTwoVsThree: 5, semifinalOneVsFour: 6, gold: 5, bronze: 6 },
  novice: { semifinalTwoVsThree: 7, semifinalOneVsFour: 8, gold: 8, bronze: 7 },
}
