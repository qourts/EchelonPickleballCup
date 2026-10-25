import { describe, expect, it } from 'vitest'
import { SCORING } from '../config/rules.ts'
import {
  isValidMedalScore,
  isValidRaceScore,
  normalizeTimeCapScore,
  resolveOfficialScore,
  ScoreError,
  tryResolveOfficialScore,
} from './scoring.ts'
import type { Match } from './types.ts'

const baseMatch: Match = {
  id: 'x',
  stage: 'preliminary',
  category: 'genderless',
  division: 'novice',
  court: 1,
  startsAt: null,
  teamAId: 'a',
  teamBId: 'b',
  status: 'completed',
}

describe('time-cap score normalization', () => {
  it('raises the leader to 11 and keeps the loser actual score (8-6 -> 11-6)', () => {
    expect(normalizeTimeCapScore({ a: 8, b: 6 })).toEqual({ a: 11, b: 6 })
    expect(normalizeTimeCapScore({ a: 6, b: 8 })).toEqual({ a: 6, b: 11 })
  })

  it('normalizes the on-court score reached after a tied cap (7-7 played on to 8-7 -> 11-7)', () => {
    expect(normalizeTimeCapScore({ a: 8, b: 7 })).toEqual({ a: 11, b: 7 })
  })

  it('refuses a tie, because play must continue until someone leads', () => {
    expect(() => normalizeTimeCapScore({ a: 7, b: 7 })).toThrow(ScoreError)
  })

  it('leaves a match that reached 11 on points unchanged and rejects impossible scores', () => {
    expect(normalizeTimeCapScore({ a: 11, b: 9 })).toEqual({ a: 11, b: 9 })
    expect(() => normalizeTimeCapScore({ a: 12, b: 9 })).toThrow(ScoreError)
    expect(() => normalizeTimeCapScore({ a: -1, b: 2 })).toThrow(ScoreError)
    expect(() => normalizeTimeCapScore({ a: 3.5, b: 2 })).toThrow(ScoreError)
  })
})

describe('official score resolution', () => {
  it('derives the adjusted score from a capped on-court score and keeps the on-court score separate', () => {
    const match: Match = { ...baseMatch, onCourt: { a: 8, b: 6 }, capReached: true }
    expect(resolveOfficialScore(match)).toEqual({ a: 11, b: 6 })
    expect(match.onCourt).toEqual({ a: 8, b: 6 })
  })

  it('takes a regulation result as played', () => {
    expect(resolveOfficialScore({ ...baseMatch, onCourt: { a: 11, b: 4 } })).toEqual({ a: 11, b: 4 })
  })

  it('prefers a published official score', () => {
    const match: Match = { ...baseMatch, onCourt: { a: 8, b: 6 }, capReached: true, official: { a: 11, b: 6 } }
    expect(resolveOfficialScore(match)).toEqual({ a: 11, b: 6 })
  })

  it('has no result until the match is completed', () => {
    expect(resolveOfficialScore({ ...baseMatch, status: 'live', onCourt: { a: 3, b: 2 } })).toBeNull()
    expect(resolveOfficialScore({ ...baseMatch, status: 'scheduled' })).toBeNull()
  })

  it('flags impossible published scores instead of counting them', () => {
    const bad: Match = { ...baseMatch, official: { a: 9, b: 7 } }
    expect(() => resolveOfficialScore(bad)).toThrow(ScoreError)
    expect(tryResolveOfficialScore(bad)).toEqual({ score: null, invalid: true })
  })
})

describe('medal and tiebreaker scores', () => {
  it('requires a two-point margin from 11 with deuce', () => {
    expect(isValidMedalScore({ a: 11, b: 9 })).toBe(true)
    expect(isValidMedalScore({ a: 11, b: 10 })).toBe(false)
    expect(isValidMedalScore({ a: 12, b: 10 })).toBe(true)
    expect(isValidMedalScore({ a: 14, b: 12 })).toBe(true)
    expect(isValidMedalScore({ a: 13, b: 10 })).toBe(false)
    expect(isValidMedalScore({ a: 10, b: 8 })).toBe(false)
  })

  it('never normalizes a medal match: there is no time cap to apply', () => {
    expect(SCORING).not.toHaveProperty('medalCapMinutes')
    const gold: Match = { ...baseMatch, stage: 'gold', onCourt: { a: 8, b: 6 }, capReached: true }
    expect(() => resolveOfficialScore(gold)).toThrow(ScoreError)
    expect(resolveOfficialScore({ ...gold, onCourt: { a: 13, b: 11 }, capReached: false })).toEqual({ a: 13, b: 11 })
  })

  it('accepts race-to-6 results with no deuce', () => {
    expect(isValidRaceScore({ a: 6, b: 5 }, 6)).toBe(true)
    expect(isValidRaceScore({ a: 7, b: 5 }, 6)).toBe(false)
    expect(isValidRaceScore({ a: 6, b: 6 }, 6)).toBe(false)
  })
})
