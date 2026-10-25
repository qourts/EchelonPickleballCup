import type { BracketLetter, CategoryId, DivisionId } from '../domain/types.ts'

export const EVENT = {
  name: 'Echelon Pickleball Cup 2026',
  tagline: 'Play with purpose. Every game makes a difference.',
  dateIso: '2026-11-21',
  dateLabel: 'Saturday, November 21, 2026',
  dateShort: 'Nov 21, 2026',
  venue: 'Kingcourts',
  address: 'Brgy. Panipuan, City of San Fernando, Pampanga, Philippines',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Kingcourts+Panipuan+San+Fernando+Pampanga',
  timetable: '9:00 AM–9:00 PM',
  courts: 10,
  timezone: 'Asia/Manila',
  serviceProvider: 'Qourts',
  feePhp: 1500,
  registrationDeadline: 'November 14, 2026',
  /** Decoded from the QR code on the official poster. Live availability is verified separately. */
  registrationUrl:
    'https://docs.google.com/forms/d/e/1FAIpQLSfXmTeXB74tdgd4rHdJI15Z7sdK9up5l3rR4ykdQ6VJOJjg-g/viewform?usp=header',
  charity: 'Echelon Eagles Medical Mission',
  charityStatement:
    'All net proceeds from the Echelon Pickleball Cup 2026 will benefit the Echelon Eagles Medical Mission.',
  inclusions: ['One tournament jersey per registered player', 'One meal per registered player'],
  prize: 'Tournament winners receive medals.',
} as const

export interface CategoryInfo {
  readonly id: CategoryId
  readonly name: string
  readonly short: string
  readonly pairing: string
}

/** Listed in tournament-day schedule order. */
export const CATEGORIES: readonly CategoryInfo[] = [
  { id: 'genderless', name: 'Genderless Doubles', short: 'Genderless', pairing: 'Any combination of two players' },
  { id: 'mens', name: "Men's Doubles", short: "Men's", pairing: 'Two men' },
  { id: 'mixed', name: 'Mixed Doubles', short: 'Mixed', pairing: 'One man and one woman' },
  { id: 'womens', name: "Women's Doubles", short: "Women's", pairing: 'Two women' },
]

export interface DivisionInfo {
  readonly id: DivisionId
  readonly name: string
  readonly short: string
  /** One-letter code used in match labels, e.g. "H-A1". */
  readonly code: 'N' | 'L' | 'H'
  readonly brackets: readonly BracketLetter[]
  /** Divisions with three brackets send a best-second-place wildcard to the semifinals. */
  readonly wildcard: boolean
  /** Descriptor printed on the official poster. Not a rating threshold. */
  readonly posterDescriptor: string
}

export const DIVISIONS: readonly DivisionInfo[] = [
  {
    id: 'novice',
    name: 'Novice',
    short: 'Novice',
    code: 'N',
    brackets: ['A', 'B', 'C'],
    wildcard: true,
    posterDescriptor: 'New to the game',
  },
  {
    id: 'low-intermediate',
    name: 'Low Intermediate',
    short: 'Low Int.',
    code: 'L',
    brackets: ['A', 'B', 'C', 'D'],
    wildcard: false,
    posterDescriptor: 'Improving consistency',
  },
  {
    id: 'high-intermediate',
    name: 'High Intermediate',
    short: 'High Int.',
    code: 'H',
    brackets: ['A', 'B', 'C'],
    wildcard: true,
    posterDescriptor: 'Advanced consistency',
  },
]

export function categoryInfo(id: CategoryId): CategoryInfo {
  const found = CATEGORIES.find((c) => c.id === id)
  if (!found) throw new Error(`Unknown category: ${id}`)
  return found
}

export function divisionInfo(id: DivisionId): DivisionInfo {
  const found = DIVISIONS.find((d) => d.id === id)
  if (!found) throw new Error(`Unknown division: ${id}`)
  return found
}

export const BRACKETS_PER_CATEGORY = DIVISIONS.reduce((sum, d) => sum + d.brackets.length, 0)
/** Planned capacity if every bracket fills. This is not a count of confirmed registrations. */
export const PLANNED_BRACKETS = BRACKETS_PER_CATEGORY * CATEGORIES.length
export const PLANNED_TEAM_POSITIONS = PLANNED_BRACKETS * 4
