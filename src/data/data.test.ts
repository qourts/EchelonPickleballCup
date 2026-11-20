import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildDemoMatches, buildDemoTeams } from '../fixtures/demoTournament.ts'
import { createFixtureSource } from '../fixtures/fixtureSource.ts'
import seedSql from '../../supabase/echelon_cup.sql?raw'
import { EVENT_MATCHES } from '../config/schedule.ts'
import { createSupabaseSource } from './supabase.ts'
import { DataSourceError, NotConfiguredError, NotPublishedError, unconfiguredSource } from './source.ts'
import { parseMatches, parseRoster, parseStatus } from './validate.ts'

const at = (iso: string) => () => new Date(iso)

describe('demo tournament structure', () => {
  const teams = buildDemoTeams()
  const matches = buildDemoMatches(teams)

  it('has two divisions of six pairs', () => {
    expect(teams).toHaveLength(12)
    expect(teams.filter((t) => t.division === 'novice')).toHaveLength(6)
    expect(teams.filter((t) => t.division === 'low-intermediate')).toHaveLength(6)
  })

  it('plays 15 distinct round-robin matches per division, five per pair, three per round on courts 8-10', () => {
    const prelims = matches.filter((m) => m.stage === 'preliminary')
    expect(prelims).toHaveLength(30)
    const perTeam = new Map<string, number>()
    const pairs = new Set<string>()
    for (const m of prelims) {
      perTeam.set(m.teamAId!, (perTeam.get(m.teamAId!) ?? 0) + 1)
      perTeam.set(m.teamBId!, (perTeam.get(m.teamBId!) ?? 0) + 1)
      pairs.add([m.teamAId, m.teamBId].sort().join('-'))
    }
    expect(pairs.size).toBe(30)
    expect([...perTeam.values()].every((n) => n === 5)).toBe(true)
    const slots = new Map<string, number[]>()
    for (const m of prelims) slots.set(m.startsAt!, [...(slots.get(m.startsAt!) ?? []), m.court!])
    expect([...slots.values()].every((courts) => courts.sort().join() === '10,8,9')).toBe(true)
  })

  it('matches the matches seeded in supabase/echelon_cup.sql exactly', () => {
    const seeded = [
      ...seedSql.matchAll(/\('([NL]-[A-Z0-9-]+)', '([a-z-]+)', '([a-z]+)', (\d+), (\d+), '([^']+)', (null|'[NL]\d'), (null|'[NL]\d')\)/g),
    ]
    expect(seeded).toHaveLength(EVENT_MATCHES.length)
    for (const [, id, division, stage, round, court, starts, home, away] of seeded) {
      const m = EVENT_MATCHES.find((x) => x.id === id)!
      expect([m.division, m.stage, m.round, m.court]).toEqual([division, stage, Number(round), Number(court)])
      expect(Date.parse(m.startsAt!)).toBe(Date.parse(starts!.replace(' ', 'T').replace('+08', '+08:00')))
      const unquote = (v: string | undefined) => (v === 'null' ? null : v!.slice(1, -1))
      expect([m.teamAId, m.teamBId]).toEqual([unquote(home), unquote(away)])
    }
  })

  it('keeps original on-court scores apart from adjusted official scores', () => {
    const capped = matches.find((m) => m.capReached && m.stage === 'preliminary')!
    expect(capped.onCourt).not.toEqual(capped.official)
    expect(Math.max(capped.official!.a, capped.official!.b)).toBe(11)
  })
})

describe('server-side release gating (fixture mirrors the API contract)', () => {
  it('refuses roster and schedule before Phase 2', async () => {
    const source = createFixtureSource(at('2026-11-17T23:59:59+08:00'))
    await expect(source.getRoster()).rejects.toBeInstanceOf(NotPublishedError)
    await expect(source.getMatches()).rejects.toBeInstanceOf(NotPublishedError)
  })

  it('serves the roster and an unscored schedule in Phase 2', async () => {
    const source = createFixtureSource(at('2026-11-18T00:00:00+08:00'))
    expect((await source.getRoster()).items).toHaveLength(12)
    const { items } = await source.getMatches()
    expect(items.every((m) => m.status === 'scheduled' && !m.official && !m.onCourt)).toBe(true)
  })

  it('adds live status and scores in Phase 3', async () => {
    const source = createFixtureSource(at('2026-11-21T13:00:00+08:00'))
    const { items } = await source.getMatches()
    expect(items.some((m) => m.status === 'completed' && m.official)).toBe(true)
  })
})

describe('unconfigured deployment', () => {
  it('has no data to leak and reports that it is not configured', async () => {
    expect(await unconfiguredSource.getStatus()).toEqual({ phase: null, serverTime: null })
    await expect(unconfiguredSource.getRoster()).rejects.toBeInstanceOf(NotConfiguredError)
    await expect(unconfiguredSource.getMatches()).rejects.toBeInstanceOf(NotConfiguredError)
  })
})

describe('response validation', () => {
  it('keeps only whitelisted team fields, so contact details cannot reach the UI', () => {
    const { items } = parseRoster({
      teams: [
        {
          id: 't1',
          category: 'genderless',
          division: 'novice',
          bracket: 'A',
          slot: 1,
          phone: '0917-000-0000',
          players: [{ id: 'p1', name: 'Sample One', email: 'private@example.com' }],
        },
      ],
    })
    expect(JSON.stringify(items)).not.toMatch(/phone|email|private|0917/)
  })

  it('skips malformed records and counts them instead of failing the whole feed', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = parseRoster({
      teams: [
        { id: 't1', category: 'genderless', division: 'novice', bracket: 'A', slot: 1, players: [{ id: 'p', name: 'Ok Name' }] },
        { id: 't2', category: 'nope', division: 'novice', bracket: 'A', slot: 1, players: [] },
        { id: 't3', category: 'genderless', division: 'novice', bracket: 'D', slot: 1, players: [{ id: 'p', name: 'Bad Bracket' }] },
        null,
      ],
    })
    expect(result.items.map((t) => t.id)).toEqual(['t1'])
    expect(result.skipped).toBe(3)
    warn.mockRestore()
  })

  it('rejects responses with the wrong shape', () => {
    expect(() => parseRoster({})).toThrow(DataSourceError)
    expect(() => parseMatches({ matches: 'x' })).toThrow(DataSourceError)
    expect(() => parseStatus({ phase: 7 })).toThrow(DataSourceError)
    expect(parseStatus({ phase: 2, serverTime: '2026-11-18T00:00:00+08:00' }).phase).toBe(2)
  })

  it('parses matches with and without scores', () => {
    const { items } = parseMatches({
      matches: [
        { id: 'm1', stage: 'preliminary', category: 'genderless', division: 'novice', status: 'scheduled', court: 8, startsAt: '2026-11-21T12:00:00+08:00' },
        { id: 'm2', stage: 'gold', category: 'genderless', division: 'novice', status: 'completed', official: { a: 13, b: 11 } },
      ],
    })
    expect(items[0]).toMatchObject({ id: 'm1', court: 8, official: null })
    expect(items[1]!.official).toEqual({ a: 13, b: 11 })
  })
})

describe('Supabase data source', () => {
  afterEach(() => vi.unstubAllGlobals())

  const respond = (status: number, body: unknown) =>
    vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify(body), { status })))

  const row = {
    id: 'N-R1-C8',
    division: 'novice',
    stage: 'preliminary',
    round: 1,
    court: 8,
    startsAt: '2026-11-21T09:00:00+08:00',
    homeId: 'N1',
    awayId: 'N2',
    status: 'completed',
    onCourt: { a: 8, b: 6 },
    official: { a: 11, b: 6 },
    capReached: true,
  }

  it('reads matches through the public function with only the publishable key', async () => {
    const fetchMock = respond(200, [row, { ...row, id: 'N-SF1', stage: 'semifinal', homeId: null, awayId: null }])
    vi.stubGlobal('fetch', fetchMock)
    const { items } = await createSupabaseSource().getMatches()
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toMatch(/\/rest\/v1\/rpc\/echelon_matches$/)
    expect(init.headers.apikey).toMatch(/^sb_publishable_/)
    expect(init.headers.Authorization).toBeUndefined()
    expect(items[0]).toMatchObject({ teamAId: 'N1', teamBId: 'N2', official: { a: 11, b: 6 }, onCourt: { a: 8, b: 6 } })
    expect(items[1]).toMatchObject({ semifinalIndex: 1, labelA: 'Seed #1', labelB: 'Seed #4', teamAId: null })
  })

  it('serves the published roster from the site', async () => {
    expect((await createSupabaseSource().getRoster()).items).toHaveLength(12)
  })

  it('reports database and network errors with their message', async () => {
    vi.stubGlobal('fetch', respond(400, { message: 'Not an admin' }))
    await expect(createSupabaseSource().getMatches()).rejects.toThrow('Not an admin')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    await expect(createSupabaseSource().getMatches()).rejects.toBeInstanceOf(DataSourceError)
  })
})

describe('demo day follows the clock', () => {
  it('has live matches only inside the running slot and nothing played before the start', async () => {
    const morning = await createFixtureSource(at('2026-11-21T09:30:00+08:00')).getMatches()
    const live = morning.items.filter((m) => m.status === 'live')
    expect(live.map((m) => m.id).sort()).toEqual(['L-R1-C10', 'L-R1-C8', 'L-R1-C9'])
    const early = await createFixtureSource(at('2026-11-21T08:00:00+08:00')).getMatches()
    expect(early.items.some((m) => m.status !== 'scheduled')).toBe(false)
  })
})
