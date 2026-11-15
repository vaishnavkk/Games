# Changelog

All notable changes to **GeoTrivia: Earth Explorer** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.1] - 2026-11-15

### Added
- **Continuous Integration**: Added `.github/workflows/ci.yml` supporting automated linting, bundling, validators, tests, and Puppeteer self-play smoke tests on push/PR, with full self-play matrix on `workflow_dispatch`.
- **Issue & PR Templates**: Added GitHub issue bug report template with seed/viewport/config reproduction parameters and pull request review checklist.
- **Comprehensive Documentation**: Added `README.md` with 4 WebP real-game screenshots, architecture diagrams, scoring breakdown, and roadmap; added `docs/ARCHITECTURE.md`, `docs/DATA_SOURCES.md`, `docs/CONTRIBUTING.md`, and `docs/RELEASING.md`.
- **Licensing & Attributions**: Added MIT `LICENSE` and `THIRD_PARTY_NOTICES.md` documenting Three.js, TopoJSON Client, Canvas Confetti, Natural Earth, Survey of India, and Google Fonts.
- **Brand Assets**: Added high-resolution social preview image (`docs/social-preview.png`, 1280x640).
- **Claim Validator**: Added `checkClaims.js` validating factual claims against Wikipedia source text sentences with 0 failures on Easy tier.
- **Data Synchronization**: Added `testDataSync.js` enforcing single-source-of-truth integrity and zero drift across JSON datasets.

### Changed
- **Modular Project Structure**: Reorganized codebase into clean directories (`src/`, `src/styles/`, `data/`, `scripts/`, `test/`, `docs/`).
- **CSS Architecture**: Extracted inline CSS into modular stylesheets (`tokens.css`, `layout.css`, `components.css`, `modals.css`, `responsive.css`).
- **Bundle Optimization**: Optimized Three.js imports to eliminate duplicate bundling, slimming bundle footprint.
- **Map Data Precision**: Losslessly rounded TopoJSON coordinates to 4 decimal places (~11 m), reducing map data size while preserving exact boundary accuracy.
- **Free Clue Mechanic**: Completely removed clue-pricing code (`revealCost`, `getRevealClueCost`, `getRevealClueButtonText`); clues are 100% free with no score penalty.
- **Content Polish**: Restored verified clue content and rewritten claims into clear, plain English.

### Fixed
- **Camera Interpolation**: Enforced shortest-path great-circle `slerp` interpolation in `resetToOverview` to eliminate sub-sphere camera clipping.
- **Code Pruning**: Deleted unused legacy methods and marked necessary defensive/fallback branches across modules.

---

## [1.0.0] - 2026-11-10

### Added
- **3D Earth Globe**: Interactive WebGL sphere rendered via Three.js with orbit controls, custom atmosphere glow shader, and starry backdrop.
- **Nations & Clues**: 195 sovereign nations across Easy (42), Medium (100), and Hard (195) difficulty tiers, with 1,089 curated geography clues.
- **Game Modes**: Clues Mode, Country Names Mode, and Flag Mode.
- **Educational Memory Vault**: Post-answer unlocked dossiers featuring iconic wonders, cuisine, cultural traditions, and geographic trivia.
- **Procedural Sound**: 100% synthesized Web Audio API sound effects for clicks, reveals, chimes, and fanfare.
- **Cartography**: Survey of India official sovereign boundaries (Jammu & Kashmir, Ladakh, Aksai Chin, Siachen, Arunachal Pradesh).
