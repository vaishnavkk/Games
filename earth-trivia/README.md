# 🌍 GeoTrivia: Earth Explorer

> **An interactive 3D WebGL globe geography trivia game where players identify nations by clicking directly on the 3D Earth.**

[![CI](https://github.com/vaishnavkk/Games/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/vaishnavkk/Games/actions/workflows/ci.yml)
[![Play GeoTrivia](https://img.shields.io/badge/Play_Live-GitHub_Pages-06b6d4?style=for-the-badge&logo=github)](https://vaishnavkk.github.io/Games/earth-trivia/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-000000?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)
[![JavaScript](https://img.shields.io/badge/ES6+-Modular-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

---

## 🎮 Play Live
Experience the full 3D interactive globe directly in your browser:  
👉 **[Launch GeoTrivia: Earth Explorer](https://vaishnavkk.github.io/Games/earth-trivia/)**

---

## 📸 Screenshots

| Start Screen (Desktop) | Question Phase with Clue Card |
| :---: | :---: |
| ![Start Screen](docs/img/start-screen.webp) | ![Question Screen](docs/img/question.webp) |

| Close-Miss Result with Geodesic Arc & Memory Vault | Mobile Responsive Experience (390×844) |
| :---: | :---: |
| ![Close Miss Result](docs/img/close-miss.webp) | ![Mobile Experience](docs/img/mobile.webp) |

---

## ✨ Features & Highlights

- **Interactive 3D Earth Globe (`src/globe.js`, `src/mapRenderer.js`)**:
  - Offline vector rasterization of Natural Earth 50m TopoJSON onto high-resolution offscreen canvas textures (4096×2048 / 8192×4096).
  - OrbitControls with momentum damping, zoom bounds, crisp 3D spherical vector borders, starry backdrop, and idle auto-rotation.
  - Dominates ≥75% of viewport across desktop, tablet, and mobile displays.
- **Accurate Direct Country Picking (`src/picker.js`)**:
  - Raycasts mouse or touch directly onto the 3D sphere.
  - Exact spherical-to-equirectangular coordinate projection:
    $$\text{lat} = \arcsin(y) \cdot \frac{180}{\pi}$$
    $$\theta = \text{atan2}(z, -x), \quad \text{lon} = \theta \cdot \frac{180}{\pi} - 180$$
  - Point-in-polygon ray-casting with bounding-box pre-filtering and antimeridian wrapping.
  - Precision beacon detection for **31 microstates and island nations** (Monaco, Singapore, Maldives, Malta, Vatican City, etc.).
- **Official Sovereign Boundaries (Survey of India Standards)**:
  - Integration of official Survey of India boundary vectors (`SOI_WEST_JK`, `SOI_NORTH_LADAKH`) into India's sovereign polygon (`IND`).
  - Seamless border alignment with neighbouring countries (Pakistan, China) with zero overlapping disputed strokes.
- **Cinematic Feedback & Geodesic Arcs (`src/cameraFlight.js`)**:
  - Smooth spherical linear interpolation (`slerp`) camera flight centering on target country.
  - Pre-confirm selection highlights the picked nation in saffron/orange (`#d97d10`).
  - If correct: target nation highlights in emerald green (`#1d733e`).
  - If incorrect: target nation highlights in emerald green (`#1d733e`), wrong guessed nation highlights in crimson red (`#ba3c2a`), and an elevated 3D **great-circle geodesic arc** connects the two points with a dynamic distance badge in kilometers and miles.
- **Educational Memory Vault Dossier (`src/ui.js`)**:
  - Unlocked after identification to permanently cement knowledge:
    - 🔖 **Memory Anchor**: Surprising historical milestones and cultural trivia.
    - 🏛️ **Iconic Landmark**: UNESCO World Heritage sites and signature monuments.
    - 🍲 **Culture & Tradition**: Signature culinary and cultural heritage.
    - 📋 **Full Dossier**: Official title, capital, population, area, languages, currency, bordering/maritime status, and field notes.
- **Free Clue System & Zero-Spoiler Policy**:
  - 3 progressive clues per nation (heritage/culture ➔ geography/fauna ➔ landmark/modern).
  - All 3 clues can be revealed with **0 point penalty** (clues are 100% free).
  - Strict zero-geographical-spoiler rule: no continent names, compass directions, oceans, or mountain ranges.

---

## 🎯 How to Play

### 1. Game Modes
- **Clues Mode** (`clue`): Identify nations based on 3 progressive cultural, historical, and landmark clues.
- **Country Names Mode** (`name`): Test speed and geography knowledge with direct country names.
- **Flags Mode** (`flag`): Identify nations by their official sovereign flag.

### 2. Difficulty Tiers
- **Easy Tier** (**42 nations**, **534 verified clues**): Balanced global powers and iconic nations (11 Asia, 9 Africa, 10 Europe, 5 North America, 4 South America, 3 Oceania).
- **Medium Tier** (**100 nations**, **780 verified clues**): Well-known sovereign nations.
- **Hard Tier** (**195 nations**, **1089 verified clues**): Complete sovereign globe (193 UN members + Vatican City + Palestine).

### 3. Scoring Formula (`src/scoring.js`)
All scoring rules are implemented directly in `src/scoring.js`:
- **Base Correct Answer**: **800 points** (clues are free; zero deduction for revealing clues).
- **Timer Speed Bonus**: Up to **+200 points** proportional to remaining timer:
  $$\text{speedBonus} = \text{round}\left(200 \cdot \frac{t_{\text{remaining}}}{t_{\text{total}}}\right)$$
- **Streak Multiplier**: Consecutive correct answers boost your multiplier by $+0.1\times$ per answer, capped at **$1.5\times$** (achieved at streak 5):
  $$\text{multiplier} = \min(1.5, 1.0 + 0.1 \cdot \text{streak}_{\text{prior}})$$
- **Round Maximum Score**: Hard-capped at **1,000 points**:
  $$\text{RoundScore} = \min(1000, \text{round}((800 + \text{speedBonus}) \cdot \text{multiplier}))$$
- **Proximity Partial Credit**: If incorrect, guesses within $5,000\text{ km}$ receive partial credit:
  $$\text{partialCredit} = \text{round}\left(300 \cdot \max\left(0, 1 - \frac{d}{5000\text{ km}}\right)\right)$$
- **Timer**: 25-second countdown per round (can be toggled on/off in settings).
- **Practice Mode**: Untimed exploration with unrecorded scoring ($0\text{ pts}$).
- **Endless Expeditions**: Play continuously without round limits; finish at any point via the Finish Expedition dialog with comprehensive accuracy summary.

---

## 🏗️ System Architecture & Game Flow

```mermaid
flowchart TD
    subgraph UI ["User Interface"]
        HUD["Top HUD (Score, Streak, Timer)"]
        Card["Clue Card (Free Hints 1-3)"]
        Vault["Memory Vault Card"]
    end

    subgraph Core ["Game Engine"]
        Engine["game.js (State Machine)"]
        Bag["questionBag.js (Uniform Sampling)"]
        ScoreEngine["scoring.js (Scoring Formula)"]
    end

    subgraph Graphics ["3D Graphics Engine"]
        GlobeMesh["globe.js (Three.js Sphere, Borders & Stars)"]
        FlightEngine["cameraFlight.js (Slerp Interpolation)"]
        TextureEngine["mapRenderer.js (Vector Canvas Texture)"]
    end

    Engine -->|Sample Country| Bag
    Engine -->|Compute Points| ScoreEngine
    GlobeMesh -->|Texture Updates| TextureEngine
    Engine -->|Animate Camera| FlightEngine
    Engine -->|Update HUD & Vault| UI
```

---

## 🛠️ Project Structure

```
earth-trivia/
├── .nvmrc                       # Pinned Node.js runtime (v20)
├── CHANGELOG.md                 # Release history & version notes
├── LICENSE                      # MIT Open Source License (vaishnavkk)
├── README.md                    # Project overview & developer guide
├── RELEASING.md                 # Release process, bundle & Pages deployment guide
├── THIRD_PARTY_NOTICES.md       # Upstream dependency, font & data notices
├── eslint.config.js             # ESLint v10 configuration for src/
├── index.html                   # Clean semantic markup and bundle entry
├── package.json                 # Build commands, scripts, dependencies & engines
├── data/                        # Verified offline datasets
│   ├── countries.json           # 195 sovereign nations metadata & anchors
│   ├── clues.json               # 1089 verified factual clues (695 source URLs)
│   ├── world-50m.js             # Natural Earth 50m TopoJSON + Survey of India boundaries
│   ├── tiny-countries.js        # Coordinates & beacon radii for 31 microstates
│   └── soi-boundaries.js        # Official Survey of India boundary vectors
├── dist/                        # Production build
│   └── bundle.js                # Optimized, minified ES module bundle (esbuild)
├── docs/                        # Architecture & contribution guides
│   ├── ARCHITECTURE.md          # Modular architecture, slerp math & round lifecycle
│   ├── CONTRIBUTING.md          # Development setup, test gates & clue contribution rules
│   ├── DATA_SOURCES.md          # Dataset licenses, Survey of India notes & verification
│   ├── social-preview.png       # 1280×640 social card
│   └── img/                     # Real Puppeteer game screenshots (WebP <= 150 KB)
│       ├── start-screen.webp
│       ├── question.webp
│       ├── close-miss.webp
│       └── mobile.webp
├── scripts/                     # Build, QA, and validation automation
│   ├── build/
│   │   ├── bundleMapData.js     # Compiles Natural Earth 50m + SOI boundaries into data/world-50m.js
│   │   └── serve.js             # Local static dev server (port 8080)
│   ├── qa/
│   │   ├── chrome.js            # Shared Headless Chrome / Puppeteer launch helper
│   │   ├── coverageReporter.js  # Runtime JS/CSS coverage report generator
│   │   ├── runCheckContrast.js  # Wrapper launching WCAG AA contrast checks
│   │   ├── selfplay.js          # Autonomous Puppeteer QA harness
│   │   └── snapshotComputedStyles.js # Computed style snapshot utility
│   └── validate/
│       ├── checkClaims.js       # Sentence-level Wikipedia source verification
│       ├── checkCluesStep0.js   # Clue word count, grammar & zero-spoiler linter
│       ├── checkContrast.js     # WCAG AA contrast verifier across states & viewports
│       ├── checkLibrary.js      # Tier quotas, coverage & overlap checks
│       ├── checkPalette.js      # Hex color audit against Tailwind collisions
│       ├── checkSources.js      # Source URL reachability & evidence caching
│       └── validateData.js      # Country metadata integrity & banned-term checks
├── src/                         # Modular ES6 game source
│   ├── audio.js                 # Procedural Web Audio API sound synthesis
│   ├── cameraFlight.js          # Slerp flight, geodesic arcs, outlines & distance badges
│   ├── frame_union.js           # Spherical geometry, border distance & mid-range framing
│   ├── game.js                  # Expedition loop, phase coordinator & mode switching
│   ├── globe.js                 # Three.js 3D sphere, vector borders, stars & orbital controls
│   ├── icons.js                 # Inline SVG UI icons & flag-icons renderer
│   ├── main.js                  # Entry point, DOM bindings & window.__geotrivia hooks
│   ├── mapRenderer.js           # 2D canvas cartography rasterizer & highlight tweens
│   ├── picker.js                # Raycasting point-in-polygon & microstate hit detection
│   ├── questionBag.js           # Uniform PRNG country sampling without replacement
│   ├── rng.js                   # Seeded mulberry32 PRNG, crypto RNG & Fisher-Yates shuffle
│   ├── scoring.js               # Points, timer bonus, streak multiplier & partial credit
│   ├── three.js                 # Centralized tree-shakable Three.js re-exports
│   ├── ui.js                    # HUD, Clue Card, Memory Vault & modal DOM manager
│   └── styles/                  # Modular stylesheets (tokens, layout, components, modals, responsive)
├── test/                        # Automated Node & browser verification suite
│   ├── testDataSync.js          # Dataset sync & world-50m.js SHA-256 verification
│   ├── testEndlessFinish.js     # Endless expedition finish & summary checks
│   ├── testMidRangeFraming.js   # Union bounding-box framing & free-area checks
│   ├── testModals.js            # Modal layout, focus trap & ESC checks across 6 viewports
│   ├── testQuestionBag.js       # Non-repeating bag exhaustion & continent spacing checks
│   ├── testRandom.js            # Seeded PRNG & Fisher-Yates uniformity checks
│   ├── testRegressions.js       # Cleanup & bug-fix regression suite (XSS, storage, Tuvalu, races)
│   ├── testScoring.js           # Scoring formula, multiplier & partial-credit unit tests
│   ├── testStep1CameraFlight.js # Slerp camera flight & orientation unit tests
│   ├── testStep2CluePoints.js   # Free-clue & scoring invariant checks
│   ├── testStep3BugFixes.js     # Border distance, tiny-country & antimeridian regression tests
│   ├── testSummaryBuilder.js    # Expedition summary & flawless state builder tests
│   └── testTiers.js             # Strict tier subset invariants (42 ⊂ 100 ⊂ 195)
└── vendor/                      # Self-hosted offline fonts & SVG flag assets
    ├── @fontsource-variable/dm-sans/
    ├── @fontsource-variable/fraunces/
    └── flag-icons/
```

---

## 💻 Development Commands

```bash
# Install dependencies
npm ci

# Build production bundle (dist/bundle.js)
npm run build

# Build unminified debug bundle with sourcemaps (dist/debug/bundle.js)
npm run build:debug

# Rebuild cartographic map data (data/world-50m.js)
npm run build:data

# Start local development server (http://localhost:8080; aliases: npm run dev, npm run serve)
npm start

# Run ESLint across src/
npm run lint

# Run all 8 data, clue, and UI contrast validators
npm run validate

# Run all 14 Node & browser modal/layout verification scripts (including 6-viewport checks in testModals.js)
npm test

# Run autonomous Puppeteer self-play QA agent (smoke test)
npm run selfplay -- --smoke

# Run full self-play matrix across 3 seeds (123 games, 1,305 rounds)
npm run selfplay -- --full --workers=4
```

---

## 🧪 QA Approach & Verification Gates

GeoTrivia enforces strict automated quality gates:
1. **Autonomous Self-Play Harness (`scripts/qa/selfplay.js`)**: Puppeteer-driven autonomous QA agent that executes real games across 6 viewports (desktop, laptop, tablet, mobile), testing all game modes, tiers, and edge cases.
2. **Deterministic Randomness & Bag Exhaustion (`test/testRandom.js`, `test/testQuestionBag.js`)**: Seeded PRNG (`mulberry32`) ensures repeatable runs and verifies zero question repetition until tier exhaustion.
3. **Automated Clue & Claim Verification (`scripts/validate/checkClaims.js`)**: Validates every single clue in `data/clues.json` to ensure 100% of years, numbers, and proper nouns are directly backed by cited source sentences.
4. **Modal Layout & A11y Invariants (`test/testModals.js`)**: Verifies focus traps, ESC key handling, backdrop dismissal, and zero clipped text across 6 viewports ($320\times568$ to $1920\times1080$).

---

## 📚 Data Sources & Attributions

- **Cartography**: Natural Earth 1:50m Cultural Vectors (Public Domain) via `world-atlas` (ISC License, Michael Bostock).
- **Sovereign Boundaries**: Survey of India official boundary vectors integrated via DataMeet Open Spatial Repository.
- **Encyclopedic Facts**: Wikipedia and UNESCO World Heritage documentation (CC BY-SA 4.0).
- **Typography**: Fraunces Variable and DM Sans Variable fonts (SIL Open Font License 1.1).
- **3D Engine**: Three.js (MIT License, Copyright © 2010-2025 three.js authors).

*Full licensing disclosures, copyright notices, and honest boundary notes in [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).*

---

## 🗺️ Roadmap (v1.1)

- **Expanded Clue Quotas**: Expand Medium tier to ≥1,000 clues and Hard tier to ≥1,500 clues with continuous sentence-level claim verification.
- **Map & Distance Label Polish**: Add high-contrast leader lines for closely clustered island microstates (Caribbean and South Pacific).
- **Audio Synthesizer Extensions**: Add optional microtonal regional scales to procedural audio synthesis based on identified continents.
- **Offline PWA Support**: Service worker caching of 3D globe assets for 100% offline gameplay.

---

## 📄 License

GeoTrivia: Earth Explorer is open-source software licensed under the [MIT License](LICENSE).  
Copyright © 2026 vaishnavkk.
