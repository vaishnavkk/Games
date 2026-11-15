# GeoTrivia Data Sources & Licenses

This document provides a comprehensive inventory of all datasets, cartographic assets, typography, and runtime libraries used by GeoTrivia: Earth Explorer, including their verified licenses and an honest explanation of boundary cartography.

---

## 1. Cartographic Datasets

### A. Base Country Boundaries: Natural Earth 50m (`world-atlas`)
- **Package**: `world-atlas` (v2.0.2)
- **Source**: Natural Earth 1:50,000,000 Cultural Vector Dataset (`ne_50m_admin_0_countries`)
- **File**: Bundled into `data/world-50m.js` via `scripts/build/bundleMapData.js`
- **Verified License**: **Public Domain** (Natural Earth) / **ISC License** (`world-atlas`, Copyright 2013-2019 Michael Bostock)
- **Description**: Provides medium-resolution country polygons, land outlines, and international boundaries for all major landmasses.

### B. Survey of India Boundary Overlay (`data/soi-boundaries.js`)
- **Source**: Survey of India official boundary dataset, compiled via DataMeet Open Spatial Repository
- **License**: **UNVERIFIED**
- **Cartographic Implementation**:
  - Base Natural Earth 50m TopoJSON datasets historically omit or render disputed dashed boundary lines for the northern Indian territories of Jammu & Kashmir and Ladakh (including Aksai Chin, Gilgit-Baltistan, and the Siachen Glacier).
  - In `scripts/build/bundleMapData.js`, official Survey of India boundary vectors (`SOI_WEST_JK` and `SOI_NORTH_LADAKH`) are spliced directly into India's primary polygon (`id: 356`).
  - The reciprocal boundary rings of Pakistan (`id: 586`) and China (`id: 156`) are trimmed and aligned to match the spliced segments exactly, guaranteeing zero overlapping border strokes, zero disputed gap polygons, and strict topological continuity across the entire northern frontier.
  - The separate disputed Siachen polygon present in raw Natural Earth data is removed to eliminate visual artifacts.
  - *Honesty Note*: While community distribution via DataMeet uses open licenses (e.g., Open Data Commons / Creative Commons / NDSAP), the underlying statutory copyright of the official Survey of India map data cannot be verified offline and is marked as **UNVERIFIED**.

### C. Microstates & Island Coordinates (`data/tiny-countries.js`)
- **Source**: Project-curated geographic coordinates for 31 microstates and island territories (e.g., Monaco, Vatican City, Singapore, Malta, Maldives, Bahrain, San Marino, Liechtenstein, Tuvalu, Nauru, etc.).
- **Verified License**: **MIT License** (Copyright 2026 vaishnavkk / GeoTrivia contributors).
- **Description**: 50m TopoJSON vector geometries either omit or collapse tiny island nations and microstates into sub-pixel polygons. `tiny-countries.js` defines exact representative coordinates, bounding boxes, and visual beacon radii so players can accurately click and identify even the smallest sovereign nations.

---

## 2. Trivia & Educational Datasets

### A. Sovereign Nations Metadata (`data/countries.json`)
- **Dataset Size**: 195 sovereign nations (193 UN member states + 2 UN permanent observer states: Holy See / Vatican City, and State of Palestine).
- **Sources**: United Nations Statistics Division (M49 standard), ISO 3166-1 country codes, CIA World Factbook, World Bank Open Data.
- **Verified License**: **Public Domain / Open Data**
- **Fields**: ISO codes (alpha-2, alpha-3, numeric), official sovereign names, capitals, continents, subregions, population, area ($km^2$), official languages, currencies, neighbouring countries, maritime status, and iconic memory anchors.

### B. Verified Clue Library (`data/clues.json`)
- **Dataset Size**: 1,089 verified trivia clues across 3 progressive levels for all 195 nations.
- **Tiers Supported**:
  - **Easy**: 42 nations, 534 clues (continent-balanced: 11 Asia, 9 Africa, 10 Europe, 5 North America, 4 South America, 3 Oceania).
  - **Medium**: 100 nations cumulative, 780 clues cumulative (42 Easy + 58 Navigator-only).
  - **Hard**: 195 nations cumulative, 1,089 clues cumulative (100 Medium + 95 Global-only).
- **Sources**: English Wikipedia articles and UNESCO World Heritage Centre dossiers cited per clue.
- **Verified License**: **Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)** (Wikipedia text).
- **Validation**: Every clue is strictly 12 to 30 words, contains a single complete sentence, has zero geographical spoilers (no continents, mountain ranges, oceans, or compass directions), and has all factual claims (years, numbers, proper nouns) verified against exact sentences on the cited source page via the `npm run check:claims` validator.

---

## 3. Production Runtime Libraries

All runtime dependency licenses have been read and verified directly from their package files in `node_modules/`:

| Package | Version | Verified License | Copyright / Author | URL |
| :--- | :--- | :--- | :--- | :--- |
| **`three`** | `^0.182.0` | **MIT License** | Copyright © 2010-2025 three.js authors | https://threejs.org/ |
| **`topojson-client`** | `^3.1.0` | **ISC License** | Copyright 2012-2019 Michael Bostock | https://github.com/topojson/topojson-client |
| **`canvas-confetti`** | `^1.9.4` | **ISC License** | Copyright (c) 2020 Kiril Vatev | https://github.com/catdad/canvas-confetti |
| **`world-atlas`** | `^2.0.2` | **ISC License** | Copyright 2013-2019 Michael Bostock | https://github.com/topojson/world-atlas |

---

## 4. Typography & Fonts

Offline variable web fonts bundled under `vendor/@fontsource-variable/`:

| Font Family | Files Bundled | Verified License | Copyright |
| :--- | :--- | :--- | :--- |
| **Fraunces Variable** | Latin, Latin-ext, Vietnamese `.woff2` | **SIL Open Font License 1.1 (OFL-1.1)** | Copyright 2020 The Fraunces Project Authors |
| **DM Sans Variable** | Latin, Latin-ext `.woff2` | **SIL Open Font License 1.1 (OFL-1.1)** | Copyright 2019 The DM Sans Project Authors, Colophon Foundry |

---

## 5. Unverified Licenses Summary

As required by project compliance guidelines, the following item is flagged as **UNVERIFIED**:
- **Survey of India Boundary Vectors** (`data/soi-boundaries.js`): Open GIS vector coordinates derived from DataMeet community shapefiles. Although hosted and distributed under open spatial principles, official Survey of India cartographic data terms cannot be legally certified offline without live government portal authentication.
