# Cloudflare analytics worker

Privacy-preserving player analytics and an admin dashboard for
<https://polplay.indigo.spot>. The Worker accepts a small allowlist of gameplay
events, stores them in D1, and serves an aggregate dashboard behind Cloudflare
Access. It is deliberately not a general event pipeline.

## What it stores

One row per accepted event:

| Column | Example | Notes |
|--------|---------|-------|
| `received_at` | `1760000000` | Server time, Unix seconds |
| `event` | `campaign_start` | Allowlisted name |
| `visitor_id` | `9f1c…` | Random UUID in `localStorage` |
| `session_id` | `5b2e…` | Random ID in `sessionStorage` |
| `country` | `United Kingdom` | Game data |
| `party` | `Labour` | Game data |
| `party_list` | `UK` | Game data |
| `week` / `total_polls` | `17` / `52` | Progress |
| `version` | `4.1.0` | Frontend version |
| `custom_party` | `0` | Whether the player created a party |

It does **not** store IP addresses, user agents, names, save files, or a full
game state. The frontend honours `navigator.doNotTrack` and a local opt-out
flag, and the browser sends nothing when `VITE_ANALYTICS_URL` is unset.

## Prerequisites

- Node.js 20+
- A Cloudflare account with the `indigo.spot` zone active
- `wrangler` (installed below)

## 1. Install and authenticate

From this directory:

```bash
npm install
npx wrangler login
```

`wrangler login` opens a browser and stores an OAuth session locally. Do not
paste an API token into chat or commit it. If you cannot use OAuth, create a
scoped API token (see [API token](#api-token)) and `export
CLOUDFLARE_API_TOKEN=...` in your shell instead.

## 2. Create and migrate the database

```bash
npx wrangler d1 create polplay-analytics
```

Copy the printed `database_id` into `wrangler.toml`, replacing
`REPLACE_WITH_D1_DATABASE_ID`, then:

```bash
npm run db:migrate
```

For a local-only database, use `npm run db:migrate:local`; `wrangler dev`
creates its own SQLite file under `.wrangler/`.

## 3. Local development

```bash
cp .dev.vars.example .dev.vars
# Edit ADMIN_TOKEN in .dev.vars to a long random value
npx wrangler dev
```

Open <http://localhost:8787/admin?token=YOUR_TOKEN> and send a test event:

```bash
curl -i http://localhost:8787/v1/events \
  -H 'Content-Type: application/json' \
  -H 'Origin: http://localhost:5173' \
  -d '{"event":"campaign_launch","visitorId":"11111111-1111-4111-8111-111111111111","sessionId":"22222222-2222-4222-8222-222222222222","country":"United Kingdom","partyList":"UK","version":"4.1.0"}'
```

Test the same payload with an unlisted origin and confirm it returns `403`.

## 4. Deploy

Before the first deploy, create the Access application in step 5 (or do it
immediately afterwards). The Worker trusts the Access email header, so do not
leave the hostname unprotected longer than necessary.

```bash
npx wrangler deploy
```

`wrangler.toml` declares a custom domain, `analytics.indigo.spot`, and
sets `workers_dev = false`. Cloudflare creates the DNS record and certificate.
If you prefer a `workers.dev` hostname, remove the `routes` block and set
`workers_dev = true`; keep the hostname behind Access either way.

After deploying, set a real `ADMIN_TOKEN` only if you want curl access:

```bash
npx wrangler secret put ADMIN_TOKEN
```

## 5. Protect `/admin` with Cloudflare Access

Create this before the first deploy if possible. The Worker trusts the
Cloudflare Access email header, so until Access is in front of the hostname
that header is only a client-supplied string.

Zero Trust dashboard → **Access → Applications → Add an application → Self-hosted**:

- Name: `Political Playground analytics`
- Domain: `analytics.indigo.spot`, path `/admin`
- Session duration: 24 hours (or your preference)
- Policy: allow only the email address you actually sign in with (check
  `npx wrangler whoami`), plus any alias you want. A different Cloudflare login
  email will be denied even if it is an account alias.

Access protects `/admin` and everything under it, including
`/admin/api/stats`. If the path field treats `/admin` literally, add `/admin*`
or a second application for `/admin/api/*`, and verify both. `/v1/events` and
`/health` stay public so the game can send events. Check that an incognito
window is denied, then sign in and confirm the dashboard loads.

The header trust is safe only while `workers_dev = false` and every public
hostname for this Worker is fronted by Access. If you add another route, protect
it too or switch to Access JWT validation.

For a fresh deployment, keep `TRUST_ACCESS_HEADER = "false"` until the Access
application is live; the dashboard then returns `401` even if someone sends a
forged email header. After confirming the Access login flow, change it to
`"true"` and redeploy. This checkout is currently deployed with `"true"`.
Optional: set `ADMIN_EMAILS` in `wrangler.toml` to a comma-separated allowlist
as defence in depth. Empty means "any identity admitted by the Access
application".

## 6. Point the game at it

In the game repository, set a GitHub Actions repository **variable** (not a
secret):

```bash
gh variable set VITE_ANALYTICS_URL --body "https://analytics.indigo.spot"
```

The deploy workflow passes it to `npm run build`; a rebuild is required because
Vite inlines `import.meta.env` at build time. For local frontend development,
create `.env.local`:

```dotenv
VITE_ANALYTICS_URL=http://localhost:8787
```

If the variable is unset, the analytics module is a no-op.

## API

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/v1/events` | CORS allowlist | Ingest a single event or an array (max 20, 4 KB) |
| `GET` | `/admin` | Access | Dashboard HTML |
| `GET` | `/admin/api/stats?days=30` | Access | JSON aggregates; `days` is `7`, `30`, `90`, or `365` |
| `GET` | `/health` | Public | Liveness JSON |

Events: `campaign_launch`, `campaign_start`, `save`, `save_load`,
`term_start`, `session_start`, `election_result`. The frontend sends the last
two only when explicitly wired; the current build sends the first five.

## Privacy

- The visitor ID is random and only links events from one browser profile; it
  is not derived from IP, hardware, or account data.
- DNT (`navigator.doNotTrack === '1'`) and the local opt-out flag
  (`pp.analytics.disabled = '1'`) stop all requests client-side.
- The Worker stores only the game fields above. It never reads or logs IP
  addresses or user agents, and errors log no payload content.
- Retention is 365 days via the daily cron (`17 3 * * *`).
- The dashboard is a single inline HTML document with a strict CSP and no
  third-party scripts.

## API token

If you cannot use `wrangler login`, create a token at
<https://dash.cloudflare.com/profile/api-tokens> with:

- **Account** → Workers Scripts: Edit
- **Account** → D1: Edit
- **Account** → Account Settings: Read
- **Zone** (`indigo.spot`) → Workers Routes: Edit
- **Zone** (`indigo.spot`) → DNS: Edit (only if wrangler manages the custom
  domain; the dashboard route may be created with Workers Routes alone)
- **Zone** (`indigo.spot`) → Access: Apps and Policies: Edit (only if you
  configure Access with the API rather than the dashboard)

Export it in the shell as `CLOUDFLARE_API_TOKEN`; do not save it in the repo.

For a trusted local agent or a one-off deployment without shell exports, save the
token in `worker/.cf-token` (one line, gitignored) and run:

```bash
cd worker
CLOUDFLARE_API_TOKEN="$(cat .cf-token)" npx wrangler whoami
CLOUDFLARE_API_TOKEN="$(cat .cf-token)" npx wrangler d1 create polplay-analytics
```

Do not paste the token into chat, and delete the file when you are done.

Alternatively, run `wrangler login` yourself with wrangler's config inside the
workspace (also gitignored):

```bash
cd worker
XDG_CONFIG_HOME="$PWD/../.wrangler-config" npx wrangler login
XDG_CONFIG_HOME="$PWD/../.wrangler-config" npx wrangler whoami
```

The OAuth session grants broad account access, so a scoped API token is
preferable if you only want to authorise this deployment.

## Operations

- Tail logs: `npx wrangler tail`
- Apply future migrations: `npm run db:migrate`
- Inspect rows: `npx wrangler d1 execute polplay-analytics --remote --command 'SELECT * FROM events ORDER BY id DESC LIMIT 20'`
- Run the retention query manually: same command with `DELETE FROM events WHERE received_at < unixepoch('now','-365 days')`

## Cost and limits

At this game's scale (a handful of events per player session) D1's free tier is
ample. The Worker caps each request at 4 KB and 20 events, and the ingest
allowlist plus CORS keeps random traffic from filling the table. Add rate
limiting or a Cloudflare WAF rule if the endpoint is abused.
