# Match Control backend (Supabase)

Scores live in the Supabase project **Qourts Match Control – Staging**
(`https://donhaqhhrkzbiwawwvqe.supabase.co`). The website talks to it with the publishable key
only, configured in [`src/config/backend.ts`](../src/config/backend.ts).

## One-time setup

1. Open the project's **SQL Editor**, paste [`supabase/echelon_cup.sql`](../supabase/echelon_cup.sql)
   and run it. It creates a private schema `echelon_cup` (not exposed through the API) with the
   38 scheduled matches, an audit log and four functions. It touches no existing table.
2. Create each official under **Authentication → Users** (email and password).
3. Make them admins by running, in the SQL Editor, one line per person:
   `insert into echelon_cup.admins (email) values ('official@example.com');` (lowercase email).
4. Officials sign in at `https://qourts.github.io/EchelonPickleballCup/#/admin`.

Rollback: `drop schema echelon_cup cascade;` and drop the four `public.echelon_*` functions.

## Functions

| Function | Who | Does |
| --- | --- | --- |
| `echelon_matches()` | everyone | Schedule and results as JSON (the public pages read this) |
| `echelon_is_admin()` | signed in | Whether the account is a Match Control admin |
| `echelon_save_score(p_match, p_status, p_home, p_away, p_cap)` | admins | Live score, final score or reset to scheduled |
| `echelon_set_teams(p_match, p_home, p_away)` | admins | Assign pairs to a semifinal, Bronze or Gold match |

`echelon_save_score` enforces the scoring rules: preliminaries and semifinals are first to 11
with no deuce, and at the 15-minute cap the leader's official score becomes 11 (the on-court
score is kept separately); Gold and Bronze are first to 11, win by two, no cap. Every change is
written to `echelon_cup.score_log` with the admin's email.

## What the website computes

Standings (win rate, PE, PC, head-to-head), the top-four seeds and the semifinal pairings are
computed in [`src/domain`](../src/domain) from the published scores. In the admin screen,
**Use results** fills a semifinal from the standings, and Gold and Bronze from the semifinal
results; an admin still confirms with **Save teams**.

## Keep in step

Match ids, courts and times exist twice: in [`src/config/schedule.ts`](../src/config/schedule.ts)
and in the SQL seed. A test (`src/data/data.test.ts`) fails if they differ.

## Development

`npm run dev -- --mode demo` uses synthetic data instead of Supabase. Add `?now=<ISO instant>`
to preview a time of day, e.g. `http://localhost:5173/?now=2026-11-21T11:40:00%2B08:00#/live`.
