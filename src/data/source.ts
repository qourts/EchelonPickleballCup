import type { Phase } from '../config/publication.ts'
import type { Match, Team } from '../domain/types.ts'

/**
 * Read-only boundary between the portal and wherever tournament data lives.
 *
 * The production implementation talks to a Qourts Match Control endpoint that only ever
 * returns data its phase has opened (see docs/INTEGRATION.md). Pages depend on this
 * interface and never on a concrete backend.
 */
export interface PortalStatus {
  /** Phase according to the server, including any authorized Qourts override. */
  readonly phase: Phase | null
  readonly serverTime: string | null
}

export interface Loaded<T> {
  readonly items: readonly T[]
  /** Records the source sent that could not be understood and were left out. */
  readonly skipped: number
}

export interface PortalDataSource {
  readonly kind: 'http' | 'fixture' | 'unconfigured'
  getStatus(signal?: AbortSignal): Promise<PortalStatus>
  /** Bracket assignments and rosters (names only). Open from Phase 2. */
  getRoster(signal?: AbortSignal): Promise<Loaded<Team>>
  /** Published schedule. Scores and live status are included from Phase 3. */
  getMatches(signal?: AbortSignal): Promise<Loaded<Match>>
}

/** No data endpoint has been configured for this deployment. */
export class NotConfiguredError extends Error {
  constructor() {
    super('No portal data source is configured.')
    this.name = 'NotConfiguredError'
  }
}

/** The source declined to serve the data because its phase has not opened yet. */
export class NotPublishedError extends Error {
  constructor(what: string) {
    super(`${what} has not been published yet.`)
    this.name = 'NotPublishedError'
  }
}

export class DataSourceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'DataSourceError'
  }
}

export const unconfiguredSource: PortalDataSource = {
  kind: 'unconfigured',
  getStatus: () => Promise.resolve({ phase: null, serverTime: null }),
  getRoster: () => Promise.reject(new NotConfiguredError()),
  getMatches: () => Promise.reject(new NotConfiguredError()),
}
