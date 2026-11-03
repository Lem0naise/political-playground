# The Political Playground

**The Political Playground** is a fictional election simulator game. Players manage a political campaign, navigating weekly polls, dynamic events, and shifting public opinion trends to win the ultimate democratic prize.

Current game version: **4.1.0**.

[**Play Now at polplay.indigo.spot**](https://polplay.indigo.spot)

---

## Project Overview

The simulator models a complex political landscape using a 7-axis ideological model. 

---

## Tech Stack

- **Framework**: React 19 + Vite
- **Language**: TypeScript
- **Styling**: TailwindCSS v4
- **State Management**: React `useContext` + a synchronous reducer wrapper (not `useReducer`)
- **Charts**: `chart.js` + `react-chartjs-2`
- **Routing**: `react-router-dom`

---

## Core Concepts

### The 7-Axis Model
The heart of the simulation is the `PoliticalValues` interface, with axes ranging from `-100` to `+100`:
1. **Progressive / Conservative** (`prog_cons`)
2. **Nationalist / Globalist** (`nat_glob`)
3. **Environmental / Economic** (`env_eco`)
4. **Socialist / Capitalist** (`soc_cap`)
5. **Pacifist / Militaristic** (`pac_mil`)
6. **Authoritarian / Anarchist** (`auth_ana`)
7. **Religious / Secular** (`rel_sec`)

### Simulation Engine
Voters are simulated via a normal distribution around **Voter Bloc** centers. They score each party by salience-weighted squared distance to their own values, plus candidate utility, loyalty to their previous choice, momentum, and trends. A softmax choice keeps some uncertainty. Party splits, mergers, dissolutions, and new-party formation can happen mid-campaign.

---

## Project Structure

- `src/lib/gameEngine.ts`: The central simulation engine, including polling logic, voting utility, party lifecycle, and trends.
- `src/lib/reducerLogic.ts`: The week-by-week poll pipeline (`calculateNextPollState`) and post-election statistics.
- `src/contexts/GameContext.tsx`: Central state management and game loop logic.
- `src/types/game.ts`: Source of truth for all data structures and interfaces.
- `src/lib/coalitionEngine.ts`: Logic for post-election government formation.
- `src/lib/analytics.ts`: Optional, anonymous gameplay analytics (disabled unless `VITE_ANALYTICS_URL` is set).
- `worker/`: Cloudflare Worker + D1 analytics API and Access-protected dashboard. See `worker/README.md`.
- `simulate.ts`: A standalone CLI tool for sampling a single bloc. It predates the current engine and duplicates a simplified vote model, so treat its numbers as indicative only.

---

## Development

### Getting Started

```bash
# Install dependencies exactly as CI does
npm ci --legacy-peer-deps

# Typecheck (optional but recommended)
npm run typecheck

# Run development server
npm run dev
```

### CLI Simulation Tool
You can run a standalone simulation for a specific country and bloc to test parameter changes without the UI:

```bash
npx ts-node simulate.ts <CountryName> <BlocId>
```

### Anonymous Analytics (optional)

The game has no backend, but it can send a small allowlist of events — campaign launch, campaign start, save, save load, new term — to a Cloudflare Worker. The Worker stores aggregate gameplay data in D1 and serves a dashboard behind Cloudflare Access.

Analytics is **off by default**. To enable it for a build, set `VITE_ANALYTICS_URL`:

```bash
# .env.local for local development
VITE_ANALYTICS_URL=http://localhost:8787
```

For the GitHub Pages deploy, set a repository **variable** named `VITE_ANALYTICS_URL`; the deploy workflow passes it to `npm run build`. Vite inlines the value at build time, so a rebuild is required after changing it.

What is sent: an anonymous random visitor ID, a per-tab session ID, the event name, country, party, party list, week, campaign length, and game version. What is **not** sent: IP addresses, user agents, leader names, save files, or full game state. Players can opt out from the main-menu footer, and the browser's Do Not Track setting is honoured. Events older than 365 days are deleted.

Deploying the Worker, creating the D1 database, and configuring Access are covered in [`worker/README.md`](worker/README.md).

---

## Links
- [Play the Game](https://polplay.indigo.spot)
- [Source Code (GitHub)](https://github.com/Lem0naise/political-playground/)
- [Indigo's Website](https://indigo.spot)

---

## Contributing

**The Political Playground** is open source and open to contributions! We welcome new countries, political parties, and game events.

### How to Add a New Country / List of Parties

If you want to add a country or update a party list, follow these steps:

#### 1. Fork and Clone
Fork the [repository](https://github.com/Lem0naise/political-playground/) and clone it to your local machine.

#### 2. Define the Country
Open `public/data/countries.json` and add a new entry. A country requires:
- `pop`: The number of synthetic voters to simulate (not population in thousands; large values are slow).
- `scale`: Display-only multiplier used by the main menu (`pop × scale` is shown as the electorate size).
- `vals`: National averages for the 7 political axes (Progressive/Conservative, Nationalist/Globalist, etc.).
- `hos`: Head of State name (display only).
- Optional `blocs`: An array of voter blocs. Each bloc needs a `weight`, a `center` (ideology), and optional `variance` / `salience` / `turnout`. Countries without blocs use a single normal distribution around `vals`.
- Optional `nameStyle`: which leader-name bank to use (see `event_variables.json` `nameStyles`).

#### 3. Define the Parties
Open `public/data/parties.json` and add a new key (usually matching your country name).
- Add an array of candidates.
- Each candidate needs a `name` (leader), `party` (party name), `colour`, and values for all 7 axes. `colour` must be a 6-digit hex value that is visible on a dark navy background; the chart code only parses `#rrggbb`.
- The `id` field is informational — the game assigns candidate IDs from the array index — but keeping it unique avoids confusing tooling.
- Party lists are selectable independently of countries (`RANDOM`, `NI`, `PEOPLEPOLITICS` exist), so a list does not have to match a country name.

#### 4. Test Your Changes
Typecheck and build:
```bash
npm run typecheck
npm run build
```
Then run the development server:
```bash
npm run dev
```
Select your new country from the main menu. If it doesn't appear or the game crashes, check your JSON syntax and ensure all 7 axes are defined for every party and bloc.

#### 5. Submit a Pull Request
Commit your changes, push to your fork, and open a Pull Request on GitHub. Please include a brief description of the sources or logic used for the new country's data!
