# Contributing to GeoTrivia: Earth Explorer

Thank you for your interest in contributing to **GeoTrivia: Earth Explorer**! This guide outlines how to set up your local development environment, run automated test suites, and add or update trivia clues according to our strict content and claim verification standards.

---

## 1. Development Setup

### Prerequisites
- **Node.js**: Version `>= 20.0.0`
- **npm**: Version `>= 9.0.0`
- **Google Chrome** (required for headless Puppeteer e2e and selfplay testing)

### Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/vaishnavkk/Games.git
cd Games/earth-trivia
npm ci
```

### Development Server & Build
- **Build production bundle**:
  ```bash
  npm run build
  ```
- **Build debug bundle with source maps**:
  ```bash
  npm run build:debug
  ```
- **Start local development server**:
  ```bash
  npm start
  # or npm run dev / npm run serve
  ```
  Open `http://localhost:8080` in your browser.

- **Rebuild cartographic map data**:
  ```bash
  npm run build:data
  ```

---

## 2. Test Suites & Verification Gates

Before submitting any contribution, all pre-commit verification gates must pass without loosening any thresholds or tests.

### A. Quick Code Quality Checks
```bash
npm run lint      # ESLint checks across src/
npm run validate  # Runs all 8 validation gates below
```

### B. Validation Gates (`npm run validate`)
The automated validator executes 8 comprehensive checks:
1. **Data Sync** (`test/testDataSync.js`): Checks for duplicate obsolete data files, syncs `countries.json`, `clues.json`, `tiny-countries.js`, and verifies `world-50m.js` sha256 checksum against source TopoJSON.
2. **Data Validator** (`scripts/validate/validateData.js`): Ensures all 195 countries contain required coordinates, landmarks, and memory anchors with zero banned terms.
3. **Clue Linting** (`npm run check:clues`): Verifies clue lengths (12–30 words), complete sentence structure, no banned geographical words, and lowercase common nouns.
4. **Library Balance** (`npm run check:library`): Ensures 1,089 unique clues, 195 complete 3-level sets, Jaccard overlap $< 0.6$, and tier quotas.
5. **Source Checking** (`npm run check:sources`): Verifies all 695 unique URLs are active, reachable, and contain the required evidence terms.
6. **Claim Verification** (`npm run check:claims`): Performs sentence-level validation ensuring that every year, number, and proper noun in clue text is directly supported by a source page sentence.
7. **Color Palette Collision** (`npm run check:palette`): Audits hex colors in CSS and JS to prevent collisions with default Tailwind colors.
8. **Contrast Audit** (`npm run check:contrast`): Confirms WCAG AA compliance across text and UI backgrounds.

### C. Full Automated Test Suite (`npm test`)
Runs all unit and integration tests across 6 viewports:
```bash
npm test
```
Tests covered:
- Question bag uniform distribution and cycle exhaustion (`testQuestionBag.js`)
- Camera flight and spherical interpolation (`testStep1CameraFlight.js`)
- Mid-range framing and viewport obstruction avoidance (`testMidRangeFraming.js`)
- Clue worth and pricing verification (`testStep2CluePoints.js`)
- Scoring algorithms, streak multipliers, and partial credit (`testScoring.js`)
- Regressions and bug fixes (`testStep3BugFixes.js`)
- Seeded pseudo-random number generator (`testRandom.js`)
- Expedition summary builder and flawless banners (`testSummaryBuilder.js`)
- Endless finish scenarios (`testEndlessFinish.js`)
- Strict tier subsets: Easy (42) ⊂ Medium (100) ⊂ Hard (195) (`testTiers.js`)
- Modal layouts, focus traps, and backdrop dismissal across 6 viewports (`testModals.js`)

### D. Autonomous Self-Play QA (`npm run selfplay`)
```bash
# Smoke test (fast validation across viewports)
npm run selfplay -- --smoke

# Full matrix test across 3 seeded runs (123 games, 1305 rounds)
npm run selfplay -- --full --workers=4
```

---

## 3. How to Add or Edit Clues

Clues are stored in `earth-trivia/data/clues.json`. Each nation has 3 progressive clue levels:
- **Level 1**: Cultural heritage, signature traditions, cuisine, or folklore.
- **Level 2**: Unique geography, distinctive fauna/flora, economic hallmarks, or historical milestones.
- **Level 3**: Iconic architectural landmarks, UNESCO sites, or notable modern achievements.

### Clue JSON Schema
```json
{
  "id": "FRA-1-001",
  "iso": "FRA",
  "level": 1,
  "topic": "culture",
  "kind": "heritage",
  "text": "Renowned for its culinary mastery, classic baguettes, and fine wine traditions perfected over centuries in historic regional vineyards.",
  "source": "https://en.wikipedia.org/wiki/French_cuisine",
  "evidence": ["baguettes", "wine", "vineyards"],
  "checked": "2026-11-15"
}
```

### Strict Content Rules

1. **Word Count**: Strictly **12 to 30 words**.
2. **Grammar & Sentence**: Exactly **one complete sentence**, punctuated with a final period.
3. **No Common Noun Capitalization**:
   - Only capitalize legitimate proper nouns (e.g., `Colosseum`, `Flavian`, `Shinkansen`, `Buddhism`).
   - Common nouns (e.g., `coffee`, `pizza`, `calligraphy`, `semidesert`, `trade`) must remain lowercase.
4. **Zero Geographical Spoilers**:
   - Never mention the country's own name or demonym.
   - Never mention continent names (e.g., `Europe`, `Asia`, `Africa`).
   - Never mention cardinal compass directions (e.g., `north`, `southern`, `eastern`).
   - Never mention mountain ranges or oceans (e.g., `Andes`, `Pacific`, `Alps`).
5. **Sentence-Level Factual Support (`check:claims`)**:
   - Every **year** (e.g., `1887`, `500 BC`), **number with unit** (e.g., `320 km/h`, `6,961 metres`), and **proper noun** in the clue text must appear in a sentence on the cited `source` page alongside at least one other content word from the same clause.
   - Do not copy entire phrases verbatim from the page (no plagiarized strings).
6. **Evidence Array**:
   - The `evidence` field must contain 2 or more distinctive keywords from the clue that are present in the cached source page text (`report/sources/pages/`).

### Verification Steps for New Clues
After editing `data/clues.json`:
```bash
npm run check:clues
npm run check:claims
npm run check:library
npm run test
```
All four commands must pass with zero hard fails and zero Easy tier claim failures before committing.
