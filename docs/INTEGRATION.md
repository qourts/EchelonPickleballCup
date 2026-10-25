# Qourts Match Control integration

The portal is a **public, read-only** website. It never writes data and it never holds
unreleased data. Everything tournament-specific comes through one interface,
`PortalDataSource` ([`src/data/source.ts`](../src/data/source.ts)).

| Implementation | When it is used |
| --- | --- |
| `createHttpSource(url)` ([`httpSource.ts`](../src/data/httpSource.ts)) | `VITE_PORTAL_API_URL` is set at build time |
| `unconfiguredSource` | Nothing is set. The site is a Player Guide and shows pending states |
| `createFixtureSource` ([`src/fixtures`](../src/fixtures)) | Development server only, `npm run dev -- --mode demo`. Never in a build |

## Why a server is required for staged release

GitHub Pages serves static files, and every file in `dist/` is public the moment it is
deployed. A roster or bracket JSON file hidden by a client-side date check would still be
downloadable by anyone, so the site must never contain it. Phase 2 and Phase 3 data therefore
lives behind an API that **checks the phase on the server** and refuses early requests.

The build includes a guard, [`scripts/check-dist.mjs`](../scripts/check-dist.mjs), that fails
if demo fixtures or data-like files (roster, players, teams, brackets, registrations) end up in
`dist/`.

## API contract

All endpoints are `GET`, return JSON, and are called with `cache: 'no-store'` and no
credentials. Send `Cache-Control: no-store` and enable CORS for the Pages origin
(`https://qourts.github.io`).

| Endpoint | Open from | Notes |
| --- | --- | --- |
| `/v1/status` | always | `{ "phase": 1 \| 2 \| 3, "serverTime": "<ISO>" }` |
| `/v1/roster` | Phase 2 | Bracket assignments and player names |
| `/v1/matches` | Phase 2 | Schedule. **Scores and `live`/`completed` status only from Phase 3** |

Before a phase opens the API must answer **403 or 404** for its data. The portal treats both
as "not published yet" and keeps polling.

`phase` in `/v1/status` is authoritative. It is where an authorized Qourts override lives: to
open a phase early or hold one back, change what the server reports. The portal prefers the
server phase over the visitor's clock and falls back to the clock only if `/v1/status` cannot
be reached. Phase boundaries by the published schedule are 2026-11-18T00:00:00+08:00 and
2026-11-21T00:00:00+08:00, and are configured in
[`src/config/publication.ts`](../src/config/publication.ts). The pure function `phaseAt` in
[`src/domain/publication.ts`](../src/domain/publication.ts) can be reused by the server.

### `/v1/roster`

```json
{
  "teams": [
    {
      "id": "genderless-N-A1",
      "category": "genderless",
      "division": "novice",
      "bracket": "A",
      "slot": 1,
      "players": [
        { "id": "p-1", "name": "First Last" },
        { "id": "p-2", "name": "First Last" }
      ]
    }
  ]
}
```

* `category`: `genderless | mens | mixed | womens`
* `division`: `novice | low-intermediate | high-intermediate`
* `bracket`: `A`-`C` (Novice, High Intermediate) or `A`-`D` (Low Intermediate)
* `slot`: 1-4, the team's number in its bracket (this drives the match order)
* **Names only.** The portal copies just the fields above; any extra field (phone, email) is
  dropped by [`validate.ts`](../src/data/validate.ts), but do not send them in the first place.

### `/v1/matches`

```json
{
  "matches": [
    {
      "id": "genderless-N-A-r1",
      "stage": "preliminary",
      "category": "genderless",
      "division": "novice",
      "bracket": "A",
      "round": 1,
      "court": 8,
      "startsAt": "2026-11-21T09:00:00+08:00",
      "teamAId": "genderless-N-A1",
      "teamBId": "genderless-N-A2",
      "status": "completed",
      "onCourt": { "a": 8, "b": 6 },
      "capReached": true,
      "official": { "a": 11, "b": 6 }
    }
  ]
}
```

* `stage`: `preliminary | semifinal | gold | bronze | tiebreaker`
* `status`: `scheduled | live | completed`
* `official` is the score that counts. Time-capped preliminaries and semifinals send the
  **adjusted** score (8-6 becomes 11-6). If `official` is omitted for a completed match, the
  portal derives it from `onCourt` and `capReached`. `onCourt` is kept for display.
* Semifinals, Gold and Bronze may be published before teams are known: send
  `teamAId/teamBId: null` with `labelA/labelB` (for example `"Seed #1"`), and fill the teams in
  when Match Control assigns them. Semifinals carry `semifinalIndex` (1 or 2).
* Tiebreaker matches use `stage: "tiebreaker"` and `tiebreakerKey`: `seeding` (ordering bracket
  winners) or `wildcard` (choosing the best second place). They are first to 6 and never alter
  preliminary Win Rate, PE or PC.
* Unreadable records are skipped and counted; the site shows a notice when that happens.

A working reference implementation of this contract, with tests, is in
[`reference-api/`](../reference-api/README.md).

## What the portal computes itself

Standings, wildcard selection, seeding, semifinal pairings (including the same-bracket
exception) and tiebreaker requirements are derived in
[`src/domain`](../src/domain) from published matches. This keeps one set of rules on the
public site without copying the Qourts competition engine. If Match Control later publishes
authoritative standings, add a field to the contract and prefer it in `buildTournamentView`.

## Moving data in

Qourts owns the backend. A minimal route set is a function or service that reads the Match
Control tables, applies the phase check above and returns the two payload shapes. Do not
point this repository at a production Supabase project, or any live database, without explicit
authorization from the organizers and Qourts.

## Environment

| Variable | Where | Purpose |
| --- | --- | --- |
| `VITE_PORTAL_API_URL` | build time (GitHub Actions variable `PORTAL_API_URL`) | Base URL of the API above |
| `VITE_PORTAL_SOURCE=fixture` | `.env.demo`, dev server only | Synthetic demo data |

In the dev server, `?now=<ISO instant>` previews a phase, for example
`http://localhost:5173/?now=2026-11-21T10:00:00%2B08:00`. That override is compiled out of
production builds.
