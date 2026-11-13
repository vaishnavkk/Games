# 🌍 GeoTrivia: Earth Explorer (3D Interactive Globe)

> A high-performance 3D interactive globe geography trivia game where players identify nations by **clicking directly on the 3D Earth**.

Built with **Three.js**, **Natural Earth 50m TopoJSON** (bundled offline), and a custom equirectangular canvas rendering pipeline. No runtime CDN calls or external photo textures required.

---

## ✨ Features & Highlights

- **3D Interactive Globe (`src/globe.js`, `src/mapRenderer.js`)**:
  - Offline vector rendering of real Natural Earth country boundaries onto an offscreen canvas texture (4096×2048 / 8192×4096).
  - OrbitControls with realistic inertia, zoom bounds, atmosphere rim shader, and idle auto-rotation.
  - Dominates ≥75% of the screen across desktop, tablet, and mobile.
- **Accurate Direct Country Picking (`src/picker.js`)**:
  - Raycasts mouse or touch directly onto the 3D sphere.
  - Exact spherical-to-equirectangular projection:
    $$\text{lat} = \arcsin(y) \cdot \frac{180}{\pi}$$
    $$\theta = \text{atan2}(z, -x), \quad \text{lon} = \theta \cdot \frac{180}{\pi} - 180$$
  - Ray-casting point-in-polygon with bounding-box prefiltering and international date-line wrapping.
  - Enhanced microstate hit detection: enlarged touch radii and beacon dots for small island nations (Malta, Singapore, Maldives, Monaco, Vatican City, etc.).
- **Sovereign Boundaries (Survey of India Standards)**:
  - Complete integration of Jammu & Kashmir, Ladakh (Aksai Chin & Gilgit-Baltistan), and Arunachal Pradesh into India's sovereign polygon (`IND`).
  - Zero overlapping disputed border strokes across Indian territory.
- **Cinematic Feedback & Flight (`src/cameraFlight.js`)**:
  - Smooth spherical linear interpolation (`slerp`) camera flight centering on the target country upon answer submission.
  - If answered correctly: nation lights up emerald green.
  - If answered incorrectly: nation lights up red, player's guess is highlighted, and a 3D elevated **great-circle geodesic arc** connects the two points with distance in kilometers and miles.
- **High-DPI Distance Badge & Dynamic Zoom**:
  - High-resolution ($512 \times 192$) dynamic canvas sprite badge on the globe.
  - Automatically scales relative to camera zoom distance so it never obstructs or balloons over geography.
- **Educational Memory Vault Side/Bottom Card (`src/ui.js`)**:
  - Displays cultural anchors, landmark, flag, capital, and full geographic dossier (area, population, languages, currency, neighbors).
  - Smart camera framing ensures the country is never obscured by the card.
  - One-click direct inspection in **Google Maps** and **OpenStreetMap**.
- **Free Clue System & Zero-Spoiler Policy**:
  - 3 progressive clues: cultural/historical hint ➔ distinct fact ➔ landmark/current affairs clue.
  - All 3 clues can be revealed freely with zero point deduction.
  - Strict zero-geographical-spoiler rule: no continents, oceans, mountain ranges, or compass directions in clue text.
- **Game Modes & Tiers (`src/game.js`, `src/scoring.js`)**:
  - **Modes**: Clue Mode (progressive hints), Country Name Mode, Flag Mode.
  - **Tiers**:
    - **Easy (42 iconic nations)**: Balanced across continents using offline Natural Earth POP_EST familiarity score (Asia 11, Europe 10, Africa 9, North America 5, South America 4, Oceania 3).
    - **Medium (100 diverse nations)**: Globally representative subset (Asia 26, Africa 26, Europe 24, North America 11, South America 8, Oceania 5).
    - **Hard (195 nations)**: All 193 UN members + Vatican City + Palestine.
  - **Pacing**: 10 rounds, 20 rounds, or Endless. Toggleable 25s timer vs Practice Mode (scores unrecorded).

---

## 🚀 Development & Testing

```bash
cd earth-trivia

# Run all test suites
npm test

# Run clue integrity and banned word scanner
npm run check:clues

# Run Tailwind color collision audit
npm run check:palette

# Run WCAG AA contrast check across all viewports
npm run check:contrast

# Build production bundle
npm run build
```

---

## 📄 License

Open source and free to use under the [MIT License](../LICENSE).
