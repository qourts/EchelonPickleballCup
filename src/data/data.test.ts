import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildDemoMatches, buildDemoTeams } from '../fixtures/demoTournament.ts'
import { createFixtureSource } from '../fixtures/fixtureSource.ts'
import { createHttpSource } from './httpSource.ts'
import { DataSourceError, NotConfiguredError, NotPublishedError, unconfiguredSource } from './source.ts'
import { parseMatches, parseRoster, parseStatus } from './validate.ts'

const at = (iso: string) => () => new Date(iso)

describe('demo tournament structure', () => {
  const teams = buildDemoTeams()
  const matches = buildDemoMatches(teams)

  it('fills 40 brackets of four teams (160 teams) across four categories', () => {
    expect(teams).toHaveLength(160)
    const brackets = new Set(teams.map((t) => `${t.category}/${t.division}/${t.bracket}`))
    expect(brackets.size).toBe(40)
    for (const category of ['genderless', 'mens', 'mixed', 'womens']) {
      expect([...brackets].filter((b) => b.startsWith(category))).toHaveLength(10)
    }
  })

  it('schedules six distinct preliminary matches per bracket and three per team', () => {
    const prelims = matches.filter((m) => m.stage === 'preliminary')
    expect(prelims).toHaveLength(240)
    const perTeam = new Map<string, number>()
    for (const m of prelims) {
      perTeam.set(m.teamAId!, (perTeam.get(m.teamAId!) ?? 0) + 1)
      perTeam.set(m.teamBId!, (perTeam.get(m.teamBId!) ?? 0) + 1)
    }
    expect([...perTeam.values()].every((n) => n === 3)).toBe(true)
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
    expect((await source.getRoster()).items).toHaveLength(160)
    const { items } = await source.getMatches()
    expect(items.every((m) => m.status === 'scheduled' && !m.official && !m.onCourt)).toBe(true)
  })

  it('adds live status and scores in Phase 3', async () => {
    const source = createFixtureSource(at('2026-11-21T00:00:00+08:00'))
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
          category: 'mixed',
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
        { id: 't1', category: 'mixed', division: 'novice', bracket: 'A', slot: 1, players: [{ id: 'p', name: 'Ok Name' }] },
        { id: 't2', category: 'nope', division: 'novice', bracket: 'A', slot: 1, players: [] },
        { id: 't3', category: 'mixed', division: 'novice', bracket: 'D', slot: 1, players: [{ id: 'p', name: 'Bad Bracket' }] },
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
        { id: 'm1', stage: 'preliminary', category: 'mens', division: 'novice', status: 'scheduled', court: 8, startsAt: '2026-11-21T12:00:00+08:00' },
        { id: 'm2', stage: 'gold', category: 'mens', division: 'novice', status: 'completed', official: { a: 13, b: 11 } },
      ],
    })
    expect(items[0]).toMatchObject({ id: 'm1', court: 8, official: null })
    expect(items[1]!.official).toEqual({ a: 13, b: 11 })
  })
})

describe('http data source', () => {
  afterEach(() => vi.unstubAllGlobals())

  const respond = (status: number, body: unknown = {}) =>
    vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify(body), { status })))

  it('requests uncached, credential-free JSON from the configured base', async () => {
    const fetchMock = respond(200, { teams: [] })
    vi.stubGlobal('fetch', fetchMock)
    await createHttpSource('https://api.example.test/').getRoster()
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://api.example.test/v1/roster')
    expect(init).toMatchObject({ cache: 'no-store', credentials: 'omit', method: 'GET' })
  })

  it('treats 403 and 404 as "not published yet"', async () => {
    vi.stubGlobal('fetch', respond(403))
    await expect(createHttpSource('https://api.example.test').getRoster()).rejects.toBeInstanceOf(NotPublishedError)
    vi.stubGlobal('fetch', respond(404))
    await expect(createHttpSource('https://api.example.test').getMatches()).rejects.toBeInstanceOf(NotPublishedError)
  })

  it('reports server and network failures as data source errors', async () => {
    vi.stubGlobal('fetch', respond(500))
    await expect(createHttpSource('https://api.example.test').getMatches()).rejects.toBeInstanceOf(DataSourceError)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    await expect(createHttpSource('https://api.example.test').getStatus()).rejects.toBeInstanceOf(DataSourceError)
  })
})

describe('portal API url validation', () => {
  it('accepts https and localhost http only, without credentials or query', async () => {
    const { validApiUrl } = await import('./index.ts')
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(validApiUrl('https://api.example.test/base/')).toBe('https://api.example.test/base')
    expect(validApiUrl('http://localhost:8787')).toBe('http://localhost:8787')
    expect(validApiUrl('http://api.example.test')).toBeNull()
    expect(validApiUrl('https://u:p@api.example.test')).toBeNull()
    expect(validApiUrl('https://api.example.test?x=1')).toBeNull()
    expect(validApiUrl('nonsense')).toBeNull()
    expect(validApiUrl(undefined)).toBeNull()
    error.mockRestore()
  })
})
