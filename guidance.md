# AI Agent Guidance for "The Political Playground"

This document provides context and guidelines for AI agents working on the "Political Playground" codebase.

> **Status:** written before the v4.0.0 simulation overhaul. The core concepts still hold, but details have moved on: loyalty is tracked by candidate ID, base utility is scaled to ±500, parties can split and merge mid-campaign, events can target an ideology axis, and news items carry a priority and a newspaper style. Verify anything specific against the code, or use `AGENTS.md` (the current guide).

## 1. Project Overview
**The Political Playground** is a fictional election simulator game. Players manage a political campaign, navigating weekly polls, events, and shifting public opinion trends to win an election.

### Tech Stack
- **Framework**: React 19 + Vite
- **Language**: TypeScript
- **Styling**: TailwindCSS v4
- **State Management**: React `useContext` + `useReducer`
- **Routing**: `react-router-dom`
- **Charts**: `chart.js` + `react-chartjs-2`

## 2. Core Concepts & Domain Model
The game logic relies heavily on a defined set of political axes and voter simulations.

### Political Axes (The 7-Axis Model)
Defined in `src/types/game.ts` as `PoliticalValues`. Range: `-100` to `+100`.
1. `prog_cons`: Progressive (-) vs Conservative (+)
2. `nat_glob`: Nationalist (-) vs Globalist (+)
3. `env_eco`: Environmental (-) vs Economic (+)
4. `soc_cap`: Socialist (-) vs Capitalist (+)
5. `pac_mil`: Pacifist (-) vs Militaristic (+)
6. `auth_ana`: Authoritarian (-) vs Anarchist (+)
7. `rel_sec`: Religious (-) vs Secular (+)

### Entities
- **Candidates**: belong to a Party, have `base_utility_modifier`, polling performance (`poll_percentage`), and `vals` — a 7-number tuple in `VALUES` order, not a `PoliticalValues` object.
- **Voter Blocs**: Groups of voters defined by a `center` (ideal values), optional `weight`, `variance`, and `salience`. `turnout` is metadata only; the engine computes turnout from distance/apathy.
- **Countries**: Have a synthetic voter count (`pop`), a display multiplier (`scale`), baseline values, optional blocs, and a head of state (`hos`).
- **Trends**: Temporary shifts in voter values or priorities (e.g., "Climate Alarm" pushes `env_eco` towards Environmental).

### Simulation Logic
- **Polling**: Conducted weekly. Voters (simulated via normal distribution around Bloc centers) score parties by salience-weighted squared distance, modified by `base_utility_modifier`, nascent penalty, momentum, and loyalty to their previous choice. Choice uses a softmax; turnout is gated by distance and apathy.
- **Party lifecycle**: parties can dissolve, split, merge, or be formed from low-turnout blocs between polls.
- **Events**: Multiple-choice scenarios that affect candidate popularity and/or schedule gradual ideology shifts; an event can be aimed at a specific axis.
- **News**: Headlines are generated as priority-tagged `NewsItem`s and rendered with a newspaper style.
- **Coalitions**: Post-election logic for forming governments if no majority is won; all calculations are vote-share based (there is no seat allocation).

## 3. Key Files Structure

### `src/types/game.ts`
**Source of Truth** for all data structures.
- Look here for `Candidate`, `GameState`, `VoterBloc`, `TrendDefinition`, `PoliticalValues`.

### `src/contexts/GameContext.tsx`
**App State Hub**.
- Uses `useReducer` to handle actions like `NEXT_POLL`, `HANDLE_EVENT`.
- Contains the `gameReducer` which is the central switchboard for state mutations.
- **Important**: This file is large. When refactoring, consider extracting logic to `src/lib/`.

### `src/lib/gameEngine.ts`
**Core Logic**.
- `conductPoll()`: The main simulation loop item.
- `applyTrendStep()`: Logic for evolving trends.
- `createTrend()`: Spawns new narrative arcs.
- contains `TREND_DEFINITIONS`.

### `src/lib/coalitionEngine.ts`
Logic for post-election negotiation (compatibility scores, willingness, cabinet appeal) over vote shares.

### `src/lib/reducerLogic.ts`
The "advance one week" pipeline: `calculateNextPollState` runs trends, polling, leadership/lifecycle checks, news, and post-election statistics.

### `src/lib/newsPaperStyles.ts`
Visual style and paper-name assignment for the newspaper-style news feed.

### `simulate.ts` (Root Directory)
Standalone script for sampling a single bloc.
- **Usage**: `npx ts-node simulate.ts <CountryName> <BlocId>`
- It re-implements a simplified distance model and currently mishandles scalar `variance`, so use it for a rough sanity check, not calibration.

## 4. Development Guidelines

### Coding Style
- **Functional Components**: Use React functional components with hooks.
- **Strict Types**: Avoid `any`. Use interfaces from `src/types/game.ts`.
- **Immutability**: State updates in `gameReducer` must be immutable.

### Common Tasks Instructions

#### Adding a New Trend
1. Open `src/lib/gameEngine.ts`.
2. Add a new entry to `TREND_DEFINITIONS`.
3. Ensure unique `id` and descriptive `completionTemplates`.

#### Modifying Election Algorithm
1. Check `conductPoll` in `src/lib/gameEngine.ts`.
2. If adjusting distance calculations, look at logic using `PoliticalValues`.
3. Use `simulate.ts` to verify impact on specific blocs.

#### Adding New Events
1. Events are often dynamically generated or template-based (`src/lib/eventTemplates.ts`).
2. Ensure new events simulate consequences effectively (updating `base_utility_modifier` or `vals`).

## 5. Directory Map
```
/
├── simulate.ts          # CLI Simulation tool
├── src/
│   ├── main.tsx          # Entry point (StrictMode, providers, router)
│   ├── App.tsx           # Routes + SEO (<Helmet>) + GameProvider
│   ├── contexts/         # State Management (GameContext)
│   ├── lib/              # Pure Logic (Engine, Helpers)
│   ├── types/            # Type Definitions
│   ├── components/       # React UI Components
│   └── pages/            # Phase routers
└── public/data/          # JSON Data for Countries/Parties
```
