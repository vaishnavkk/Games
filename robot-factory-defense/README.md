# Robot Factory Defense

A tactical sci-fi grid tower defense game set in an automated assembly plant. Deploy specialized defense turrets, balance dual economies (Scrap & Circuits), research permanent Workshop upgrades, and defend the factory Core against 15 escalating waves of rogue automata.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Play Online](https://img.shields.io/badge/Play_Online-GitHub_Pages-06b6d4)](https://vaishnavkk.github.io/Games/robot-factory-defense/dist/)

---

## Gameplay & Features

### Dual Resource Economy
- **Scrap**: Primary industrial currency dropped by defeated enemies and salvaged from refunded structures. Used to build base turrets, upgrade defenses, and deploy Fabricators.
- **Circuits**: High-tech components produced over time by Fabricators. Used to unlock advanced weaponry (Arc Coil, Rocket Pod) and research permanent Workshop upgrades.

### Defensive Turrets
- **Bolt Turret** (100 Scrap): High-cadence kinetic defense targeting the front-runner enemy.
- **Flame Vent** (130 Scrap): Continuous cone of fire dealing ground-only area-of-effect damage.
- **Arc Coil** (175 Scrap, 20 Circuits to unlock): Armour-piercing electrical arc that chains across up to 3 nearby enemies.
- **Rocket Pod** (220 Scrap, 40 Circuits to unlock): Long-range explosive artillery delivering heavy splash damage.
- **Fabricator** (75 Scrap, max 4): Automated production unit generating 1 Circuit every 10 seconds.

### Rogue Automata & Bosses
- **Glitchbot**: Fast, fragile scout automaton deployed in swarm waves.
- **Rust Walker**: Armoured infantry unit resistant to light kinetic fire.
- **Spark Drone**: High-speed aerial unit that flies over ground hazards.
- **Crusher Tank**: Heavily armoured siege vehicle dealing 3 Core breach damage on leak.
- **IronSentry (Wave 10 Boss)**: Armoured guardian equipped with an active EMP burst that temporarily disables adjacent turrets. Deals 5 Core breach damage.
- **MegaMixer (Wave 15 Boss)**: Massive dual-phase industrial juggernaut with a reactive overdrive shield. Deals 10 Core breach damage.

### The Workshop
Invest collected Circuits into permanent factory upgrades:
- **Overclock**: Increases firing rate across all operational turrets.
- **Hardened Rounds**: Enhances base kinetic and explosive damage.
- **Long Barrels**: Expands targeting range for all turrets.
- **Scrap Magnet**: Amplifies Scrap salvage yields from eliminated enemies.
- **Repair Bay**: Automatically restores Core integrity between waves.
- **Fast Assembly**: Decreases build costs for all future turret placements.

---

## Technical Stack & Architecture

- **Engine**: Pure Vanilla JavaScript with HTML5 Canvas2D procedural rendering (no external game engines, no image sprite sheets).
- **Simulation**: Fixed-timestep deterministic state engine running at 60 sim ticks per second.
- **Typography**: Self-hosted industrial typefaces (`@fontsource/chakra-petch` and `@fontsource/space-mono`).
- **Zero Network Footprint**: Completely self-contained client-side bundle with zero analytics, tracking, or runtime network calls.
- **Tooling**: Built with Vite, linted with ESLint, and verified via `node:test` and Puppeteer.

---

## Local Development & Testing

```bash
# Navigate to the game directory
cd robot-factory-defense

# Install dependencies
npm install

# Start local development server with hot module reload
npm run dev

# Run full automated test suite (50+ unit and property tests)
npm test

# Run 100-seed Monte Carlo bot balance calibration
node scripts/balance.js

# Run headless Puppeteer selfplay validation and planted defect tests
npm run selfplay -- --smoke
node scripts/selfplay.js --selftest

# Build production bundle
npm run build
```

---

## Specifications & Documentation

Comprehensive architectural and design documents are available in the [`docs/`](docs/) directory:
- [Design Specification](docs/DESIGN.md) — Complete game mechanics, formula specifications, and wave curves.
- [Interface Contract](docs/CONTRACT.md) — Simulation API, event signatures, and state contracts.
- [Test Plan](docs/TESTPLAN.md) — Invariant definitions, bot test matrix, and verification gates.
- [Balance Calibration](docs/BALANCE.md) — Monte Carlo win rate benchmarks and wave progression tables.
- [Architecture & Stack](docs/STACK.md) — Dependency audit, licenses, and module organization.
- [Decisions Log](docs/DECISIONS.md) — Architectural records and calibrated parameter sign-offs.

---

## License

This project is licensed under the [MIT License](../LICENSE).
