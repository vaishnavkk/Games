import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const countriesPath = path.join(rootDir, 'data', 'countries.json');
const cluesPath = path.join(rootDir, 'data', 'clues.json');
const tinyPath = path.join(rootDir, 'data', 'tiny-countries.js');

const countries = JSON.parse(fs.readFileSync(countriesPath, 'utf8'));
const clues = JSON.parse(fs.readFileSync(cluesPath, 'utf8'));
const tinyContent = fs.readFileSync(tinyPath, 'utf8');

// Calculate counts
const totalCountries = countries.length;
const totalClues = clues.length;
const easyCountries = countries.filter(c => c.tier === 'easy').length;
const mediumCountries = countries.filter(c => c.tier === 'easy' || c.tier === 'medium').length;
const hardCountries = countries.length;

const cMap = new Map(countries.map(c => [c.code, c]));
const clueCounts = { easy: 0, medium: 0, hard: 0 };
clues.forEach(c => {
  const country = cMap.get(c.iso);
  if (country) {
    if (country.tier === 'easy') clueCounts.easy++;
    else if (country.tier === 'medium') clueCounts.medium++;
    else clueCounts.hard++;
  }
});

const easyClues = clueCounts.easy;
const mediumCumulativeClues = clueCounts.easy + clueCounts.medium;
const hardCumulativeClues = totalClues;

// Count microstates
const tinyMatches = tinyContent.match(/id:\s*['"]\d+['"]/g) || [];
const totalMicrostates = tinyMatches.length;

// Unique sources
const uniqueSources = new Set(clues.map(c => c.source)).size;

const b = '`';
const b3 = '```';

const readmeContent = `# 🌍 GeoTrivia: Earth Explorer

> **An interactive 3D WebGL globe geography trivia game where players identify nations by clicking directly on the 3D Earth.**

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

- **Interactive 3D Earth Globe (${b}src/globe.js${b}, ${b}src/mapRenderer.js${b})**:
  - Offline vector rasterization of Natural Earth 50m TopoJSON onto high-resolution offscreen canvas textures (4096×2048 / 8192×4096).
  - OrbitControls with momentum damping, zoom bounds, atmosphere glow shader, and idle auto-rotation.
  - Dominates ≥75% of viewport across desktop, tablet, and mobile displays.
- **Accurate Direct Country Picking (${b}src/picker.js${b})**:
  - Raycasts mouse or touch directly onto the 3D sphere.
  - Exact spherical-to-equirectangular coordinate projection:
    $$\\text{lat} = \\arcsin(y) \\cdot \\frac{180}{\\pi}$$
    $$\\theta = \\text{atan2}(z, -x), \\quad \\text{lon} = \\theta \\cdot \\frac{180}{\\pi} - 180$$
  - Point-in-polygon ray-casting with bounding-box pre-filtering and antimeridian wrapping.
  - Precision beacon detection for **${totalMicrostates} microstates and island nations** (Monaco, Singapore, Maldives, Malta, Vatican City, etc.).
- **Official Sovereign Boundaries (Survey of India Standards)**:
  - Integration of official Survey of India boundary vectors (${b}SOI_WEST_JK${b}, ${b}SOI_NORTH_LADAKH${b}) into India's sovereign polygon (${b}IND${b}).
  - Seamless border alignment with neighbouring countries (Pakistan, China) with zero overlapping disputed strokes.
- **Cinematic Feedback & Geodesic Arcs (${b}src/cameraFlight.js${b})**:
  - Smooth spherical linear interpolation (${b}slerp${b}) camera flight centering on target country.
  - If correct: nation illuminates in emerald green.
  - If incorrect: nation highlights in red, guess highlights in orange, and an elevated 3D **great-circle geodesic arc** connects the two points with a dynamic distance badge in kilometers and miles.
- **Educational Memory Vault Dossier (${b}src/ui.js${b})**:
  - Unlocked after identification to permanently cement knowledge:
    - 🏛️ **Iconic Wonder**: UNESCO World Heritage landmarks.
    - 🍲 **Taste & Tradition**: Signature culinary heritage.
    - 🧠 **Memory Anchor**: Surprising historical milestones and cultural trivia.
    - 📋 **Full Dossier**: Official title, capital, population, area, languages, and neighbours.
  - One-click inspection links to **Google Maps** and **OpenStreetMap**.
- **Free Clue System & Zero-Spoiler Policy**:
  - 3 progressive clues per nation (heritage/culture ➔ geography/fauna ➔ landmark/modern).
  - All 3 clues can be revealed with **0 point penalty** (clues are 100% free).
  - Strict zero-geographical-spoiler rule: no continent names, compass directions, oceans, or mountain ranges.

---

## 🎯 How to Play

### 1. Game Modes
- **Clues Mode** (${b}clue${b}): Identify nations based on 3 progressive cultural, historical, and landmark clues.
- **Country Names Mode** (${b}name${b}): Test speed and geography knowledge with direct country names.
- **Flags Mode** (${b}flag${b}): Identify nations by their official sovereign flag.

### 2. Difficulty Tiers
- **Easy Tier** (**${easyCountries} nations**, **${easyClues} verified clues**): Balanced global powers and iconic nations (11 Asia, 9 Africa, 10 Europe, 5 North America, 4 South America, 3 Oceania).
- **Medium Tier** (**${mediumCountries} nations**, **${mediumCumulativeClues} verified clues**): Well-known sovereign nations.
- **Hard Tier** (**${hardCountries} nations**, **${hardCumulativeClues} verified clues**): Complete sovereign globe (193 UN members + Vatican City + Palestine).

### 3. Scoring Formula (${b}src/scoring.js${b})
All scoring rules are implemented directly in ${b}src/scoring.js${b}:
- **Base Correct Answer**: **800 points** (clues are free; zero deduction for revealing clues).
- **Timer Speed Bonus**: Up to **+200 points** proportional to remaining timer:
  $$\\text{speedBonus} = \\text{round}\\left(200 \\cdot \\frac{t_{\\text{remaining}}}{t_{\\text{total}}}\\right)$$
- **Streak Multiplier**: Consecutive correct answers boost your multiplier by $+0.1\\times$ per answer, capped at **$1.5\\times$** (achieved at streak 5):
  $$\\text{multiplier} = \\min(1.5, 1.0 + 0.1 \\cdot \\text{streak}_{\\text{prior}})$$
- **Round Maximum Score**: Hard-capped at **1,000 points**:
  $$\\text{RoundScore} = \\min(1000, \\text{round}((800 + \\text{speedBonus}) \\cdot \\text{multiplier}))$$
- **Proximity Partial Credit**: If incorrect, guesses within $2,000\\text{ km}$ receive partial credit:
  $$\\text{partialCredit} = \\text{round}\\left(300 \\cdot \\max\\left(0, 1 - \\frac{d}{2000\\text{ km}}\\right)\\right)$$
- **Timer**: 25-second countdown per round (can be toggled on/off in settings).
- **Practice Mode**: Untimed exploration with unrecorded scoring ($0\\text{ pts}$).
- **Endless Expeditions**: Play continuously without round limits; finish at any point via the Finish Expedition dialog with comprehensive accuracy summary.

---

## 🏗️ System Architecture & Game Flow

\`\`\`mermaid
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
        GlobeMesh["globe.js (Sphere Mesh & Shaders)"]
        FlightEngine["cameraFlight.js (Slerp Interpolation)"]
        TextureEngine["mapRenderer.js (Vector Canvas Texture)"]
    end

    Engine -->|Sample Country| Bag
    Engine -->|Compute Points| ScoreEngine
    GlobeMesh -->|Texture Updates| TextureEngine
    Engine -->|Animate Camera| FlightEngine
    Engine -->|Update HUD & Vault| UI
\`\`\`

---

## 🛠️ Project Structure

${b3}
earth-trivia/
├── index.html                   # Clean semantic markup and module linkages
├── package.json                 # Build commands, scripts, dependencies & engines
├── LICENSE                      # MIT Open Source License (vaishnavkk)
├── THIRD_PARTY_NOTICES.md       # Full upstream dependency & font notices
├── data/                        # Verified offline datasets
│   ├── countries.json           # ${totalCountries} sovereign nations metadata & anchors
│   ├── clues.json               # ${totalClues} verified factual clues (${uniqueSources} source URLs)
│   ├── world-50m.js             # Natural Earth 50m TopoJSON + Survey of India boundaries
│   ├── tiny-countries.js        # Coordinates & beacon radii for ${totalMicrostates} microstates
│   └── soi-boundaries.js        # Official Survey of India boundary vectors
├── dist/                        # Production build
│   └── bundle.js                # Optimized, minified ES module bundle (esbuild)
├── docs/                        # Architecture & contribution guides
│   ├── ARCHITECTURE.md          # Modular architecture, slerp math & round lifecycle
│   ├── DATA_SOURCES.md          # Dataset licenses, Survey of India notes & verification
│   ├── CONTRIBUTING.md          # Development setup, test gates & clue contribution rules
│   ├── social-preview.png       # 1280×640 social card
│   └── img/                     # Real Puppeteer game screenshots (WebP <= 150 KB)
│       ├── start-screen.webp
│       ├── question.webp
│       ├── close-miss.webp
│       └── mobile.webp
├── src/                         # Modular ES6 game source
│   ├── main.js                  # Entry point & global event coordination
│   ├── globe.js                 # Three.js 3D sphere, orbital controls & atmosphere
│   ├── mapRenderer.js           # 2D canvas cartography rasterizer
│   ├── picker.js                # Raycasting point-in-polygon & microstate hit detection
│   ├── cameraFlight.js          # Slerp flight, mid-range framing & distance badges
│   ├── game.js                  # Expedition loop, phase coordinator & mode switching
│   ├── scoring.js               # Points, timer bonus, streak multiplier & partial credit
│   ├── questionBag.js           # Uniform PRNG country sampling without replacement
│   ├── audio.js                 # Procedural Web Audio API sound synthesis
│   └── styles/                  # Modular stylesheets
└── test/                        # Automated unit, integration & modal layout test suite
${b3}

---

## 💻 Development Commands

${b3}bash
# Install dependencies
npm ci

# Build production bundle (dist/bundle.js)
npm run build

# Start local development server (http://localhost:8080)
npm start

# Run ESLint across src/
npm run lint

# Run all 8 data, clue, and UI contrast validators
npm run validate

# Run comprehensive test suite across 6 viewports
npm test

# Run autonomous Puppeteer self-play QA agent (smoke test)
npm run selfplay -- --smoke

# Run full self-play matrix across 3 seeds (123 games, 1,305 rounds)
npm run selfplay -- --full --workers=4
${b3}

---

## 🧪 QA Approach & Verification Gates

GeoTrivia enforces strict automated quality gates:
1. **Autonomous Self-Play Harness (${b}scripts/qa/selfplay.js${b})**: Puppeteer-driven autonomous QA agent that executes real games across 6 viewports (desktop, laptop, tablet, mobile), testing all game modes, tiers, and edge cases.
2. **Deterministic Randomness & Bag Exhaustion (${b}test/testRandom.js${b}, ${b}test/testQuestionBag.js${b})**: Seeded PRNG (${b}mulberry32${b}) ensures repeatable runs and verifies zero question repetition until tier exhaustion.
3. **Automated Clue & Claim Verification (${b}scripts/validate/checkClaims.js${b})**: Validates every single clue in ${b}data/clues.json${b} to ensure 100% of years, numbers, and proper nouns are directly backed by cited source sentences.
4. **Modal Layout & A11y Invariants (${b}test/testModals.js${b})**: Verifies focus traps, ESC key handling, backdrop dismissal, and zero clipped text across 6 viewports ($320\\times568$ to $1920\\times1080$).

---

## 📚 Data Sources & Attributions

- **Cartography**: Natural Earth 1:50m Cultural Vectors (Public Domain) via ${b}world-atlas${b} (ISC License, Michael Bostock).
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
`;

fs.writeFileSync(path.join(rootDir, 'README.md'), readmeContent, 'utf8');
console.log('Successfully generated earth-trivia/README.md with exact counts:');
console.log(`- Countries: ${totalCountries} (Easy: ${easyCountries}, Medium: ${mediumCountries}, Hard: ${hardCountries})`);
console.log(`- Clues: ${totalClues} (Easy: ${easyClues}, Medium: ${mediumCumulativeClues}, Hard: ${hardCumulativeClues})`);
console.log(`- Microstates: ${totalMicrostates}`);
console.log(`- Unique Sources: ${uniqueSources}`);
