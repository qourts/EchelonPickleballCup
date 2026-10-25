# Reference portal API

A small, dependency-free implementation of the API in [docs/INTEGRATION.md](../docs/INTEGRATION.md).
It shows exactly what the server has to enforce; it is **not** part of the website build and
is not deployed by the Pages workflow.

What it does, by construction:

* `GET /v1/status` always answers with the phase (Philippine midnight rules, or an override).
* `GET /v1/roster` and `GET /v1/matches` answer **403** before Phase 2.
* Before Phase 3 every match is returned as `scheduled` with no scores.
* Responses are projected through a whitelist, so extra columns (phone, email) can never leave.
* `Cache-Control: no-store`, GET/HEAD/OPTIONS only, CORS limited to `allowedOrigins`.

## Files

| File | Purpose |
| --- | --- |
| `handler.ts` | `createApiHandler({ store, allowedOrigins, phaseOverride?, now? })`, a `Request -> Response` function. Runs on Cloudflare Workers, Deno, Bun or Node |
| `serve.ts` | Local Node runner |
| `handler.test.ts` | Tests for gating, redaction, override and CORS (run by `npm test`) |

## Try it locally

```bash
node reference-api/serve.ts --demo        # synthetic data on http://localhost:8787
curl localhost:8787/v1/status
```

To point the dev site at it: `VITE_PORTAL_API_URL=http://localhost:8787 npm run dev`, then use
`PORTAL_NOW=2026-11-19T10:00:00+08:00` or `PORTAL_PHASE_OVERRIDE=3` when starting the API to
see each phase. (In this mode the site's own `?now=` still only affects the visitor clock; the
server phase wins.)

## Connecting Qourts Match Control

Implement `PublishedStore` (two async functions) over the Match Control data and keep the rest:

```ts
const store: PublishedStore = {
  teams: () => loadTeams(),     // id, category, division, bracket, slot, players[{id, name}]
  matches: () => loadMatches(), // fields listed in docs/INTEGRATION.md, scores in `official`/`onCourt`
}
export default { fetch: createApiHandler({ store, allowedOrigins: ['https://qourts.github.io'] }) }
```

Rules to keep:

1. Query a **published view or export**, never raw registration tables, and never with a role
   that can read contact details.
2. Do not add caching in front of `/v1/roster` or `/v1/matches` that ignores the phase.
3. Set an override only by an authorized Qourts operator (for example an environment variable on
   the deployment), then redeploy or restart.
4. Do not connect this to a live database or production project without explicit authorization
   from the organizers and Qourts.

Then set the repository variable `PORTAL_API_URL` to the deployed base URL and re-run the
Pages workflow.
