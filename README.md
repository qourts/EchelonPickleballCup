# Echelon Pickleball Cup 2026: Player Guide and Player Portal

Public, read-only, mobile-first website for the Echelon Pickleball Cup 2026
(Saturday, November 21, 2026 at Kingcourts, San Fernando, Pampanga). It is a Player Guide
before the event and a tournament companion on the day.

> All net proceeds from the Echelon Pickleball Cup 2026 will benefit the Echelon Eagles Medical Mission.

Live site (once Pages is enabled): https://qourts.github.io/EchelonPickleballCup/
Registration is handled on the organizer's existing form, not on this site.

## What is on the site

| Section | Opens (Philippine time) | Contents |
| --- | --- | --- |
| Home, Player Guide, Schedule | always | Event facts, rules, scoring and the 15-minute rule (with a live converter), standings and seeding explained, FAQ, category blocks, courts |
| Brackets and player search | Nov 18, 2026, 12:00 AM | Bracket assignments, partial/case-insensitive name search, published match times |
| Standings and Playoffs | Nov 21, 2026, 12:00 AM | Bracket standings, wildcard and seeds, semifinal pairings, Gold/Bronze, medal results, live refresh |

Without a data feed the site is a complete Player Guide and shows honest pending states. It
never displays sample data as if it were real.

## Quick start

```bash
npm ci
npm run dev                  # http://localhost:5173/
npm run dev -- --mode demo   # same, with synthetic demo data (dev only)
npm run check                # lint + typecheck + tests + production build + dist check
```

Preview a phase in the dev server with `?now=`, for example
`http://localhost:5173/?now=2026-11-18T00:00:00%2B08:00#/brackets`.

Requires Node 20.19+ or 22.12+ (CI uses Node 22).

## Scripts

| Script | Does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck, production build to `dist/`, then `scripts/check-dist.mjs` |
| `npm run preview` | Serve the build at `/EchelonPickleballCup/` |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc -b` |
| `npm test` | Vitest |

## Architecture

```
src/
  config/     event facts, scoring constants, schedule, publication dates (edit here)
  domain/     pure competition logic: scoring, round robin, standings, tiebreakers,
              qualification, search, phases, tournament view  (fully unit tested)
  data/       PortalDataSource interface, HTTP source, response validation
  fixtures/   SYNTHETIC demo data, dev server and tests only
  hooks/      PortalProvider (phase clock, server status, polling) and hooks
  components/ shared UI;  pages/ route pages;  styles/ plain CSS with design tokens
docs/         INTEGRATION.md, DEPLOYMENT.md, RULES.md
```

Stack: React 19, TypeScript, Vite, React Router (hash routing), Vitest. No backend, no UI
framework, one self-hosted display font (Barlow Condensed).

## Publication phases and data safety

* Phases switch at Philippine midnight (`+08:00` instants in
  [`src/config/publication.ts`](src/config/publication.ts)). Nav items appear when their phase
  opens and direct links show an "Opens ..." notice before then.
* Hiding things in the browser is not security. **Unreleased roster and bracket data is never
  in this repository or in `dist/`.** Phase 2 and 3 data comes from a Qourts-controlled API that
  refuses early requests; the site only asks once the phase is open. A build guard fails if
  fixtures or data-like files reach `dist/`. Authorized overrides are made by changing the phase
  that the API reports. See [docs/INTEGRATION.md](docs/INTEGRATION.md).
* Player data is names only; any other field a source sends is dropped.

## Rules

Implemented rules and their tests are listed in [docs/RULES.md](docs/RULES.md), including the
cases deliberately left pending an organizer decision (ties of four or more teams; unspecified
in-bracket three-way ties).

## Deployment

GitHub Actions publishes to GitHub Pages on every push to `main`. One-time setup and
verification steps are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Open items

* Qourts must provide the portal API described in [docs/INTEGRATION.md](docs/INTEGRATION.md)
  before bracket assignments, search, standings and playoffs can show real data.
* The registration URL was decoded from the poster QR code and has not been tested live.
* Skill-rating thresholds, check-in, forfeit, attendance and conduct rules are unannounced and
  are shown as such.
* The poster still carries older text (8:00 PM, "Kings Court"); it is shown unchanged.
