# Echelon Pickleball Cup 2026 — Player Portal

Standalone, mobile-first player portal for the Echelon Pickleball Cup, November 21, 2026, Kingcourts, San Fernando, Pampanga.

## What is in this repository
- `index.html` — the player portal in one file (pages, styles, logos, poster and fonts are embedded).
- `qourtsadmin/index.html` — Match Control, the officials' scoring console. It needs a match-control sign-in.
- `CHANGELOG.md` — what changed in each upload.

Live scores, the queue and standings load from the Qourts Match Control database while a page is open.

## Publish on GitHub Pages
**Settings → Pages → Build and deployment**: choose **Deploy from a branch**, select **main** and **/(root)**, then save.

Player portal: `https://qourts.github.io/EchelonPickleballCup/`
Match Control: `https://qourts.github.io/EchelonPickleballCup/qourtsadmin/`

## Updating
Upload the new files over the old ones (keep the `qourtsadmin` folder) and commit. GitHub Pages republishes in about a minute; phones may keep the old copy for up to 10 minutes, so refresh before checking.

The source code is kept outside this repository; these files are generated from it.
