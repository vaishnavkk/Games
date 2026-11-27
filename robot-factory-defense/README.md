<div align="center">

# 🤖 Robot Factory Defense

**A deterministic tactical sci-fi grid tower defense game built for the web.**  
Deploy specialized turrets, manage a dual resource economy, unlock permanent Workshop upgrades, and defend the Core through 15 waves of rogue automata.

[![Play Online](https://img.shields.io/badge/Play_Now-GitHub_Pages-06b6d4?style=for-the-badge&logo=githubpages&logoColor=white)](https://vaishnavkk.github.io/Games/robot-factory-defense/dist/)
[![License: MIT](https://img.shields.io/badge/License-MIT-amber?style=for-the-badge)](../LICENSE)
[![Tests Passing](https://img.shields.io/badge/Tests-100%2F100_Passing-success?style=for-the-badge&logo=node.js)](package.json)
[![Zero Dependencies](https://img.shields.io/badge/Runtime-Zero_External_Engines-blueviolet?style=for-the-badge)](src/)

<br />

<a href="https://vaishnavkk.github.io/Games/robot-factory-defense/dist/">
  <img src="../docs/img/robot-factory-defense.webp" alt="Robot Factory Defense Preview" width="85%" style="border-radius: 8px;" />
</a>

<br /><br />

> ### ⚡ [**Play Robot Factory Defense in Your Browser**](https://vaishnavkk.github.io/Games/robot-factory-defense/dist/)
> Deterministic 60 FPS Canvas2D simulation with combat VFX, responsive mobile/desktop layout, and WCAG AA accessible controls.

</div>

---

## 🎯 Gameplay & Key Features

### ⚙️ Dual-Resource Economy
- 🔩 **Scrap**: The primary industrial currency dropped by eliminated enemies and recovered via demolition refunds (`70%` of invested Scrap). Spend Scrap on turret placements, level upgrades, and auxiliary Fabricators.
- 💡 **Circuits**: Precision computational components generated passively by active Fabricators (`1 Circuit / 10 seconds`). Circuits unlock advanced tech trees (Arc Coil, Rocket Rack) and fund permanent global Workshop upgrades.

### 🛡️ Defensive Arsenal

| Turret | Scrap Cost | Circuit Tech | Function & Combat Specialty |
| :--- | :---: | :---: | :--- |
| **Pulse Turret** | `60 🔩` | Free | Rapid-fire kinetic cannon; ideal for early waves and picking off agile runners. |
| **Coolant Sprayer** | `75 🔩` | Free | Cryogenic foam projector that slows enemy speed by 50% for 2.4s (non-stacking). |
| **Arc Coil** | `100 🔩` | `20 💡` | High-voltage electric beam chaining across up to 3 nearby units, **completely bypassing armour**. |
| **Rocket Rack** | `120 🔩` | `40 💡` | Long-range cluster rocket artillery dealing heavy area-of-effect splash damage. |
| **Fabricator** | `75 🔩` | Free *(Max 4)* | Autonomous production station generating 1 Circuit every 10 seconds to fuel tech progression. |

---

### 👾 Rogue Automata & Boss Encounters

- **Glitchbot**: High-velocity scout deployed in rapid swarm clusters (`1` Core breach damage).
- **Rust Walker**: Rugged industrial biped with light armour plating (`2` armour, `1` Core breach damage).
- **Spark Drone**: Fast hovering automaton immune to path hazards (`1` Core breach damage).
- **Crusher Tank**: Heavy siege chassis with thick flat armour plating (`6` armour, `3` Core breach damage).
- **Iron Sentry (Wave 10 Mini-Boss)**: Walking siege engine with heavy bulkhead plating (`8` armour, `5` Core breach damage).
- **Mega Mixer (Wave 15 Final Boss)**: Colossal factory demolisher with fortress armour (`10` armour, `10` Core breach damage).

---

### 🔬 The Engineering Workshop
Upgrade permanent factory capabilities mid-campaign using collected Circuits:

- ⚡ **Overclock** (`30 💡`): Increases fire rate by `15%` across all turrets.
- 💥 **Hardened Rounds** (`35 💡`): Increases damage by `15%` across all turrets.
- 🔭 **Long Barrels** (`25 💡`): Extends attack range by `10%` across all turrets.
- 🧲 **Scrap Magnet** (`20 💡`): Increases Scrap gained from kills by `20%`.
- 🔧 **Repair Bay** (`20 💡`): One-time `+5 Core HP` structural reinforcement.
- ⏱️ **Fast Assembly** (`30 💡`): Reduces turret build and upgrade Scrap costs by `10%`.

---

## 🏗️ Technical Architecture & Design

- **Engine-Free Canvas2D & Combat VFX**: Custom HTML5 Canvas2D renderer with beam, explosion, and spark effects—zero external game frameworks, physics libraries, or sprite assets.
- **Deterministic 60 FPS Simulation**: Fixed 60-tick/sec simulation engine (`16.667ms` step) with seeded PRNG and full state serialization/deserialization so identical seeds and inputs produce identical outcomes.
- **Responsive & Accessible UI**: Responsive mobile/desktop layout (`320px` to `1440px+`), `>= 48px` touch targets, WCAG AA contrast, and keyboard-accessible modals with focus trapping.
- **Offline Fonts & Resilient Persistence**: Self-hosted Fontsource typography (`@fontsource/chakra-petch`, `@fontsource/space-mono`) and `rfd:`-namespaced `localStorage` stats resilient to quota and security errors.
- **Strict Verification Suite**: Verified with **100/100** tests passing across **17 suites**, covering simulation, timeout/input guards, red team exploits, property-based invariants, UI/a11y, storage resilience, and planted defect verifiers.

---

## 💻 Local Development & Scripts

```bash
# Navigate to the game directory
cd robot-factory-defense

# Install dependencies (Node.js >= 20)
npm install

# Start local dev server with hot module reload
npm run dev
```

### Available `package.json` Scripts

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `dev` | `vite` | Start local Vite development server with HMR. |
| `build` | `vite build` | Build production bundle into `dist/`. |
| `preview` | `vite preview` | Preview the built production bundle locally. |
| `lint` | `eslint src/ test/ scripts/` | Run ESLint across source, tests, and scripts. |
| `test` | `node --test test/**/*.test.js` | Run full test suite (100/100 tests across 17 suites). |
| `test:sim` | `node --test test/sim/*.test.js` | Run simulation unit and guard tests. |
| `test:ui` | `node --test test/ui/*.test.js` | Run UI, accessibility, HUD, and storage tests. |
| `test:review` | `node --test test/review/*.test.js` | Run planted-defect and review verification tests. |
| `selfplay` | `node scripts/selfplay.js` | Run automated bot selfplay harness. |
| `invariants` | `node scripts/invariants.js` | Run multi-viewport headless browser UI/storage invariants. |
| `stress` | `node scripts/stress.js` | Run simulation stress benchmarks. |

---

## 📁 Project Structure

```text
robot-factory-defense/
├── src/
│   ├── data/          # Game balance & entity configs (towers, upgrades, enemies, waves, map)
│   ├── sim/           # Deterministic 60-tick simulation engine & seeded PRNG
│   ├── render/        # Canvas2D grid, procedural icons, and combat VFX renderer
│   ├── ui/            # HUD, build bar, inspect card, Workshop modal, tips & localStorage
│   ├── style/         # Responsive styles & WCAG AA theme tokens
│   └── main.js        # Application bootstrap & game loop
├── test/
│   ├── sim/           # Simulation, determinism, guard, and property-based tests
│   ├── ui/            # UI, accessibility, HUD, and storage resilience tests
│   ├── red/           # Red Team exploit & invariant attack suite
│   └── review/        # Planted defect verification tests
├── scripts/           # Selfplay, balance calibration, stress, and browser invariant runners
├── docs/              # Engineering specs, contracts, test plans, and balance results
├── dist/              # Production Vite build output
├── index.html         # Game entry point
├── package.json       # Scripts and offline Fontsource / dev dependencies
└── README.md          # Project documentation
```

---

## 📚 Technical Documentation

Explore the engineering documentation in [`docs/`](docs/):
- 📐 [**Design Specification**](docs/DESIGN.md) — Mathematical formulas, damage formulas, and wave density curves.
- 📜 [**Interface Contract**](docs/CONTRACT.md) — Deterministic simulation API, state snapshots, and event contracts.
- 🧪 [**Test Plan**](docs/TESTPLAN.md) — Invariants, automated bot matrix, and verification gates.
- 📊 [**Balance Calibration**](docs/BALANCE.md) — Monte Carlo win rate benchmarks across 300 calibrated seeds.
- 🏛️ [**Stack & Architecture**](docs/STACK.md) — Zero-dependency architecture analysis and licensing audit.

---

## 📄 License

This project is licensed under the [MIT License](../LICENSE).
