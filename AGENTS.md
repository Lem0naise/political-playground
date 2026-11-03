# AGENTS.md

**The Political Playground** is a fictional election simulator: the player runs a party through a fixed number of weekly polls, reacting to events and shifting opinion to win an election and form a government. React 19 + Vite + TypeScript + TailwindCSS v4, state in `useContext` + `useReducer`, no backend — all data is static JSON in `public/data/`.

Current game version: **4.0.0** (`src/lib/version.ts`). v4 added candidate-ID loyalty, scaled base utility, party splits, mid-campaign mergers, axis targeting, and a priority-tagged news feed with newspaper styling.

Companion docs: `README.md` (player- and contributor-facing), `guidance.md` (older deep dive on the simulation; verify against the code, it predates `reducerLogic.ts`, `partyMerger.ts`, and `saveManager.ts`), `docs/proposals/government-plan.md` (proposed, pre-v4, not implemented).

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

`simulate.ts` reads `public/data/countries.json` and `public/data/parties.json` relative to the cwd, samples 40 000 voters for one bloc, and prints party shares. It is not in `tsconfig.json`'s `include`, and its variance handling is wrong (see Known issues). `ts-node` is not a dependency — npx downloads it on first use.

## Verification

There is **no test suite**: no test runner, no `*.test.*` files, and no CI on pull requests. Before committing:

1. Validate any edited JSON parses, e.g. `node -e "JSON.parse(require('fs').readFileSync('public/data/countries.json','utf8'))"`.
2. Run `npm run typecheck` and `npm run build`.
3. Smoke-test the affected phase with `npm run dev`. Phases are reducer state rather than routes, so a successful build proves nothing about the game loop.

Deployment is the only automated gate: pushing to `master` runs `.github/workflows/deploy.yml` (`npm ci --legacy-peer-deps` → `npm run typecheck` → `npm run build` → publish `dist/` to GitHub Pages at `polplay.indigo.spot`, per `CNAME`). Local `npm run build` still does not typecheck; CI does.

## Architecture

```text
index.html → src/main.tsx (StrictMode, HelmetProvider, BrowserRouter)
  └── src/App.tsx (GameProvider, SEO <Helmet>, routes "/" → Home, "/new" → HomeNew)
        └── src/pages/Home.tsx — phase router
              setup → party-selection → partyMerging → player-selection
                    → campaign → results → coalition
```

Coalition formation is entered from `ResultsView` (or automatically by `CoalitionFormation`) when no party is above 50 %; a mid-campaign `START_COALITION` event can enter it early. Thresholds are currently written inconsistently (`> 50` in `START_COALITION_FORMATION`, `<= 50`/`>= 50` in the views) — see Known issues.

`HomeNew.tsx` is a legacy variant served at `/new` that omits `partyMerging` and `coalition`. Because `PartySelection` always sets phase `partyMerging`, `/new` falls through to `MainMenu` mid-flow; treat `Home.tsx` as canonical and do not link `/new`.

| Path | Role |
|------|------|
| `src/contexts/GameContext.tsx` | `useGame()` → `{ state, actions }`; `GameAction` union, `gameReducer`, thin dispatch wrappers; loads event variables on mount; `SET_TARGETED_AXIS` / `SET_TARGETED_BLOC` |
| `src/types/game.ts` | Source of truth for all interfaces (`NewsItem`, `GameState`, `Candidate`, …) **and** tuning constants (`DEBUG`, `TOO_FAR_DISTANCE`, `SOFTMAX_BETA`, `LOYALTY_UTILITY`, `PROBABILISTIC_VOTING`, `EVENT_EFFECT_MULTIPLIER`, `EVENT_DRIFT_WEEKS`, `CABINET_POSITIONS`, `VALUES`) |
| `src/lib/gameEngine.ts` | Electorate generation, `conductPoll`, voting utility, trends (`TREND_DEFINITIONS`), news strings, leadership churn, party dissolution/split/merger/formation, module-level engine state (~109 KB) |
| `src/lib/reducerLogic.ts` | `calculateNextPollState` — the single "advance one week" pipeline; post-election stats; `NewsItem` assembly and template substitution |
| `src/lib/coalitionEngine.ts` | Compatibility, willingness, cabinet appeal, negotiation simulation, AI offers |
| `src/lib/partyMerger.ts` | Party similarity, merge candidates, merged names/values |
| `src/lib/eventTemplates.ts` | Loads `/data/event_variables.json`, resolves `{placeholder}` text |
| `src/lib/newsTemplates.ts` | Headline templates for swings, scandals, drift, government/opposition |
| `src/lib/newsPaperStyles.ts` | 13 newspaper visual styles; maps a paper name to a layout/colour/font set and picks a paper for a country |
| `src/lib/ideologyProfiler.tsx` | Axis descriptors, weighted ideology labels, and a JSX-rendering `getIdeologyProfile` |
| `src/lib/saveManager.ts` | Save export/import (`{ version: '1.0', gameState, engineState }`); no migration |
| `src/lib/version.ts` | `CHANGELOG` + `VERSION` |
| `src/components/*.tsx` | Phase views plus modals/charts (Chart.js + `chartjs-chart-sankey`) |
| `src/app/globals.css` | Tailwind v4 import, Google fonts (Outfit, Special Elite), CSS vars, campaign/newspaper classes, `news-masonry` |
| `public/data/*.json` | `countries.json`, `parties.json`, `events.json`, `event_variables.json`; served at `/data/*` |

There is **no** constituency/FPTP system, no `mapGenerator`, no `mapData`/`electoralSystem`, no `src/components/ui/`, no `src/components/layout/`, no `src/lib/chartTheme.ts`, and no `@theme` token block. Do not assume those exist.

## Data flow

1. `MainMenu` fetches `/data/countries.json`; `handleCountrySelect` jitters the national `vals` by ±5 **in a shallow copy, mutating the shared vals object** (a known bug), then `SET_COUNTRY` sets `countryData` and `phase: 'party-selection'`. Campaign length (4–104 weeks, default 52) is passed as `totalPolls`.
2. `PartySelection` fetches `/data/parties.json`; selected lists are concatenated → `SET_PENDING_PARTIES` runs a week-0 mock poll (`isMock = true`) and stores `poll_percentage` per party. The mock poll currently matches parties by **party name**, so duplicate names across selected lists share the first match's percentage.
3. `PartyMerging` (with optional custom-party creation) ends by calling `SET_PARTY_LIST('Custom Coalition', parties)`, which re-runs a mock poll and advances to `player-selection`.
4. `PlayerSelection` can add/edit/delete parties; each edit calls `SET_PARTY_LIST` (new candidate IDs come from the array index) and re-polls. Selecting a party dispatches `SET_PLAYER_CANDIDATE` (marks `is_player`, phase `campaign`) followed immediately by `START_CAMPAIGN`.
5. `START_CAMPAIGN` calls `generateVotingData` if needed (one synthetic voter per unit of `country.pop`), `conductPoll(..., pollIteration = 1)`, `snapshotInitialChoices()`, schedules the first trend poll, and seeds `pollingHistory`/bloc stats/news with a single `NewsItem`.
6. `CampaignView` renders the week. The event effect runs on `currentPoll` changes, not a timer: it fires when `currentPoll < totalPolls - 2`, at least 3 polls have passed since the last event, and `Math.random() < 0.6`. Events are weighted 8× when their `categories` match an active trend; if an axis is targeted, the picker re-rolls up to 7 times to find an event whose choices include a non-zero effect on that axis. A queued `pendingPlayerEvent` (leadership crisis, week-2 government formation) is shown if no random event is current.
7. Choosing an option dispatches `HANDLE_EVENT`, then `NEXT_POLL` (unless the choice is `START_COALITION` or `AUTO_FORM_GOVERNMENT`). `HANDLE_EVENT` applies the event effect (currently applied twice — see Known issues), handles `CHANGE_LEADER`/`STAY_LEADER`, clears `pendingPlayerEvent`, and clears `targetedAxis` while setting `targetingCooldown = 3`.
8. `NEXT_POLL` → `calculateNextPollState`: tick/spawn trends → `conductPoll` → increment targeting week counter → leadership changes → party dissolution → new party formation → splits → mergers → week-2 initial government event → priority news assembly → post-election stats (final poll only) → `phase: 'results'` once `totalPolls` is reached.
9. `ResultsView` offers coalition formation (largest ≤ 50 %) or `continueCampaign`; `CONTINUE_CAMPAIGN` starts a new term (`currentPoll: 0`) and resets polls/stats while keeping candidates, trends, event variables, and the incumbent government. `RESUME_CAMPAIGN` returns from a mid-campaign coalition.
10. Save/load round-trips `gameState` plus engine state through `saveManager` and `LOAD_STATE`; there is no autosave and no save-schema migration.

Every phase component reads only `useGame()`; nothing is URL-addressable except `/` and `/new`.

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
- **News**: each poll assembles `NewsItem[]` (`text`, `priority: critical|high|medium|low`, optional `category`). Critical items are always kept and non-critical items fill up to 8 (critical overflow is not capped). Ties are currently broken randomly.
- **Axis targeting**: `targetedAxis` biases event selection for the next event; any event choice clears it and starts a 3-week `targetingCooldown`. Bloc targeting (`targetedBlocId`/`targetingWeeksActive`) separately drives the analyst report in `PollResults`.
- **Tuning constants** live in `src/types/game.ts`, except `MAX_ACTIVE_TRENDS`, `TREND_INTERVAL_MIN/MAX`, `TREND_VOTER_NOISE` (in `gameEngine.ts`) and the drift/split constants in `reducerLogic.ts`/`gameEngine.ts`. `COALITION_FACTOR`, `TOO_CLOSE_PARTY`, and `POLL_COUNTER` are exported but unused; the real default campaign length is the hardcoded 52.

## Engine state invariants

`src/lib/gameEngine.ts` keeps module-level mutable voter memory — `LAST_CHOICES` (candidate IDs, `-1` = abstain), `INITIAL_CHOICES` (snapshot of IDs after poll 1, for transfers), and `VOTER_BLOC_IDS` — exposed only through `getEngineState()` / `setEngineState()`. `saveManager` persists it. The memory is reset only when the voter count changes (`ensureLastChoices` inside `conductPoll`), so `RESET_GAME` does **not** clear it: a new game on the same country/population inherits the previous game's loyalty. `snapshotInitialChoices()` is called only by `START_CAMPAIGN`, not by `CONTINUE_CAMPAIGN`, so term-2 transfer stats compare against term-1's first poll. Any change to loyalty, voter transfers, or bloc assignment must go through those accessors, or saves and post-election stats silently desync. Treat all engine functions as impure: they read and mutate that state, and the v4 poll pipeline also mutates candidate objects.

## Editing game data

- **`public/data/countries.json`** — keyed by country display name (54 entries). Requires `pop` (the synthetic voter count; large values are slow), `vals` (all 7 axes), `scale` (display-only multiplier; `MainMenu` shows `pop × scale`), and `hos` (head of state, display only — the government title is hardcoded "Prime Minister"). Optional `blocs[]` with `weight`, `center`, `variance`, `salience`, `turnout`; 7 countries omit blocs and use the unimodal fallback. Optional `nameStyle` selects a leader-name bank (read through an `any` cast, not typed on `Country`). There is no `mapData` or `electoralSystem`.
- **`public/data/parties.json`** — keyed by *party list*, not strictly by country (64 lists). Lists are freely multi-selectable (`RANDOM`, `NI`, `PEOPLEPOLITICS` exist), and 10 real-country lists have no matching country (`GEORGIA`, `VENEZUELA`, `SLOVENIA`, `NEW ZEALAND`, `PAKISTAN`, `COLOMBIA`, `PHILIPPINES`, `MALAYSIA`, `HUNGARY`, `KRESIMIRIA, KINGDOM OF`). Each entry needs `name`, `party`, `colour`, and all 7 axes; `swing` and `nascent_penalty` are optional but no shipped party sets either. `colour` is required by convention but **28 entries omit it**; 31 entries use named/dark colours (`black`, `darkblue`, `navy`) that are nearly invisible on the navy background. The `id` field is informational — `createCandidate` assigns the array index — but it is duplicated in several lists.
- **`public/data/events.json`** — 299 events of `{ title, description, categories, choices: [{ text, effect: Partial<PoliticalValues>, boost }] }`. `categories` drives trend weighting; choices may set `internalAction` (supported, none shipped).
- **`public/data/event_variables.json`** — `{ generic, countrySpecific, nameStyles }`; supplies `{placeholder}` tokens and leader-name banks. `countrySpecific` keys must match `countries.json` keys **exactly**: 9 currently use underscores (`SOUTH_AFRICA`, `SOUTH_KOREA`, …) and are unreachable by the exact-match lookups in `eventTemplates.ts` and `newsPaperStyles.ts`.

When adding a country, also add a matching party list (README covers the workflow).

## Adding a trend

Add an entry to `TREND_DEFINITIONS` in `src/lib/gameEngine.ts` with a unique `id`, `valueKey`, `direction` (`1 | -1`), `shiftRange`, `durationRange`, and every template array (`titles`, `shortTitles`, `descriptions`, `startTemplates`, `ongoingTemplates`, `completionTemplates`). Then check its pull on a specific bloc with `simulate.ts` — but fix or bypass the variance bug first, because the tool currently ignores scalar `variance` and uses 25 while the engine uses the scalar (default 45). When changing the election algorithm, start at `conductPoll` in `gameEngine.ts`; `simulate.ts` re-implements a simplified distance model and is not a faithful check.

## Conventions

- TypeScript strict mode; avoid `any` in new logic (legacy `any` exists in data plumbing and saved-state handling).
- State updates in `gameReducer` must be immutable. A new action touches three places: the `GameAction` union, a `gameReducer` case, and the `actions` wrapper — and `LOAD_STATE` must remain able to reconstruct it. Existing violations are listed in Known issues.
- Keep simulation logic in `src/lib/`, React-free; `gameEngine.ts` (~109 KB) and `GameContext.tsx` are already oversized, so extract rather than grow them.
- Use the `@/` alias (→ `src/`) for imports; single quotes, 2-space indentation, semicolons.
- Bump `CHANGELOG` in `src/lib/version.ts` for any user-visible change; `VERSION` derives from its first entry. Keep `package.json`'s `version` in sync.

## UI system

There is no token layer and no primitives. The real system:

- **Styling**: TailwindCSS v4 utilities used directly, predominantly the `slate` and `yellow` scales plus red/green/blue accents. Screen backgrounds are inline `linear-gradient(135deg, #0f172a, #1e293b, #334155)` on setup/campaign screens and Tailwind gradient classes on results/coalition screens.
- **`src/app/globals.css`** is 100 lines: Google fonts **Outfit** and **Special Elite**, largely unused CSS vars, and a handful of classes — `.newspaper-header`, `.campaign-status`, `.font-oswald` (also Outfit), `.news-body`, `.urgent-banner`, `.vintage-border`, `.campaign-board`, and `.news-masonry` (CSS-columns newspaper layout). Its `@keyframes pulse` overrides Tailwind's pulse animation.
- **News**: `newsPaperStyles.ts` defines 13 newspaper looks (card background/foreground, accent, header layout, fonts, uppercase). `CampaignView` renders a masonry feed of styled cards; `EventModal` also renders as a newspaper. The same paper name/style set is used for every headline, chosen by a helper that is currently called during render, so it can reshuffle.
- **Charts**: Chart.js via `react-chartjs-2` plus `chartjs-chart-sankey`. There is no shared chart theme; `VoterFlowSankey` mutates `Chart.defaults.font.family` globally. Some components pass raw hex colours (`#0f172a`, `#cbd5f5`) and `hexToRgba` only handles 6-digit hex.
- **Chrome**: each phase re-implements its own header/footer; `App.tsx` adds a global GitHub footer whose positioning utilities are inert. The setup screens repeat the "Built by Indigo" pill, and five screens repeat the version/copyright block.
- **Accessibility/motion**: no `prefers-reduced-motion` handling; several `animate-pulse`/`animate-spin`/`hover:scale-*` decorations; modals use plain fixed overlays without focus traps or Escape handling (where they exist); many controls use arbitrary sizes such as `text-[10px]`.

Use the existing Tailwind/newspaper patterns when adding UI; do not assume primitives or tokens exist, and prefer fixing shared patterns (footer, palette, paper assignment) over adding new styling systems.

## Known issues

- **`npm run build` does not typecheck locally.** CI runs `npm run typecheck` before the build, so type errors are caught on `master`; run the same command locally.
- **No tests, no autosave.** Refreshing loses the run; save export is only on the campaign screen. Exports include the full `votingData` and engine arrays, so files are multi-megabyte for large countries. `saveManager` hardcodes `version: '1.0'` and has no migration, so v3.17 saves (string news) do not load correctly into v4 (`NewsItem[]`).
- **`simulate.ts`** is outside `tsconfig` and reads scalar `variance` as an object (`variance[a]`), silently using 25 while the engine uses the scalar/default 45. Its output is not a valid calibration.
- **Impure reducer / StrictMode**: `gameReducer` calls `conductPoll`, trend stepping, leadership, dissolution, splits, mergers, and news generation, all of which mutate module engine state and candidates. React StrictMode double-invokes reducers, so the dev build can double-apply these and diverge.
- **State mutation**: `calculateNextPollState` mutates candidate objects (trends, drifts, values) before copying them; `PollResults` and `ResultsView` call `.sort()` on `state.blocStats` during render; `MainMenu` shallow-copies a country and mutates the shared `vals`; `applyEventEffect` mutates existing `eventDrifts`.
- **Double event polling change**: `applyEventEffect` adds `pollingChange` to the candidate's `base_utility_modifier` and returns it, then `HANDLE_EVENT` adds the same value again.
- **Reset/second term**: `RESET_GAME` returns `initialState`, discarding loaded `eventVariables` (news then renders literal `{placeholders}`) and leaving engine memory intact; `CONTINUE_CAMPAIGN` does not snapshot initial choices, and `START_CAMPAIGN` replaces the government-formation news with "ELECTION SEASON OFFICIALLY BEGINS."
- **Duplicate party names**: 15 party names appear in multiple lists and lists are multi-selectable; `SET_PENDING_PARTIES` matches by name, so week-0 percentages collide, and several persisted maps (`previousPollResults`, `initialPollResults`, bloc stats, polling history) are keyed by party name. Merged/split names are not checked for uniqueness either.
- **Jittery displays**: `formatVotes` adds `Math.random() * 1000` on every call, so vote totals, turnout and bloc populations change on each render; `getRandomPaperAssignment` is called in render for news cards and `EventModal`, so mastheads reshuffle.
- **Newspaper assignment** pads country papers with global newspapers, but exact-key lookup misses countries with underscored `countrySpecific` keys; the paper names are real-world outlets (BBC, Fox News, NYT, …), which may be undesirable for distribution.
- **Coalition thresholds** are written inconsistently (`> 50` in `START_COALITION_FORMATION`, `<= 50` in the results/auto-start checks, `>= 50` for "majority achieved"), so exactly 50 % is simultaneously "hung parliament" and "majority". The coalition and results UI also says "% seats"/"SEATS WON" although only vote share exists.
- **Data drift**: 28 parties lack `colour`; 4 countries have a 10× `scale` error (ESTONIA, CZECHIA, YUGOSLAVIA 1990, URUGUAY); `SWEDEN` lacks `nameStyle`; `event_variables` has 9 unreachable underscored country keys and two unused generic keys (`crisis_type`, `scandal_type`); `countryData.hos` is passed to `checkPostElectionLeadershipChanges` but its `hosTitle` parameter is unused ("Prime Minister" is hardcoded).
- **`/new`** is a broken legacy route; `HomeNew` omits phases that `PartySelection` always enters.
