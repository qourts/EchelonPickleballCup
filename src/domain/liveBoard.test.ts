import { describe, expect, it } from 'vitest'
import { buildLiveBoard } from './liveBoard.ts'
import type { Match } from './types.ts'

const match = (id: string, court: number, time: string, status: Match['status'], category: Match['category'] = 'genderless'): Match => ({
  id,
  stage: 'preliminary',
  category,
  division: 'novice',
  court,
  startsAt: `2026-11-21T${time}:00+08:00`,
  teamAId: null,
  teamBId: null,
  status,
})

const matches = [
  match('done', 1, '09:00', 'completed'),
  match('live2', 2, '09:20', 'live'),
  match('live1', 1, '09:20', 'live'),
  match('next-c3', 3, '09:40', 'scheduled'),
  match('next-c1', 1, '09:40', 'scheduled'),
  match('later-c1', 1, '10:00', 'scheduled'),
  match('later-c3', 3, '10:00', 'scheduled'),
  match('mens', 4, '12:00', 'scheduled', 'mens'),
]

describe('live board', () => {
  const board = buildLiveBoard(matches)

  it('lists matches in progress in court order and leaves finished ones out', () => {
    expect(board.live.map((m) => m.id)).toEqual(['live1', 'live2'])
  })

  it('puts the earliest scheduled start time in "up next" and the rest in the queue, in playing order', () => {
    expect(board.upNext.map((m) => m.id)).toEqual(['next-c1', 'next-c3'])
    expect(board.queue.map((m) => m.id)).toEqual(['later-c1', 'later-c3', 'mens'])
  })

  it('tells each court what is live and what is next', () => {
    const court1 = board.courts.find((c) => c.court === 1)!
    expect(court1.live?.id).toBe('live1')
    expect(court1.next?.id).toBe('next-c1')
    const court10 = board.courts.find((c) => c.court === 10)!
    expect(court10.live).toBeNull()
    expect(court10.next).toBeNull()
    expect(board.courts).toHaveLength(10)
  })

  it('filters by category', () => {
    const filtered = buildLiveBoard(matches, { category: 'mens' })
    expect(filtered.live).toHaveLength(0)
    expect(filtered.upNext.map((m) => m.id)).toEqual(['mens'])
  })

  it('keeps a late scheduled match at the front instead of guessing it started', () => {
    const late = buildLiveBoard([match('late', 5, '09:00', 'scheduled'), match('on-time', 6, '09:40', 'scheduled')])
    expect(late.upNext.map((m) => m.id)).toEqual(['late'])
    expect(late.live).toHaveLength(0)
  })

  it('handles an empty or finished schedule', () => {
    expect(buildLiveBoard([]).upNext).toEqual([])
    expect(buildLiveBoard([match('x', 1, '09:00', 'completed')]).queue).toEqual([])
  })
})
