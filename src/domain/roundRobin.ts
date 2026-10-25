import { BRACKET_FORMAT, ROUND_ROBIN_SEQUENCE } from '../config/rules.ts'

export interface Pairing {
  readonly round: number
  readonly teamA: string
  readonly teamB: string
}

/** Single round robin for a four-team bracket, in the published wave order. */
export function roundRobinPairings(teamIds: readonly string[]): Pairing[] {
  if (teamIds.length !== BRACKET_FORMAT.teamsPerBracket) {
    throw new Error(`A bracket needs exactly ${BRACKET_FORMAT.teamsPerBracket} teams (received ${teamIds.length}).`)
  }
  if (new Set(teamIds).size !== teamIds.length) {
    throw new Error('A bracket cannot contain the same team twice.')
  }
  return ROUND_ROBIN_SEQUENCE.map(([slotA, slotB], index) => {
    const teamA = teamIds[slotA - 1]
    const teamB = teamIds[slotB - 1]
    if (teamA === undefined || teamB === undefined) throw new Error('Round robin sequence references a missing slot.')
    return { round: index + 1, teamA, teamB }
  })
}
