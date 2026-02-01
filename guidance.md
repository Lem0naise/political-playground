# AI Agent Guidance for "The Political Playground"

This document provides context and guidelines for AI agents working on the "Political Playground" codebase.

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
- **Candidates**: belong to a Party, have base popularity (`party_pop`) and specific `vals` (PoliticalValues).
- **Voter Blocs**: Groups of voters defined by a `center` (ideal values) and `weight`.
- **Countries**: Have populations, blocs, and baseline values.
- **Trends**: Temporary shifts in voter values or priorities (e.g., "Climate Alarm" pushes `env_eco` towards Environmental).

### Simulation Logic
- **Polling**: Conducted weekly. Voters (simulated via normal distribution around Bloc centers) choose candidates based on **Euclidean distance** between their values and the candidate's values, tempered by `party_pop`.
- **Events**: Multiple-choice scenarios that affect candidate popularity or values.
- **Coalitions**: Post-election logic for forming governments if no majority is won.

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
Logic for post-election negotiation (compatibility scores, seat calculations).

### `simulate.ts` (Root Directory)
Standalone script for calibrating simulation parameters.
- **Usage**: `npx ts-node simulate.ts <CountryName> <BlocId>`
- Useful for testing how a bloc votes without running the full UI.

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
2. Ensure new events simulate consequences effectively (updating `party_pop` or `vals`).

## 5. Directory Map
```
/
├── simulate.ts          # CLI Simulation tool
├── src/
│   ├── App.tsx          # Main Entry & Routing
│   ├── contexts/        # State Management (GameContext)
│   ├── lib/             # Pure Logic (Engine, Helpers)
│   ├── types/           # Type Definitions
│   ├── components/      # React UI Components
│   └── pages/           # Page Layouts
└── public/data/         # JSON Data for Countries/Parties
```
