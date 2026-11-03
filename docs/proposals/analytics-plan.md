# Player Analytics & Admin Dashboard — Implementation Plan

**Status:** proposed, not implemented.
**Goal:** record every "play" and "save" action (with the game country and party), store the events anonymously, and expose a private admin dashboard with monthly active players, countries, parties, saves, and trends.

---

## 1. Success criteria

1. Starting a game records `campaign_start` with `country`, `party`, `party_list`, `totalPolls`, and `version`.
2. Clicking Save records `save` with the same game identity plus the current `week`.
3. A private dashboard shows, for a selectable range (7 / 30 / 90 / 365 days):
   - monthly active players (distinct anonymous visitors with a play or save);
   - total plays, saves, and countries/parties played;
   - daily play/save trend;
   - top countries, top parties, and country × party combinations;
   - version distribution and (optionally) new vs returning players.
4. No IP addresses, no leader names, no cookies, no cross-site tracking; an analytics opt-out and DNT are honoured.
5. If the Worker is down, unconfigured, or blocked, the game behaves exactly as today.
6. Only authenticated admins can read data or open the dashboard.

## 2. Current constraints

- The app is static on GitHub Pages (`polplay.indigo.spot`), with no backend or database.
- `indigo.spot` is hosted on Cloudflare nameservers (`tosana.ns.cloudflare.com`, `heidi.ns.cloudflare.com`), so a Workers custom domain such as `analytics.polplay.indigo.spot` is straightforward.
- The only existing persistence is manual JSON save export/import (`saveManager.ts`); there is no autosave.
- The app has no test suite; the Worker should get its own tests rather than relying on build success.
- Version is `4.0.0` (`VERSION`); every event should carry it so dashboards can separate releases.

## 3. Recommended architecture

**Frontend (GitHub Pages)** → best-effort `fetch` → **Cloudflare Worker** (`analytics.polplay.indigo.spot`) → **D1** → **protected admin dashboard in the same Worker**.

```text
React app ──POST /v1/events──▶ Worker ──INSERT──▶ D1 (SQLite)
                                   │
GitHub Pages                       └──/admin + /admin/api/stats──▶ Admin browser
                                        (behind Cloudflare Access)
```

Why this stack:

- No new backend host, no server to maintain; Workers and D1 have free tiers suitable for this volume.
- D1 gives SQL aggregates (top countries/parties, unique visitors, date ranges) without a separate analytics vendor.
- Cloudflare Access provides real authentication for the admin dashboard without building auth.
- The domain is already on Cloudflare, so the custom hostname and Access policy are low-friction.

### Alternatives considered

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Worker + D1 + Access** | Full control, custom schema/dashboard, cheap, same DNS | You own migrations, retention, dashboard | **Recommended** |
| Cloudflare Analytics Engine | Very cheap ingestion, SQL API | Event storage/queries less familiar, 90-day retention, still need a dashboard | Good fallback if event volume grows |
| Umami (cloud or self-hosted) | Privacy-friendly, built-in dashboard, custom events | Less control over “country × party” pivots; another service/login | Best “zero-ops” alternative |
| PostHog | Funnels, retention, cohorts out of the box | Heavier script, cookie/consent burden, more than needed | Overkill |
| Google Analytics | Familiar | Cookies/consent, poor custom-property pivots, privacy friction | Avoid for this use case |

## 4. Event taxonomy

Do **not** log leader names. Party names are required for the requested stats; custom party names are user-entered content, so the privacy note must disclose that a party name may be stored.

| Event | When | Required fields |
|---|---|---|
| `campaign_launch` | Main-menu "Launch Campaign in X" click | `country`, `totalPolls` |
| `campaign_start` | Player picks a party (the meaningful "play" event) | `country`, `party`, `party_list`, `totalPolls` |
| `save` | `exportSaveGame` runs ("Save Progress") | `country`, `party`, `week`, `totalPolls` |
| `save_load` | A save file is successfully imported | `country`, `party`, `phase` |
| `term_start` | "Continue Playing" begins a new term | `country`, `party`, `totalPolls` |
| `election_result` (optional) | Results screen | `country`, `party`, winner party, player percentage, player position |
| `session_start` (optional) | App boot, once per tab | none; enables “opened but didn’t play” funnel |

All events also carry:

```json
{
  "v": 1,
  "event": "campaign_start",
  "visitorId": "localStorage UUID",
  "sessionId": "sessionStorage UUID",
  "version": "4.0.0"
}
```

`visitorId` is a random UUID stored in `localStorage`; `sessionId` is a random UUID in `sessionStorage`. Neither is derived from IP, user agent, or fingerprints. Clearing storage creates a new anonymous visitor.

## 5. Data model (D1)

Migration `worker/migrations/0001_init.sql`:

```sql
CREATE TABLE IF NOT EXISTS events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  received_at  INTEGER NOT NULL,
  event        TEXT    NOT NULL,
  visitor_id   TEXT    NOT NULL,
  session_id   TEXT,
  country      TEXT,
  party        TEXT,
  party_list   TEXT,
  week         INTEGER,
  total_polls  INTEGER,
  version      TEXT,
  is_custom    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_events_time          ON events (received_at);
CREATE INDEX IF NOT EXISTS idx_events_event_time    ON events (event, received_at);
CREATE INDEX IF NOT EXISTS idx_events_visitor_time  ON events (visitor_id, received_at);
CREATE INDEX IF NOT EXISTS idx_events_country       ON events (country);
CREATE INDEX IF NOT EXISTS idx_events_party         ON events (party);
```

Deliberately **not** stored: IP address, user agent, leader name, free-text description, referrer, geolocation. `is_custom` is forward-looking; if it is not reliably derivable in the frontend, omit it in v1 rather than guess.

Retention: a daily cron deletes rows older than 365 days (`DELETE FROM events WHERE received_at < unixepoch('now','-365 days')`). At this game's likely volume (thousands of rows per month), raw retention is cheaper and simpler than rollups. If volume grows, add a `daily_rollup` table before increasing retention.

## 6. Worker API

### Routes

| Route | Auth | Purpose |
|---|---|---|
| `POST /v1/events` | public (rate-limited) | Ingest one event |
| `GET /health` | public | `{ ok: true }` |
| `GET /` | Access | Redirect to `/admin` |
| `GET /admin` | Cloudflare Access | Dashboard HTML |
| `GET /admin/api/stats?days=30` | Cloudflare Access | Aggregated JSON |

### Ingestion contract

- Body: one JSON object (optionally `{ events: [...] }` for batching later); reject > 2 KB.
- Validate: known `event`, `visitorId` length 8–64, string caps (`country` 60, `party` 80, `version` 20), numeric `week`/`totalPolls`, JSON parse guarded.
- Stamp `received_at` server-side; never trust client timestamps.
- Responses: `204` success; `400` malformed; `405` wrong method; `413` too large; `429` rate-limited.
- CORS: fixed allowlist from `ALLOWED_ORIGINS` (`https://polplay.indigo.spot`, `http://localhost:5173` for dev). No `*`, no credentials. Handle `OPTIONS` with `Access-Control-Allow-Headers: Content-Type`.
- Rate limiting: Cloudflare WAF rate-limit rule on `POST /v1/events` (e.g. 60/min/IP) plus body-size limit. Do not store IPs.
- Abuse is low-value (fake play counts); no Turnstile in v1.

### Admin auth

- Put Cloudflare Access in front of `/admin*` (one-time PIN or Google, allowlist the owner's email). Access is free for a small team.
- Optionally verify `Cf-Access-Jwt-Assertion` in the Worker with `jose`/WebCrypto as defense in depth; at minimum ensure the route is only reachable via Access in production.
- Local development: `wrangler dev` with `ENVIRONMENT=dev` and a `DEV_ADMIN_TOKEN`; never enable the bypass in production.
- Dashboard responses: `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, restrictive CSP, no external secrets.

## 7. Dashboard

Serve a single server-rendered HTML page (with inline CSS and a pinned Chart.js from a CDN, or inline SVG charts to avoid a third-party script) plus one JSON stats endpoint. No build step; no extra frontend framework.

Sections:

1. **Summary cards** — active players (30d), plays, saves, distinct countries, distinct parties, new players.
2. **Daily trend** — plays, saves, and active players per day.
3. **Top countries** — table with distinct players and plays.
4. **Top parties** — table with distinct players and plays, filterable by country.
5. **Country × party** — top 20 combinations.
6. **Versions** — event counts by `version`.
7. **Optional** — funnel (launch → start → save), new vs returning, recent saves table (without visitor IDs).

### Metric definitions

- **Active player (last 30 days):** distinct `visitor_id` with `campaign_start` or `save` in the trailing 30 days.
- **Plays:** count of `campaign_start`.
- **Saves:** count of `save`.
- **New player:** first event for that `visitor_id` falls inside the selected window.
- **Top country/party:** rank by distinct players first, plays second.
- **Retention (optional):** D7/D30: players with a `campaign_start` in an earlier week who return with any play/save later.

### Representative SQL

```sql
-- summary
SELECT
  COUNT(DISTINCT visitor_id) FILTER (WHERE event IN ('campaign_start','save')) AS active_players,
  COUNT(*) FILTER (WHERE event = 'campaign_start') AS plays,
  COUNT(*) FILTER (WHERE event = 'save')           AS saves
FROM events
WHERE received_at >= unixepoch('now') - :days * 86400;

-- daily
SELECT date(received_at, 'unixepoch') AS day,
       COUNT(DISTINCT visitor_id) FILTER (WHERE event IN ('campaign_start','save')) AS active,
       COUNT(*) FILTER (WHERE event = 'campaign_start') AS plays,
       COUNT(*) FILTER (WHERE event = 'save') AS saves
FROM events
WHERE received_at >= unixepoch('now') - :days * 86400
GROUP BY day ORDER BY day;
```

Use parameterized statements; cap `days` to 1–365; reject unknown params.

## 8. Frontend integration

### New module: `src/lib/analytics.ts`

- Reads `import.meta.env.VITE_ANALYTICS_URL`; if unset or empty → every function is a no-op.
- Creates/reads `pp.visitor_id` (localStorage) and `pp.session_id` (sessionStorage).
- Honours `navigator.doNotTrack === '1'` and `localStorage['pp.analytics.disabled'] === '1'`.
- `track(event, props)` sends a single JSON `fetch` with `keepalive: true`; failures are swallowed; no retries that block the UI. Optionally use `navigator.sendBeacon` for final/unload events.
- Adds `VERSION` and payload `v: 1`.
- Dev logging only in `import.meta.env.DEV`.
- Optional `setAnalyticsEnabled(boolean)` for a UI opt-out.

### Hook points

| File | Event |
|---|---|
| `src/components/MainMenu.tsx` — `handleCountrySelect` | `campaign_launch` (`country`, `totalPolls`) |
| `src/components/PlayerSelection.tsx` — `handlePlayerSelect` | `campaign_start` (`country`, `party`, `party_list`, `totalPolls`) |
| `src/lib/saveManager.ts` — `exportSaveGame` | `save` (`country`, `party`, `week`, `totalPolls`) |
| `src/lib/saveManager.ts` — successful `importSaveGame` | `save_load` |
| `src/components/ResultsView.tsx` — "Continue Playing" | `term_start` |
| `src/components/CampaignView.tsx` — optional | `resume` after a mid-campaign coalition |
| `src/components/ResultsView.tsx` — optional | `election_result` |

Rules:

- Track in event handlers, **not** in `gameReducer`/effects: React StrictMode double-invokes reducers and effects, which would double-count.
- Never await analytics before navigation or state updates.
- If the endpoint is absent, misconfigured, blocked by an ad-blocker, or offline, the game continues with no visible error.
- Do not send leader names, save file contents, or raw state.

### Configuration

- Local: `.env.local` `VITE_ANALYTICS_URL=http://localhost:8787/v1/events` (or leave empty).
- GitHub Actions: repository variable `VITE_ANALYTICS_URL=https://analytics.polplay.indigo.spot/v1/events`; pass it to the build step:
  ```yaml
  env:
    VITE_ANALYTICS_URL: ${{ vars.VITE_ANALYTICS_URL }}
  ```
- The URL is public (it is shipped in the bundle); no secret is used.

## 9. Deployment and operations

### Cloudflare setup (one-time)

1. Create a D1 database: `npx wrangler d1 create polplay-analytics`.
2. Apply migrations locally and remotely.
3. Deploy the Worker.
4. Attach `analytics.polplay.indigo.spot` as a Workers custom domain (zone `indigo.spot` is already on Cloudflare).
5. Create a Cloudflare Access application for `analytics.polplay.indigo.spot/admin*` (allowlist owner email).
6. Set the GitHub repository variable `VITE_ANALYTICS_URL` and redeploy the site.
7. Add a Cloudflare rate-limiting rule for `POST /v1/events`.

### Worker project layout

```text
worker/
├── package.json          # own deps: wrangler, jose (if verifying Access JWT)
├── wrangler.toml
├── tsconfig.json
├── migrations/0001_init.sql
├── src/index.ts          # routes, CORS, auth, validation
├── src/db.ts             # D1 queries
├── src/validate.ts
├── src/dashboard.ts      # HTML template (or dashboard.html)
└── test/                 # payload/CORS/auth/query tests
```

`wrangler.toml` essentials:

```toml
name = "polplay-analytics"
main = "src/index.ts"
compatibility_date = "2026-01-01"

[[d1_databases]]
binding = "DB"
database_name = "polplay-analytics"
database_id = "<from wrangler d1 create>"

[vars]
ALLOWED_ORIGINS = "https://polplay.indigo.spot,http://localhost:5173"
ENVIRONMENT = "production"

[triggers]
crons = ["15 3 * * *"]
```

### CI

- Frontend: existing `deploy.yml` gains the `VITE_ANALYTICS_URL` build env (no new job required).
- Worker: separate workflow on `worker/**` changes (or manual `workflow_dispatch`) using `cloudflare/wrangler-action`, with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets. Do not couple Worker deploys to every frontend push.
- Do not put the Cloudflare token in the frontend build.

### Backups/monitoring

- Monthly `wrangler d1 export polplay-analytics --remote --output backup.sql` (manual or scheduled).
- Monitor Worker error rate and D1 writes/reads; set Cloudflare notifications.
- Log only server errors; do not log request bodies/IPs.

## 10. Privacy, security, legal

- **Data minimisation:** no IP, no user agent, no leader name, no save file, no precise location. `visitorId` is a random local UUID; clearing site data resets it.
- **Consent/opt-out:** honour DNT; provide `pp.analytics.disabled` and a small "Privacy" note/link in the footer explaining anonymous play/save analytics. If EU/UK consent rules apply, add an explicit opt-in choice or disable analytics by default for those regions; confirm with legal advice.
- **Custom party names:** these are user-entered and could contain personal data; disclose that party names are stored for aggregate statistics, or omit custom names in v1 (flag them as `custom` only). The current plan stores the party name because that is the requested stat.
- **Retention:** 365 days raw events; document it.
- **Access control:** dashboard and all stats endpoints behind Cloudflare Access; no public aggregate endpoint.
- **Abuse:** CORS allowlist, payload caps, rate limiting, allowlisted event names, parameterized SQL.
- **Headers:** `Content-Security-Policy` for the dashboard, `X-Content-Type-Options`, `Referrer-Policy: no-referrer`, `Cache-Control: no-store`.

## 11. Testing and acceptance

### Worker tests (local, `vitest` + `@cloudflare/vitest-pool-workers` or `wrangler dev` + curl)

- Accepts valid events; rejects malformed JSON, unknown events, oversized bodies, invalid IDs.
- CORS: allowed origin accepted, other origins rejected, `OPTIONS` works.
- Admin: unauthenticated request denied (Access or dev-token behaviour), authenticated stats return expected aggregates.
- SQL: top countries/parties, unique visitors, day boundaries, `days` cap.
- Retention cron deletes only old rows.
- No IP/leader columns exist.

### Frontend checks

- With `VITE_ANALYTICS_URL` empty: no network requests.
- Clicking Launch → `campaign_launch`; choosing a party → `campaign_start`; Save → `save`; Load → `save_load`.
- StrictMode: one event per user action, not two.
- DNT/opt-out: no requests.
- Worker offline/blocked: no console errors, no UI failure.
- Network payload contains no leader name or save contents.

### Dashboard checks

- Access blocks unauthenticated browsers.
- Summary/trend/top tables match direct SQL with seeded fixtures.
- Empty database shows zeros, not errors.
- Range switch (7/30/90/365) works; timestamps are labelled UTC.

### Acceptance criteria

1. The first production play produces a `campaign_start` row containing `country` and `party`.
2. A save produces a `save` row for the same country/party/week.
3. The dashboard reports active players for the last 30 days and the most-played countries/parties.
4. No unauthenticated access to data; no PII/IP/leader stored; opt-out works.
5. Analytics failures never affect gameplay.

## 12. Rollout phases and rough effort

| Phase | Work | Effort |
|---|---|---|
| A | Confirm Cloudflare account/zone, D1, Access, privacy decision | 0.5 day |
| B | Worker ingest + schema + CORS/validation + local tests | 0.5–1 day |
| C | `src/lib/analytics.ts` + play/save/load hooks + env/CI | 0.5 day |
| D | Dashboard + SQL aggregates + Access | 1–1.5 days |
| E | Custom domain, rate limit, retention cron, backups, monitoring | 0.5 day |
| F | End-to-end validation, docs (`docs/analytics.md`), release | 0.5 day |

Total: roughly 3.5–5 days of focused work. Ship B+C first (data collection), then D+E.

## 13. Open decisions

1. **Retention:** 365 days raw, or shorter (90 / 180)?
2. **Custom party names:** store them (needed for the stat) or only flag `custom`? Privacy trade-off.
3. **Consent:** DNT + opt-out only, or an explicit consent banner for EU/UK?
4. **Dashboard auth:** Cloudflare Access (recommended) versus a custom admin token/cookie.
5. **Optional events:** session start, election results, coalition outcomes, funnel/retention — all cheap once ingestion exists.
6. **Provider:** confirm Worker + D1, or choose Umami/PostHog if zero-ops is preferred.

## 14. Out of scope (for the first version)

- Server-side save storage/accounts.
- Per-user accounts, leaderboards, or cross-device identity.
- Real-time dashboards/websockets.
- A/B testing or feature flags.
- Monetisation or ad analytics.
