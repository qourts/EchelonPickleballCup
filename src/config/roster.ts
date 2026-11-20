import type { Team, TeamSlot } from '../domain/types.ts'

/**
 * Official pairs for November 21, 2026. Published with bracket assignments (open since
 * November 18), so it is safe to ship in the site. Names only.
 */
const NOVICE: readonly (readonly [string, string])[] = [
  ['Michael de Belen', 'Reynaldo Serrano'],
  ['Mchale Yalung', 'Kera Yale Gomez'],
  ['Joshua Toledano', 'Vincent David'],
  // shortcut: same first player as Novice 2 in the organizer's list; awaiting the corrected name.
  ['Mchale Yalung', 'Dave Aldrin David'],
  ['Renato Gomez', 'Marlon Ferrer'],
  ['Kathleen Gomez', 'Crystal Lagazon'],
]

const LOW_INTERMEDIATE: readonly (readonly [string, string])[] = [
  ['Angelo Jade Rivera', 'Vienne Vladimir Ocampo'],
  ['Paul Dexter Galang', 'Jessie Boy San Mateo'],
  ['Ryan Tan', 'Jr Pineda'],
  ['Raul Mamac', 'Fernando Mamac'],
  ['Bob Kervin Manalang', 'Paolo Nicolas Mallari'],
  ['Arman Cagampang', 'Glenn Cagampang'],
]

function pairs(code: 'N' | 'L', division: Team['division'], list: readonly (readonly [string, string])[]): Team[] {
  return list.map(([p1, p2], i) => {
    const id = `${code}${i + 1}`
    return {
      id,
      category: 'genderless',
      division,
      bracket: 'A',
      slot: (i + 1) as TeamSlot,
      players: [
        { id: `${id}-p1`, name: p1 },
        { id: `${id}-p2`, name: p2 },
      ],
    }
  })
}

export const TEAMS: readonly Team[] = [
  ...pairs('N', 'novice', NOVICE),
  ...pairs('L', 'low-intermediate', LOW_INTERMEDIATE),
]
