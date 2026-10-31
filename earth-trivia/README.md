# 🌍 GeoTrivia: Earth Explorer (3D Interactive Globe)

> A high-performance 3D interactive globe geography trivia game where players identify nations by **clicking directly on the 3D Earth**.

Built with **Three.js**, **Natural Earth 50m TopoJSON** (bundled offline), and a custom equirectangular canvas rendering pipeline. No runtime CDN calls or external photo textures required.

---

## ✨ Features & Highlights

- **3D Interactive Globe (`src/globe.js`, `src/mapRenderer.js`)**:
  - Offline vector rendering of real Natural Earth country boundaries onto an offscreen canvas texture (2048x1024 / 4096x2048).
  - OrbitControls with realistic inertia, zoom bounds, atmosphere shader glow, and slow idle auto-rotation.
  - Dominates ≥75% of the screen across desktop, tablet, and mobile.
- **Accurate Direct Country Picking (`src/picker.js`)**:
  - Raycasts mouse or touch directly onto the 3D sphere.
  - Exact spherical-to-equirectangular projection:
    $$\text{lat} = \arcsin(y) \cdot \frac{180}{\pi}$$
    $$\theta = \text{atan2}(z, -x), \quad \text{lon} = \theta \cdot \frac{180}{\pi} - 180$$
  - Ray-casting point-in-polygon with bounding-box prefiltering and international date-line wrapping.
  - Enhanced microstate hit detection: enlarged invisible touch radii and beacon dots for small island nations (Malta, Singapore, Maldives, Monaco, Vatican City, etc.).
- **Cinematic Feedback & Flight (`src/cameraFlight.js`)**:
  - Smooth spherical interpolation (slerp) flying camera to center on the target country upon answer.
  - If answered correctly: nation lights up emerald green.
  - If answered incorrectly: nation lights up red, the player's guess is flagged, and a 3D elevated **great-circle geodesic arc** connects the two points with distance in kilometers calculated via the Haversine formula:
    $$d = 2R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos\phi_1\cos\phi_2\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$
- **Memory Vault Side/Bottom Card (`src/ui.js`)**:
  - Displays cultural anchors, landmark, flag, and capital to solidify knowledge.
  - Smart camera yaw offset ensures the country is never obscured by the card.
- **Progressive Clues & Zero-Spoiler Policy**:
  - 3 progressive clues: cultural/historical hint → distinct fact → obvious clue. Points scale with fewer clues used.
  - Strict zero-geographical-spoiler rule: no continents, oceans, mountain ranges, or compass directions in clue text.
- **Game Modes & Tiers (`src/game.js`)**:
  - **Modes**: Clue Mode (progressive hints), Country Name Mode, Flag Mode.
  - **Tiers**: Easy (~50 well-known nations), Medium (~120 nations), Hard (all 195 sovereign nations: 193 UN members + Vatican City & Palestine).
  - **Pacing**: 10 rounds, 20 rounds, or Endless. Toggleable round timer and Survival Mode (3 lives) vs Practice Mode.
- **Spaced Repetition Review**:
  - Missed nations are automatically queued again later in the session.
  - End-game screen summarizes accuracy, best streak, and allows immediate 1-click replaying of missed countries.

---

## 📁 Project Architecture

```
earth-trivia/
├── index.html              # Clean dark-space UI shell, responsive HUD, modal layers
├── package.json            # Scripts and dependencies (Three.js, topojson-client, esbuild)
├── README.md               # Documentation and guides
├── data/
│   ├── countries.json      # All 195 countries with vetted clues, anchors, landmarks
│   ├── countries.js        # ESM export of countries dataset
│   ├── tiny-countries.json # 30 microstates with enlarged hit radii & centroids
│   ├── tiny-countries.js   # ESM export of microstates
│   ├── world-50m.json      # Bundled Natural Earth 50m GeoJSON features & cached bboxes
│   └── world-50m.js        # ESM export of map features
├── scripts/
│   ├── bundleMapData.js    # Pre-processes world-atlas TopoJSON into fast GeoJSON features
│   ├── validateData.js     # Rigorous validator: checks banned words, duplicate landmarks, IDs
│   └── serve.js            # Lightweight local HTTP preview server
├── src/
│   ├── audio.js            # Web Audio API procedural sound synthesizer (no audio assets needed)
│   ├── cameraFlight.js     # Camera slerp tweening, 3D great-circle arcs, pin beacons
│   ├── game.js             # State machine: modes, tiers, lives, streak, spaced repetition
│   ├── globe.js            # Three.js scene, atmosphere shader, stars, OrbitControls
│   ├── main.js             # Application entrypoint & event coordinator
│   ├── mapRenderer.js      # Equirectangular canvas texture rendering & country polygon fill
│   ├── picker.js           # Sphere raycasting, lat/lon math, point-in-polygon test
│   └── ui.js               # Responsive HUD, clue collapsible card, Memory Vault card
└── dist/
    └── bundle.js           # Minified production bundle
```

---

## 🚀 Setup & Local Execution

### 1. Install Dependencies
```bash
cd earth-trivia
npm install
```

### 2. Validate Dataset
Run the automated validation script to verify that all 195 countries adhere to schema requirements, contain **no banned geographic spoiler words**, and have **no duplicate landmarks**:
```bash
npm run validate
```

### 3. Build Production Bundle
Compile and minify modern ES modules into `dist/bundle.js` with `esbuild`:
```bash
npm run build
```

### 4. Run Locally
Because the application uses ES modules and Web Workers / Canvas textures, serve it via an HTTP server:
```bash
# Using Node built-in script:
node scripts/serve.js

# Or using npx / python:
npx serve .
# or:
python -m http.server 8080
```
Open [http://localhost:8080](http://localhost:8080) in your browser.

---

## 🎮 How to Play

1. **Configure Expedition**: Choose Mode (*Clue*, *Name*, or *Flag*), Difficulty (*Easy*, *Medium*, or *Hard - All 195*), Rounds, and Timer/Survival preferences.
2. **Find the Nation**:
   - Rotate the Earth by dragging with mouse or touch.
   - Zoom with mouse wheel or pinch gesture.
   - Reveal more clues if stuck (costing partial score bonus).
3. **Click to Submit**:
   - Click or tap directly on the nation's borders on the globe.
   - For microstates, click directly on or near the glowing beacon dot.
4. **Learn from the Flight**:
   - The camera will automatically glide to the correct nation.
   - Learn the cultural anchors, capital, and famous landmark from the Memory Vault card.
   - If incorrect, observe the distance arc to see how close your guess was!

---

## 📜 License
MIT License. Created for interactive learning and geography education.
