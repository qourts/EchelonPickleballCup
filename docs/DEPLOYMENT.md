# Deployment

The site is a static Vite build served by GitHub Pages at
**https://qourts.github.io/EchelonPickleballCup/**.

## One-time repository setup

1. Push the code to `qourts/EchelonPickleballCup` on `main`.
2. In the repository go to **Settings > Pages** and set **Source** to **GitHub Actions**.
   (Repository admins only. The workflow cannot enable Pages with the default token.)
3. Optional: **Settings > Secrets and variables > Actions > Variables**, add `PORTAL_API_URL`
   with the base URL of the Qourts portal API. Without it the site deploys as a Player Guide
   with pending states. See [INTEGRATION.md](./INTEGRATION.md).

Every push to `main` runs [`deploy.yml`](../.github/workflows/deploy.yml): install, lint, test,
build (including the `dist` safety check) and publish. It can also be run by hand from the
Actions tab.

## Sub-path behaviour

* `vite.config.ts` sets `base` to `/EchelonPickleballCup/` for builds and `/` for the dev
  server. Every asset URL, including the poster and logos, resolves under that prefix.
* Routing uses the URL hash (`/EchelonPickleballCup/#/guide`). GitHub Pages cannot rewrite
  unknown paths to `index.html`, so path-based routes would 404 on refresh. Hash routes never
  leave `index.html`, so direct links and refreshes always work.

## Local verification

```bash
npm ci
npm run check      # lint, typecheck, tests, production build and dist check
npm run preview    # serves the build at http://localhost:4173/EchelonPickleballCup/
```

Preview the demo data and each publication phase (development server only):

```bash
npm run dev -- --mode demo
# http://localhost:5173/?now=2026-10-25T10:00:00%2B08:00  Phase 1
# http://localhost:5173/?now=2026-11-18T00:00:00%2B08:00  Phase 2
# http://localhost:5173/?now=2026-11-21T00:00:00%2B08:00  Phase 3
```

## After deploying

Open the Pages URL and check: the poster and logos load, `#/guide` loads after a hard refresh,
and `#/brackets` shows the "Opens November 18" notice before that date. A deployment is only
confirmed once the Actions run is green **and** the URL responds.

## Custom domain

If a custom domain is added later, change `PRODUCTION_BASE` in `vite.config.ts` to `/`.
