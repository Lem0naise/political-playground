# The Political Playground

**The Political Playground** is a fictional election simulator game. Players manage a political campaign, navigating weekly polls, dynamic events, and shifting public opinion trends to win the ultimate democratic prize.

[**Play Now at polplay.indigo.spot**](https://polplay.indigo.spot)

---

## Project Overview

The simulator models a complex political landscape using a 7-axis ideological model. 

---

## Tech Stack

- **Framework**: React 19 + Vite
- **Language**: TypeScript
- **Styling**: TailwindCSS v4
- **State Management**: React `useContext` + `useReducer`
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
Voters are simulated via a normal distribution around **Voter Bloc** centers. They choose candidates based on **Euclidean distance** between their personal values and the candidate's platform, modified by candidate utility, party loyalty, and current momentum.

---

## Project Structure

- `src/lib/gameEngine.ts`: The central simulation engine, including polling logic and trend evolution.
- `src/contexts/GameContext.tsx`: Central state management and game loop logic.
- `src/types/game.ts`: Source of truth for all data structures and interfaces.
- `src/lib/coalitionEngine.ts`: Logic for post-election government formation.
- `simulate.ts`: A powerful CLI tool for calibrating parameters and testing bloc behavior.

---

## Development

### Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

### CLI Simulation Tool
You can run a standalone simulation for a specific country and bloc to test parameter changes without the UI:

```bash
npx ts-node simulate.ts <CountryName> <BlocId>
```

---

## Links
- [Play the Game](https://polplay.indigo.spot)
- [Indigo's Website](https://indigo.spot)
