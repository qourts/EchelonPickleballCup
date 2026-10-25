# Rules as implemented

Where each confirmed rule lives in code and how it is tested. Confirmed rules come from the
tournament brief; anything not in the brief is deliberately **not** implemented.

| Rule | Code | Tests |
| --- | --- | --- |
| 4 categories, 3 divisions; Novice 3, Low Int. 4, High Int. 3 brackets of 4 teams (40 brackets, 160 team positions planned) | [`config/event.ts`](../src/config/event.ts) | `data.test.ts` |
| Single round robin: 6 matches, 3 per team, wave order 1v2, 3v4, 1v3, 2v4, 1v4, 3v2 | [`config/rules.ts`](../src/config/rules.ts), [`domain/roundRobin.ts`](../src/domain/roundRobin.ts) | `roundRobin.test.ts` |
| Preliminaries and semifinals: first to 11, no deuce, 15-minute cap; leader's official score becomes 11 (8-6 -> 11-6); tie plays on to a one-point lead (7-7 -> 8-7 -> 11-7) | [`domain/scoring.ts`](../src/domain/scoring.ts) | `scoring.test.ts` |
| On-court scores kept apart from official adjusted scores | `Match.onCourt` / `Match.official` | `scoring.test.ts` |
| Gold and Bronze: first to 11, deuce, win by two, no time cap (never normalized) | `isValidMedalScore`, `resolveOfficialScore` | `scoring.test.ts` |
| Bracket ranking: win rate, highest PE, lowest PC, from official scores; two-team tie by head-to-head | [`domain/standings.ts`](../src/domain/standings.ts) | `standings.test.ts` |
| Novice/High Int.: 3 bracket winners seeded #1-#3 plus a wildcard (best second place, compared only against other second places) as Seed #4 | [`domain/qualification.ts`](../src/domain/qualification.ts) | `qualification.test.ts` |
| Semifinals #1v#4, #2v#3; if Seed #1 and the wildcard share a bracket, #1v#3 and #2v#4 | `qualifyDivision` | `qualification.test.ts` |
| Low Int.: 4 bracket winners seeded #1-#4, no wildcard | `qualifyDivision` | `qualification.test.ts` |
| Cross-bracket ties: 2 teams one race-to-6 match; 3 teams mini round robin ranked by wins, tiebreaker PE, lowest tiebreaker PC; remaining tie needs more deciders; tiebreaker stats never change preliminary stats | [`domain/tiebreakers.ts`](../src/domain/tiebreakers.ts) | `qualification.test.ts`, `standings.test.ts` |
| Phases at Philippine midnight: Nov 18 (brackets, player search), Nov 21 (standings, playoffs) | [`config/publication.ts`](../src/config/publication.ts), [`domain/publication.ts`](../src/domain/publication.ts) | `publication.test.ts`, `App.test.tsx` |
| Player search: partial, case-insensitive, accent-insensitive, duplicates kept apart | [`domain/search.ts`](../src/domain/search.ts) | `search.test.ts` |
| Schedule blocks, 20-minute waves, tabulation, semifinal and medal windows, courts | [`config/schedule.ts`](../src/config/schedule.ts) | `data.test.ts` (fixtures use it) |

## Pending, never improvised

* Ties of **four or more teams** (across brackets) report `organizer-decision`.
* A tie of **three or more teams inside one bracket** after win rate, PE and PC has no stated
  procedure. Rows share a rank and show "Tied, not yet resolved"; the division's semifinal
  field waits for an organizer decision. The portal never falls back to names, ids or chance.
* When a 3-team mini round robin is still level, the portal reports that additional race-to-6
  deciders are needed; their format has not been specified.
* Skill-rating thresholds, check-in, forfeits, attendance and conduct rules are not stated
  anywhere on the site except as "not yet announced".

## Interpretation notes

* Seeding ties among bracket winners are resolved on every position, because every seed
  decides a pairing. Wildcard ties are resolved only for the top place, since only the best
  second-place team qualifies.
* A division's qualification is computed only after **every** bracket in it has all six
  results.
* Semifinal and medal courts come from the "Proposed schedule" sheet of the supplied matrix:
  High Intermediate courts 3 and 4, Low Intermediate courts 5 and 6, Novice courts 7 and 8.

## Differences found in the supplied materials

* The matrix and the proposal list the category order Genderless, Women's, Mixed, Men's. This
  site follows the brief: Genderless, Men's, Mixed, Women's.
* The proposal says High Intermediate has four brackets and Low Intermediate three. This site
  follows the brief and the matrix court layout: Low Intermediate has four.
* The poster says "8:00 PM" and "Kings Court"; the brief says 9:00 PM and Kingcourts. The
  poster is shown unchanged with a caption.
