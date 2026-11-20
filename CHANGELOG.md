# Changelog

## 2026-11-21 — single-file release
- The portal now ships as one `index.html`, and Match Control as `qourtsadmin/index.html`, published straight from the main branch (no build step on GitHub).
- Old `#/admin` links forward to `qourtsadmin/`.

## 2026-11-20 — player portal for tournament day
- Bottom navigation: Home, My Team, Live, Schedule, Standings.
- My Team: search by team or player, team directory, and each team's matches and standing.
- Live: three courts, the queue beside them on wide screens, semifinal race.
- Schedule: Round robin 9:00 AM, Semifinals 1:20 PM, Medal matches 2:20 PM, Awarding 3:10 PM.
- Standings: All / Novice / Low Int. selector.
- Match Control: courts, live scoring, confirm, forfeit, corrections and activity log on Supabase.
