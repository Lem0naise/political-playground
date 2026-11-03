# AGENTS.md

**The Political Playground** is a fictional election simulator: the player runs a party through a fixed number of weekly polls, reacting to events and shifting opinion to win an election and form a government. React 19 + Vite + TypeScript + TailwindCSS v4, state in `useContext` with a synchronous reducer wrapper, no backend — all data is static JSON in `public/data/`.

Current game version: **4.0.1** (`src/lib/version.ts`). v4 added candidate-ID loyalty, scaled base utility, party splits, mid-campaign mergers, axis targeting, and a priority-tagged news feed with newspaper styling.

Companion docs: `README.md` (player- and contributor-facing), `guidance.md` (older deep dive on the simulation; verify against the code, it predates `reducerLogic.ts`, `partyMerger.ts`, and `saveManager.ts`), `docs/proposals/government-plan.md` (proposed, pre-v4, not implemented), `docs/proposals/ws7-analytics-plan.md` (proposed Cloudflare analytics/dashboard, not implemented).

## Commands

| Command | What it does |
|---------|--------------|
| `npm ci --legacy-peer-deps` | Install dependencies exactly as CI does (`npm install` fails on React 19 peer deps) |
| `npm run dev` | Vite dev server on http://localhost:5173 |
| `npm run build` | Production build into `dist/` — **does not typecheck** (Vite/esbuild strips types) |
| `npm run preview` | Serve the built `dist/` |
| `npm run typecheck` | `tsc --noEmit`; this is the working typecheck |
| `npm run lint` | Alias of `typecheck` |
| `npx ts-node simulate.ts <COUNTRY> <BLOC_ID>` | Standalone bloc calibration (defaults `UK` / `left_behind_patriots`) |

`simulate.ts` reads `public/data/countries.json` and `public/data/parties.json` relative to the cwd, samples 40 000 voters for one bloc, and prints party shares. It is not in `tsconfig.json`'s `include` and still uses a simplified distance model (no salience/loyalty/softmax), so treat it as a sanity check. `ts-node` is not a dependency — npx downloads it on first use.

## Verification

There is **no test suite**: no test runner, no `*.test.*` files, and no CI on pull requests. Before committing:

1. Validate any edited JSON parses, e.g. `node -e "JSON.parse(require('fs').readFileSync('public/data/countries.json','utf8'))"`.
2. Run `npm run typecheck` and `npm run build`.
3. Smoke-test the affected phase with `npm run dev`. Phases are reducer state rather than routes, so a successful build proves nothing about the game loop.

Deployment is the only automated gate: pushing to `master` runs `.github/workflows/deploy.yml` (`npm ci --legacy-peer-deps` → `npm run typecheck` → `npm run build` → publish `dist/` to GitHub Pages at `polplay.indigo.spot`, per `CNAME`). Local `npm run build` still does not typecheck; CI does.

## Architecture

```text
index.html → src/main.tsx (StrictMode, HelmetProvider, BrowserRouter)
  └── src/App.tsx (GameProvider, SEO <Helmet>, routes "/" → Home)
        └── src/pages/Home.tsx — phase router
              setup → party-selection → partyMerging → player-selection
                    → campaign → results → coalition
```

Coalition formation is entered from `ResultsView` (or automatically by `CoalitionFormation`) when no party is above `MAJORITY_THRESHOLD` (50, strict); a mid-campaign `START_COALITION` event can enter it early.

`Home.tsx` is the only phase router. The legacy `/new` route and `HomeNew.tsx` were removed.

| Path | Role |
|------|------|
| `src/contexts/GameContext.tsx` | `useGame()` → `{ state, actions }`; `GameAction` union, `gameReducer`, thin action wrappers. State updates run through a synchronous `apply()` wrapper so impure engine work happens once per action; loads event variables on mount |
| `src/types/game.ts` | Source of truth for all interfaces (`NewsItem`, `GameState`, `Candidate`, …) **and** tuning constants (`DEBUG`, `TOO_FAR_DISTANCE`, `SOFTMAX_BETA`, `LOYALTY_UTILITY`, `PROBABILISTIC_VOTING`, `EVENT_EFFECT_MULTIPLIER`, `EVENT_DRIFT_WEEKS`, `MAJORITY_THRESHOLD`, `CABINET_POSITIONS`, `VALUES`) |
| `src/lib/gameEngine.ts` | Electorate generation, `conductPoll`, voting utility, trends (`TREND_DEFINITIONS`), news strings, leadership churn, party dissolution/split/merger/formation, module-level engine state (~109 KB) |
| `src/lib/reducerLogic.ts` | `calculateNextPollState` — the single "advance one week" pipeline; post-election stats; `NewsItem` assembly and template substitution |
| `src/lib/coalitionEngine.ts` | Compatibility, willingness, cabinet appeal, negotiation simulation, AI offers |
| `src/lib/partyMerger.ts` | Party similarity, merge candidates, merged names/values, `ensureUniquePartyNames` |
| `src/lib/eventTemplates.ts` | Loads `/data/event_variables.json`, resolves `{placeholder}` text |
| `src/lib/newsTemplates.ts` | Headline templates for swings, scandals, drift, government/opposition |
| `src/lib/newsPaperStyles.ts` | 13 newspaper visual styles; deterministic paper assignment per headline |
| `src/lib/ideologyProfiler.tsx` | Axis descriptors, weighted ideology labels, and a JSX-rendering `getIdeologyProfile` (card or inline variant) |
| `src/lib/saveManager.ts` | Versioned save export/import (`SAVE_VERSION = '2.0'`); `normalizeGameState` migrates v1/v3 string-news saves |
| `src/lib/version.ts` | `CHANGELOG` + `VERSION` |
| `src/components/*.tsx` | Phase views plus modals/charts (Chart.js + `chartjs-chart-sankey`) |
| `src/app/globals.css` | Tailwind v4 import, Google fonts (Outfit, Special Elite), CSS vars, campaign/newspaper classes, `news-masonry` |
| `public/data/*.json` | `countries.json`, `parties.json`, `events.json`, `event_variables.json`; served at `/data/*` |

There is **no** constituency/FPTP system, no `mapGenerator`, no `mapData`/`electoralSystem`, no `src/components/ui/`, no `src/components/layout/`, no `src/lib/chartTheme.ts`, and no `@theme` token block. Do not assume those exist.

## Data flow

1. `MainMenu` fetches `/data/countries.json`; `handleCountrySelect` jitters the national `vals` by ±5 in a fresh copy, then `SET_COUNTRY` sets `countryData` and `phase: 'party-selection'`. Campaign length (4–104 weeks, default 52) is passed as `totalPolls`.
2. `PartySelection` fetches `/data/parties.json`; selected lists are concatenated and names are de-duplicated (`ensureUniquePartyNames`) → `SET_PENDING_PARTIES` runs a week-0 mock poll (`isMock = true`) and stores `poll_percentage` by candidate index.
3. `PartyMerging` (with optional custom-party creation) ends by calling `SET_PARTY_LIST('Custom Coalition', parties)`, which re-runs a mock poll and advances to `player-selection`.
4. `PlayerSelection` can add/edit/delete parties; each edit calls `SET_PARTY_LIST` (new candidate IDs come from the array index) and re-polls. Selecting a party dispatches `SET_PLAYER_CANDIDATE` (marks `is_player`, phase `campaign`) followed immediately by `START_CAMPAIGN`.
5. `START_CAMPAIGN` clones the candidate list and voter data, calls `conductPoll(..., pollIteration = 1)`, `snapshotInitialChoices()`, schedules the first trend poll, and seeds `pollingHistory`/bloc stats/news. It prepends the season `NewsItem` and keeps any government-formation headlines queued by `CONTINUE_CAMPAIGN`.
6. `CampaignView` renders the week. The event effect runs on `currentPoll` changes, not a timer: it fires when `currentPoll < totalPolls - 2`, at least 3 polls have passed since the last event, and `Math.random() < 0.6`. Events are weighted 8× when their `categories` match an active trend; if an axis is targeted, the picker re-rolls up to 7 times to find an event whose choices include a non-zero effect on that axis. A queued `pendingPlayerEvent` (leadership crisis, week-2 government formation) is shown if no random event is current.
7. Choosing an option dispatches `HANDLE_EVENT`, then `NEXT_POLL` (unless the choice is `START_COALITION` or `AUTO_FORM_GOVERNMENT`). `HANDLE_EVENT` applies the event effect once to a deep-enough clone of the player candidate, handles `CHANGE_LEADER`/`STAY_LEADER`, clears `pendingPlayerEvent`, and clears `targetedAxis` while setting `targetingCooldown = 3`.
8. `NEXT_POLL` → `calculateNextPollState`: clone candidates/voter data → tick/spawn trends → `conductPoll` → increment targeting week counter → leadership changes → party dissolution → new party formation → splits → mergers → week-2 initial government event → priority news assembly → post-election stats (final poll only) → `phase: 'results'` once `totalPolls` is reached.
9. `ResultsView` offers coalition formation (largest ≤ `MAJORITY_THRESHOLD`) or `continueCampaign`; `CONTINUE_CAMPAIGN` starts a new term (`currentPoll: 0`) and resets polls/stats while keeping candidates, trends, event variables, and the incumbent government. `RESUME_CAMPAIGN` returns from a mid-campaign coalition.
10. Save/load round-trips `gameState` plus engine state through `saveManager` and `LOAD_STATE`; `normalizeGameState` migrates old saves. There is no autosave.

Every phase component reads only `useGame()`; nothing is URL-addressable except `/`.

## Simulation rules

- **7 axes** in `VALUES` order: `prog_cons`, `nat_glob`, `env_eco`, `soc_cap`, `pac_mil`, `auth_ana`, `rel_sec`, each `-100..+100`. JSON data stores seven named fields; `Candidate.vals` is a 7-tuple in `VALUES` order.
- **Blocs** have `weight`, `center`, optional scalar-or-per-axis `variance`, optional per-axis `salience` (normalised so the mean weight is 1), and `turnout`. `VoterBloc.turnout` is **inert metadata** (the engine never reads it), `partyAffinity` is declared but unused, and bloc `name` is not supported (labels are title-cased from `id`). Bloc weights sum to exactly 1 in all shipped countries, so the "remainder = independents" path is effectively unused; 7 countries have no `blocs` and fall back to a unimodal normal electorate.
- **Utility** = `-(salience-weighted squared distance) + base_utility_modifier - nascent_penalty + signed(swing × 5)²`, plus `LOYALTY_UTILITY` when the voter chose the **same candidate ID** last week. `base_utility_modifier` is clamped to ±500 in both `applyPoliticalDynamics` and `applyEventEffect`.
- **Turnout**: a voter abstains if the best salience-weighted distance² exceeds `TOO_FAR_DISTANCE²` (140²), with a graded apathy chance up to 60 % between `0.5 × TOO_FAR_DISTANCE` and that limit. `VOTE_MANDATE = false`.
- **Choice**: softmax with `SOFTMAX_BETA = 0.0008` when `PROBABILISTIC_VOTING` (true); otherwise argmax utility.
- **Per-poll dynamics**: `applyPoliticalDynamics` decays `base_utility_modifier` by 1/week toward 0, decays `nascent_penalty` by 667/week toward 0, updates momentum, applies incumbency fatigue (parties >10 %), a bandwagon boost to the leader (>15 %), natural variation, and a 15 %-chance volatile market. `applyVoterDynamics` mutates 1 % of voter axis values by ±1.5 per axis and generates flavour news.
- **Trends**: at most `MAX_ACTIVE_TRENDS = 2`; a new trend is scheduled every 2–4 polls (`TREND_INTERVAL_MIN/MAX`), spawning only before `totalPolls`. A step shifts national `vals`, all bloc centers, and every voter's axis (with 0.35 noise); shifts are clamped and the final week applies the exact remainder.
- **Party lifecycle** (all non-player only):
  - **Dissolution**: under 3 % for 10 consecutive polls → 10 % chance/week.
  - **Split**: at ≥8 % polling, with probability 0.0001–0.002 (parties >30 %), 0.003–0.006 (15–30 %), or 0.005–0.01 (<15 %), higher when declining. 50 % breakaway faction (10–30 % of parent support, `nascent_penalty = 12000`) vs full split.
  - **Merger**: pair similarity >0.92, at least one party above 2 %, 1.5 % chance/week; merged name from `partyMerger`, combined polling, averaged values, base modifier ×0.7.
  - **New party formation**: a bloc with actual turnout <0.40 has a `0.03 + weight × 0.05` chance/week to spawn a new party at its center ±50, `nascent_penalty = 20000`.
  - Dissolved/split/merged parties are removed from the incumbent government list in `calculateNextPollState`.
- **Events**: 299 events, all with `categories`, each with choices `{ text, effect, boost }`. No shipped event sets `internalAction`, but the reducer supports `CHANGE_LEADER`, `STAY_LEADER`, `START_COALITION`, `AUTO_FORM_GOVERNMENT`.
- **News**: each poll assembles `NewsItem[]` (`text`, `priority: critical|high|medium|low`, optional `category`). Items are sorted by priority (stable within a tier) and the feed is capped at 8.
- **Axis targeting**: `targetedAxis` biases event selection for the next event; any event choice clears it and starts a 3-week `targetingCooldown`. Bloc targeting (`targetedBlocId`/`targetingWeeksActive`) separately drives the analyst report in `PollResults`.
- **Tuning constants** live in `src/types/game.ts`, except `MAX_ACTIVE_TRENDS`, `TREND_INTERVAL_MIN/MAX`, `TREND_VOTER_NOISE` (in `gameEngine.ts`) and the drift/split constants in `reducerLogic.ts`/`gameEngine.ts`. `COALITION_FACTOR`, `TOO_CLOSE_PARTY`, and `POLL_COUNTER` are exported but unused; the real default campaign length is the hardcoded 52.

## Engine state invariants

`src/lib/gameEngine.ts` keeps module-level mutable voter memory — `LAST_CHOICES` (candidate IDs, `-1` = abstain), `INITIAL_CHOICES` (snapshot of IDs after poll 1, for transfers), and `VOTER_BLOC_IDS` — exposed only through `getEngineState()` / `setEngineState()`. `saveManager` persists it. `resetEngineState()` clears it and is called by `setCountry`/`resetGame`; the memory is also reset when the voter count changes (`ensureLastChoices` inside `conductPoll`). `snapshotInitialChoices()` is called by `START_CAMPAIGN` (including the launch that begins a new term), so transfers are measured from each term's first poll. Any change to loyalty, voter transfers, or bloc assignment must go through those accessors, or saves and post-election stats silently desync. Engine functions remain impure: they read/mutate that memory, so callers pass cloned candidates/voter data.

## Editing game data

- **`public/data/countries.json`** — keyed by country display name (54 entries). Requires `pop` (the synthetic voter count; large values are slow), `vals` (all 7 axes), `scale` (display-only multiplier; `MainMenu` shows `pop × scale`), and `hos` (head of state, display only — the government title is hardcoded "Prime Minister"). Optional `blocs[]` with `weight`, `center`, `variance`, `salience`, `turnout`; 7 countries omit blocs and use the unimodal fallback. Optional `nameStyle` selects a leader-name bank (read through an `any` cast, not typed on `Country`). There is no `mapData` or `electoralSystem`.
- **`public/data/parties.json`** — keyed by *party list*, not strictly by country (64 lists). Lists are freely multi-selectable (`RANDOM`, `NI`, `PEOPLEPOLITICS` exist), and 10 real-country lists have no matching country (`GEORGIA`, `VENEZUELA`, `SLOVENIA`, `NEW ZEALAND`, `PAKISTAN`, `COLOMBIA`, `PHILIPPINES`, `MALAYSIA`, `HUNGARY`, `KRESIMIRIA, KINGDOM OF`). Each entry needs `name`, `party`, `colour` (hex, visible on navy), and all 7 axes; `swing` and `nascent_penalty` are optional but no shipped party sets either. Colours are unique within each list. The `id` field is informational — `createCandidate` assigns the array index — and duplicates were cleaned up.
- **`public/data/events.json`** — 299 events of `{ title, description, categories, choices: [{ text, effect: Partial<PoliticalValues>, boost }] }`. `categories` drives trend weighting; choices may set `internalAction` (supported, none shipped).
- **`public/data/event_variables.json`** — `{ generic, countrySpecific, nameStyles }`; supplies `{placeholder}` tokens and leader-name banks. `countrySpecific` keys must match `countries.json` keys **exactly**; all 54 now do.

When adding a country, also add a matching party list (README covers the workflow).

## Adding a trend

Add an entry to `TREND_DEFINITIONS` in `src/lib/gameEngine.ts` with a unique `id`, `valueKey`, `direction` (`1 | -1`), `shiftRange`, `durationRange`, and every template array (`titles`, `shortTitles`, `descriptions`, `startTemplates`, `ongoingTemplates`, `completionTemplates`). Then check its pull on a specific bloc with `simulate.ts` — it now handles scalar variance, but still uses a simplified distance model. When changing the election algorithm, start at `conductPoll` in `gameEngine.ts`; `simulate.ts` is not a faithful check of salience/loyalty/softmax.

## Conventions

- TypeScript strict mode; avoid `any` in new logic (legacy `any` exists in data plumbing and saved-state handling).
- State updates must be immutable. All actions flow through the synchronous `apply()` wrapper in `GameContext`, which runs `gameReducer` once per action; do not reintroduce React's `useReducer` for impure polling actions. A new action touches three places: the `GameAction` union, a `gameReducer` case, and the `actions` wrapper — and `LOAD_STATE` must remain able to reconstruct it.
- Keep simulation logic in `src/lib/`, React-free; `gameEngine.ts` (~109 KB) and `GameContext.tsx` are already oversized, so extract rather than grow them.
- Use the `@/` alias (→ `src/`) for imports; single quotes, 2-space indentation, semicolons.
- Bump `CHANGELOG` in `src/lib/version.ts` for any user-visible change; `VERSION` derives from its first entry. Keep `package.json`'s `version` in sync.

## UI system

There is no token layer and no primitives. The real system:

- **Styling**: TailwindCSS v4 utilities used directly, predominantly the `slate` and `yellow` scales plus red/green/blue accents. Screen backgrounds are inline `linear-gradient(135deg, #0f172a, #1e293b, #334155)` on setup/campaign screens and Tailwind gradient classes on results/coalition screens.
- **`src/app/globals.css`** is 100 lines: Google fonts **Outfit** and **Special Elite**, largely unused CSS vars, and a handful of classes — `.newspaper-header`, `.campaign-status`, `.font-oswald` (also Outfit), `.news-body`, `.urgent-banner`, `.vintage-border`, `.campaign-board`, and `.news-masonry` (CSS-columns newspaper layout). Its `@keyframes pulse` overrides Tailwind's pulse animation.
- **News**: `newsPaperStyles.ts` defines 13 newspaper looks (card background/foreground, accent, header layout, fonts, uppercase). `CampaignView` renders a masonry feed of styled cards; `EventModal` also renders as a newspaper. Paper assignment is deterministic per headline/event (hash of country + text/title), so it does not reshuffle on re-render.
- **Charts**: Chart.js via `react-chartjs-2` plus `chartjs-chart-sankey`. There is no shared chart theme; components set their own colours. `hexToRgba` only handles 6-digit hex (party colours are now hex).
- **Chrome**: each phase re-implements its own header/footer; `App.tsx` adds a global GitHub footer whose positioning utilities are inert. The setup screens repeat the "Built by Indigo" pill, and five screens repeat the version/copyright block.
- **Accessibility/motion**: no `prefers-reduced-motion` handling; several `animate-pulse`/`animate-spin`/`hover:scale-*` decorations; modals trap scroll and support Escape but have no focus trap; many controls use arbitrary sizes such as `text-[10px]`.

Use the existing Tailwind/newspaper patterns when adding UI; do not assume primitives or tokens exist, and prefer fixing shared patterns (footer, palette, paper assignment) over adding new styling systems.

## Known issues

- **Local `npm run build` does not typecheck.** CI runs `npm run typecheck` before the build, so type errors are caught on `master`; run the same command locally.
- **No tests, no autosave.** Refreshing loses the run; save export is only on the campaign screen. Exports include the full `votingData` and engine arrays, so files are multi-megabyte for large countries. `SAVE_VERSION = '2.0'` and `normalizeGameState` migrate v1/v3.17 string-news saves, but there is no auto-save.
- **Office title**: `countryData.hos` is passed to `checkPostElectionLeadershipChanges` but its `hosTitle` parameter is unused, and `CabinetView`/news hardcode "Prime Minister" for every country.
- **Inert data fields/constants**: `VoterBloc.turnout` is never read, `partyAffinity` is unused, bloc `name` is unsupported, and `COALITION_FACTOR`, `TOO_CLOSE_PARTY`, `POLL_COUNTER` are exported but unused (default campaign length is the hardcoded 52).
- **Coalition modals** still use plain fixed overlays without focus traps, and some negotiation timeouts are not cancelled on unmount. There is no `prefers-reduced-motion` handling; `globals.css` `@keyframes pulse` overrides Tailwind's pulse animation.
- **Newspaper names** are real-world outlets (BBC, Fox News, NYT, …). That is a deliberate satirical choice today, but it is a distribution/trademark decision.
- **`simulate.ts`** is outside `tsconfig` and uses a simplified distance model; it is a sanity check, not a calibration source.
- **`dist/`** is generated build output (gitignored); do not edit it.
