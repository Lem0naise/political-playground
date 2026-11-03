# Government vs Opposition — Implementation Plan: Approval → Turnout, Role-Tagged Events

**Status:** proposed, not yet implemented.
**Supersedes:** the earlier, larger proposal (weekly action economy, portfolios, role-based vote utility). That version was cut for scope and pacing — see "Out of scope".

**Core principle:** approval does **not** change minds, it changes **who shows up**. That keeps the mechanic legible ("my voters stayed home") and keeps the game from turning into a stat-management screen.

---

## Goal & success criteria

Governing and opposing should diverge through:

1. one visible, shared **approval** dial;
2. **turnout** behaving differently per bloc depending on whether that bloc backs the government;
3. **events and news** that are explicitly governing or opposition content.

Success = in one session the player sees a different event pool, different news framing, and visibly different bloc turnout (the `PollResults` sidebar already renders per-bloc turnout with ▲▼, and `postElectionStats` already reports the biggest turnout drops) as government vs opposition — with **no new action buttons**, the **same event cadence**, and **old save files still loading**.

---

## Current state (why this is needed)

- `incumbentGovernment` is maintained across elections but only affects news pool flavour (`GOVERNMENT_*` / `OPPOSITION_*` templates), "G" badges, the PM label, `ParliamentChart` tinting, and the post-election leadership-challenge penalty. **It has zero effect on polling.**
- The `incumbencyEffect` in `applyPoliticalDynamics` is poll-share fatigue applied to every party — opposition suffers it equally.
- `VoterBloc.turnout` in `countries.json` (0.73–0.9) is **never read** by the polling engine; bloc turnout is entirely emergent from the distance/apathy gate in `voteForCandidate`.
- `actionsRemaining`, `funds`, and `politicalCapital` are declared and unused; the only weekly player agency is event choices.
- Role events do not exist; all 299 events in `public/data/events.json` are generic.

---

## Mechanic 1 — Government approval

`GameState` gains three numbers:

| Field | Meaning |
|---|---|
| `governmentApproval` | 0–100, approval of the government of the day (whoever leads it), starts 55 |
| `previousApproval` | previous poll's value, for the ▲▼ delta |
| `weeksInGovernment` | polls since the current government took office |

Evolved once per poll in `calculateNextPollState`, only while `incumbentGovernment` is non-empty:

```text
delta = 0.06 * (50 - approval)                        // mean reversion
      + (weeks < 4  ? +0.9                            // honeymoon
         : weeks > 8 ? -(0.25 + 0.02 * min(weeks,20)) // governing fatigue
         : 0)
      - 0.5 * activeTrendCount                        // crises cost the government
      + N(0, 1.0)

approval = clamp(approval + delta, 5, 95)
```

Init / reset rules:

- Government first forms (week-2 caretaker decision, `AUTO_FORM_GOVERNMENT`, `RESUME_CAMPAIGN`): `55`, `weeksInGovernment = 0`.
- New election (`CONTINUE_CAMPAIGN`): `52` if the lead party changes, else `50 + 0.3 * (previous - 50)`; `weeksInGovernment = 0` either way.
- No government (challenger phase): approval hidden and not evolved.

Event choices move it by ±1–4 (Mechanic 3). It is displayed in one compact sidebar row — `APPROVAL 47% ▼3`, plus a one-line hint ("lower approval demoralises the government's voters"). No bar chart, no history chart, no weekly toast.

---

## Mechanic 2 — Turnout coupling (the centrepiece)

For each bloc, spread the government's approval across its voters according to how much that bloc actually backs the government, then apply it as a participation bias inside the existing abstention logic:

```text
signal  = clamp((approval - 50) / 50, -1, 1)

support = share of that bloc's voters backing a government party at the last poll
          (from state.blocStats; percentages include non-voters, so normalise by
           the bloc's total share; fallback 0.5 when no history exists)

bias    = clamp(signal * (0.30 * support - 0.10 * (1 - support)), -0.18, +0.12)
```

So at approval 30, a bloc voting 80 % government gets a −10 % participation bias while a bloc voting 10 % government gets a small positive bias. At approval 70 the signs invert. `support` is computed against `getGovernmentParties()` (which intersects with live candidates so dissolved AI parties cannot dangle).

**Code touchpoints:**

| File | Change |
|---|---|
| `src/lib/gameEngine.ts` — `conductPoll` (~line 1814) | optional `blocTurnoutBias?: number[]` (indexed like `country.blocs`), forwarded to `conductFptpPoll` (~1267) and the PR polling loop (~1867) |
| `src/lib/gameEngine.ts` — `voteForCandidate` (~1541) | final optional `turnoutBias = 0`: <br>• `if (turnoutBias < 0 && Math.random() < -turnoutBias) return null;` — demoralised supporters stay home (the main effect) <br>• `if (turnoutBias > 0)` scale the hard distance limit by `(1 + 0.3 * turnoutBias)` and the apathy chance by `(1 - 2 * turnoutBias)` — modest enthusiasm boost, never resurrection of hard abstainers |
| `src/lib/reducerLogic.ts` | after evolving approval, compute the bias array and pass it into `conductPoll` (~line 289) |
| `src/contexts/GameContext.tsx` — `START_CAMPAIGN` (~line 228) | compute and pass the same bias; mock polls (`SET_PARTY_LIST`, `SET_PENDING_PARTIES`) pass none |
| `src/lib/governmentEngine.ts` (new) | `computeBlocTurnoutBias(blocs, govParties, approval, blocStats)` |

**Why no new UI is needed:** abstainers leave the numerator and denominator, so national percentages shift; each bloc's turnout line already moves in `PollResults`; `postElectionStats.biggestTurnoutIncrease/Decrease` already surfaces it on the results screen. The 18 % cap means one poll cannot collapse a bloc.

---

## Mechanic 3 — Role-tagged events (replaces the action system)

### How

- `Event` gains `role?: 'government' | 'opposition'`; `EventChoice` gains `approval?: number` (in `src/types/game.ts`).
- The event loop, cadence (≥3 polls since last, 60 % chance), modal, and `boost`/`effect` semantics are untouched. Only *which* events are eligible and how much approval they move changes.

### Where

| Layer | Location and behaviour |
|---|---|
| **Data** | Append **16** events to `public/data/events.json` (the existing 299 stay untouched), 4-space indentation, same schema plus `role`, and `approval` on choices that read as credit/blame. `instantiateEvent` already spreads choices, so `approval` survives placeholder substitution; `role` is read on the raw event before instantiation. |
| **Selection** | Extract the weight-building block from `src/components/CampaignView.tsx` (~lines 59–76) into a pure `weightEvents(events, playerRole, activeTrendKeys)` in `governmentEngine.ts`: mismatched `role` → weight 0; matching `role` → ×12; trend-category match → ×8 (existing behaviour); `challenger` → all role events 0. With 299 generics + 8 per role this puts role events at roughly **20–25 % of events** (~4 per campaign), so they colour a run without replacing the existing pool. |
| **Application** | `HANDLE_EVENT` in `src/contexts/GameContext.tsx` adds `choice.approval` to `governmentApproval` (clamped; ignored when no government exists). |
| **Docs** | Update the events section of `AGENTS.md` with `role` / `approval`. |

### Events to add

Government (`role: "government"`)

| Event | Axis | Tension | Approval Δ |
|---|---|---|---|
| Cabinet Reshuffle Rumours | `auth_ana` | promote a loyalist / demote a rival / deny | +1 / −2 / −1 |
| Budget Day: The Books Don't Balance | `soc_cap` | spend / cut / delay | +4 / +1 / −3 |
| Ministerial Gaffe Goes Viral | `rel_sec` | fire / defend / apologise | +2 / −3 / +1 |
| Delivery Milestone at the Port | `env_eco` | ribbon-cut / quiet announcement / share credit | +3 / +1 / +2 |
| Coalition Partner Threatens to Walk | `prog_cons` | concede / hold firm / leak against them | +2 / −2 / −4 |
| Backbench Rebellion on the Bill | `auth_ana` | whip / compromise / dare them | −2 / +1 / −3 |
| The Opposition's No-Confidence Trap | `pac_mil` | confront / pivot to record / concede ground | +1 / +2 / −2 |
| Scandal in Your Ministry | `auth_ana` | suspend / independent inquiry / deny | +2 / +1 / −4 |

Opposition (`role: "opposition"`)

| Event | Axis | Tension | Approval Δ |
|---|---|---|---|
| The Leaked Dossier | `auth_ana` | publish / hand to regulator / sit on it | −4 / −2 / 0 |
| By-Election Upset | `nat_glob` | campaign hard / localise / claim a national mandate | −1 / −1 / −2 |
| Exposé in the Press | `rel_sec` | amplify / demand inquiry / stay quiet | −3 / −2 / 0 |
| Policy Relaunch | `prog_cons` | shift to popular ground / stay principled / attack the government | 0 / 0 / −2 |
| Party Unity Test | `auth_ana` | unity tour / purge critics / media round | 0 / 0 / −1 |
| Courting the Minor Parties | `soc_cap` | formal pact / joint platform / keep distance | 0 / 0 / 0 |
| Motion of No Confidence | `auth_ana` | force it / negotiate / withdraw | −3 / −2 / 0 |
| The Government's U-Turn | `env_eco` | exploit it / demand inquiry / ignore | −3 / −2 / 0 |

Opposition events mostly move approval **down** — their lever is suppressing government turnout. Where a choice carries no approval delta, the difference lives in `boost` / axis effects. Full choice wording and `effect` / `boost` values are written during implementation; deltas stay in the −4…+4 band so one event never dominates the weekly drift.

---

## Mechanic 4 — News & verdict (tiny)

- `useFlavouredPool` in `reducerLogic` (~line 428) goes from `Math.random() < 0.6` to `< 0.85`, so the **existing** `GOVERNMENT_*` / `OPPOSITION_*` headline pools dominate. No new pools for this.
- On trend spawn, add one role line next to `formatTrendStartHeadline` ("Government braced for {trend}" / "{player} seizes on {trend}"). One line, only on spawn.
- Approval headlines only on band crossings (30 / 40 / 60 / 70) or every 6 weeks — three small pools in `newsTemplates.ts`, no weekly spam.
- `ResultsView`: change the existing "Player Performance" heading to a role-aware verdict (`GOVERNMENT RETURNED` / `GOVERNMENT DEFEATED` / `YOU TAKE OFFICE` / `OPPOSITION HOLDS`) and show final approval. Text only.

---

## State / API changes (all additive)

| Where | Change |
|---|---|
| `src/types/game.ts` | `PlayerRole`, `GameState.{governmentApproval, previousApproval, weeksInGovernment}`, `Event.role`, `EventChoice.approval`, approval / turnout / weight constants |
| `src/lib/gameEngine.ts` | `conductPoll(..., blocTurnoutBias?: number[])`; `voteForCandidate(..., turnoutBias = 0)`; FPTP forwarding |
| `src/lib/reducerLogic.ts` | evolve approval, compute bias, pass to poll, approval / trend news |
| `src/contexts/GameContext.tsx` | init / reset fields; formation / resume / continue approval; `HANDLE_EVENT` approval delta; `START_CAMPAIGN` bias; `LOAD_STATE` normalise |
| `src/lib/saveManager.ts` | `SAVE_VERSION = '1.1'`, `normalizeGameState` fills missing fields (old 1.0 saves load with approval 55) |
| `src/lib/newsTemplates.ts` | approval band pools, trend role lines |
| `src/components/CampaignView.tsx` | role banner replaces the malformed PM `<h3>` block; `weightEvents` call |
| `src/components/PollResults.tsx` | unchanged — it already shows per-bloc turnout changes |
| `public/data/events.json` | +16 role-tagged events |

No new components, no router changes, no changes to coalition / cabinet / merger code.

---

## Edge cases

- **No government yet (first two weeks):** approval hidden, bias all zeros, role events weighted 0.
- **Government changes mid-campaign** (week-2 formation, `RESUME_CAMPAIGN`) or at election: approval re-seeded, `weeksInGovernment = 0`, bias recomputed next poll.
- **Government party dissolved:** `getGovernmentParties` intersects with live candidates so support / role lookups never dangle.
- **Junior coalition partner:** shares the approval figure; no separate treatment.
- **No prior bloc stats (first poll of a role):** support falls back to 0.5 → negligible bias, no jump.
- **Procedural / FPTP campaigns:** bias flows through the shared `voteForCandidate`; bloc lookups are national; voters with bloc index `-1` get 0.
- **Old saves:** normalised to approval 55 / previous 55 / weeks 0.
- **Approval extremes:** clamped to 5–95 on every write; bias clamped to ±0.18.

---

## Verification

- `npm run build`.
- Optional but recommended: add `vitest` + `npm run test` with four pure-function tests — approval clamps / honeymoon / fatigue, `computeBlocTurnoutBias` sign and clamp (government-backing blocs fall at low approval, rise at high), `getPlayerRole` including dissolved parties, `weightEvents` role / trend / challenger matrix. Update `AGENTS.md` (commands, architecture, simulation rules, data schema) if the test runner is added.
- Manual checklist:
  1. New game → week-2 caretaker choice; approval starts 55.
  2. Watch one bloc's turnout ▲/▼ track approval over ~6 weeks.
  3. Answer role events; confirm approval moves and the feed frames them by role.
  4. Run to election; check the verdict and the biggest turnout drop.
  5. `CONTINUE_CAMPAIGN` → approval reset and role flip.
  6. Save / load; import a pre-change save.
  7. Check a procedural map (FPTP) campaign still polls.
- Note: `npm run lint` is currently broken in this checkout (`TS6310` — referenced project disables emit), so build + manual checks are the gates; fixing the tsconfig is out of scope.

---

## Acceptance criteria

1. The same starting position, played as government vs opposition, produces a different event pool, different news framing, and measurably different bloc turnout (government-backing blocs demoralise as approval falls).
2. Approval is always 5–95, persists, and survives old-save import.
3. No new action buttons and no change to event frequency; the 299 existing events remain in rotation; role events are a seasoning (~20–25 %), not a replacement.
4. `npm run build` passes and the manual checklist is clean; coalition, merger, FPTP and leadership-crisis flows are unregressed.

---

## Out of scope

Weekly actions / action budget, portfolios and cabinet gating, role-based vote utility, targeting changes, new resources, coalition goodwill, event cadence changes, and any UI beyond one banner row and one results line.

## Balance knobs

`TURNOUT_SIGNAL_GOV` / `TURNOUT_SIGNAL_OPP` (0.30 / 0.10), bias clamps (−0.18 / +0.12), approval drift / honeymoon / fatigue constants, `ROLE_EVENT_WEIGHT` (12), event `approval` deltas.

## Suggested implementation order

1. Types, constants, `governmentEngine.ts` selectors + pure formulas, `normalizeGameState`.
2. Approval evolution + turnout bias wiring (`reducerLogic`, `conductPoll`, `voteForCandidate`, `START_CAMPAIGN`).
3. Approval field plumbing (`HANDLE_EVENT`, formation / resume / continue / reset).
4. UI banner + results verdict + news lines.
5. The 16 events and the `weightEvents` extraction.
6. Build, manual pass, optional unit tests, `AGENTS.md` update.
