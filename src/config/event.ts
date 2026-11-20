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
  timetable: '9:00 AM–3:30 PM',
  courtNumbers: [8, 9, 10],
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

/** This event plays a single doubles category. */
export const CATEGORIES: readonly CategoryInfo[] = [
  { id: 'genderless', name: 'Doubles', short: 'Doubles', pairing: 'Any two players' },
]

export interface DivisionInfo {
  readonly id: DivisionId
  readonly name: string
  readonly short: string
  /** One-letter code used in team and match ids, e.g. "N1", "N-R1-C8". */
  readonly code: 'N' | 'L' | 'H'
  readonly brackets: readonly BracketLetter[]
  /** Divisions with three brackets send a best-second-place wildcard to the semifinals. */
  readonly wildcard: boolean
  /** Descriptor printed on the official poster. Not a rating threshold. */
  readonly posterDescriptor: string
}

/** Each division is one round-robin group of six pairs (bracket "A"). */
export const DIVISIONS: readonly DivisionInfo[] = [
  {
    id: 'novice',
    name: 'Novice',
    short: 'Novice',
    code: 'N',
    brackets: ['A'],
    wildcard: false,
    posterDescriptor: 'New to the game',
  },
  {
    id: 'low-intermediate',
    name: 'Low Intermediate',
    short: 'Low Int.',
    code: 'L',
    brackets: ['A'],
    wildcard: false,
    posterDescriptor: 'Improving consistency',
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

/** "Round-robin group" when a division has one bracket, otherwise "Bracket X". */
export function bracketTitle(division: DivisionId, letter: BracketLetter): string {
  return divisionInfo(division).brackets.length === 1 ? 'Round-robin group' : `Bracket ${letter}`
}
