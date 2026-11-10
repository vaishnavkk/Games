# 🎮 Web Games Collection

> An arcade collection of high-performance web games built with pure HTML5, CSS3, modern JavaScript, and WebGL. Fast, responsive, dark glassmorphic UI, and 100% self-contained with zero runtime dependencies.

[![Play Arcade](https://img.shields.io/badge/Play_Arcade-GitHub_Pages-06b6d4?style=for-the-badge&logo=github)](https://vaishnavkk.github.io/Games/)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-000000?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)

---

## 🕹️ Play Instantly

| Game | Platform / Category | Description | Play Link |
| :--- | :--- | :--- | :--- |
| 🎮 **Arcade Hub** | Portal / Launcher | Unified glassmorphic game selector & specs dashboard | **[Launch Arcade](https://vaishnavkk.github.io/Games/)** |
| 🧱 **Matrixfall** | 2D Canvas Arcade | Dark glassmorphic falling blocks with Matrix Surge, Quantum Phase Blocks & Dynamic Speed | **[Play Matrixfall](https://vaishnavkk.github.io/Games/matrix-fall/)** |
| 🌍 **GeoTrivia: Earth Explorer** | 3D WebGL Globe | Interactive 3D Earth trivia with cinematic fly-to zoom, 195 nations & Memory Anchors | **[Play GeoTrivia](https://vaishnavkk.github.io/Games/earth-trivia/)** |

---

## 📁 Repository Structure

```
Games/
├── index.html                   # 🎮 Unified Arcade Portal & Game Selector
├── LICENSE                      # MIT Open Source License
├── README.md                    # Root Documentation (this file)
│
├── matrix-fall/                 # 🧱 Game 1: Matrixfall
│   ├── index.html               # 100% self-contained game (Canvas + Audio + CSS)
│   └── README.md                # Game guide, controls, surge mechanics & scoring
│
├── earth-trivia/                # 🌍 Game 2: GeoTrivia — Earth Explorer
│   ├── index.html               # Game shell, UI HUD, modals & design tokens
│   ├── README.md                # 3D globe architecture, math formulas & data schema
│   ├── package.json             # Build and verification scripts
│   ├── data/                    # Offline 195-nation dataset & Natural Earth 50m TopoJSON
│   ├── dist/                    # Production bundle (esbuild)
│   ├── scripts/                 # Pre-commit validators, clue scanners & QA test suite
│   ├── src/                     # Modular source code (Three.js globe, picker, UI, audio)
│   └── vendor/                  # Localized offline fonts and SVG flag assets
│
├── matrixfall/                  # ↪️ Direct URL redirect alias to /matrix-fall/
│   └── index.html
└── geotrivia/                   # ↪️ Direct URL redirect alias to /earth-trivia/
    └── index.html
```

---

## 🧱 Game 1: Matrixfall

A dark frosted glassmorphic falling blocks game built with dual-buffered canvas rendering.

### ✨ Key Features
- **Dark Frosted Glassmorphism**: Deep radial slate gradient (`#1a1f35` to `#0b0f19`) with translucent frosted glass panels and glowing ambient lights.
- **⚡ Matrix Surge**: Clearing rows charges the Surge Meter. At 100%, trigger Matrix Surge (<kbd>E</kbd>) to enter 20% bullet-time speed and instantly vaporize the bottom stack row.
- **✨ Quantum Phase Blocks**: Every 10th block passes completely through existing solid blocks to fill deep buried cavities with a dedicated cyan ghost preview and 16-particle solidification burst.
- **🚀 Dynamic Speed Acceleration**: Fall tempo accelerates with every block placed and on **every row destroyed** (with a `.speed-pulse` HUD notification).
- **📱 Mobile Gestures & Virtual Pad**: Full touch gesture support (swipe left/right, single tap rotate, double tap hard drop, drag down soft drop, swipe up save) plus on-screen touch controls.
- **🎵 Synthesized Audio**: Built-in Web Audio API sound synthesis with zero external audio dependencies.

### 🕹️ Quick Controls
| Key | Action |
| :--- | :--- |
| <kbd>←</kbd> <kbd>→</kbd> / <kbd>A</kbd> <kbd>D</kbd> | Move Left / Right |
| <kbd>↑</kbd> / <kbd>W</kbd> / <kbd>X</kbd> | Rotate Clockwise |
| <kbd>Z</kbd> | Rotate Counter-Clockwise |
| <kbd>↓</kbd> / <kbd>S</kbd> | Soft Drop (+1 pt/cell) |
| <kbd>Space</kbd> | Hard Drop (+2 pts/cell) |
| <kbd>C</kbd> / <kbd>Shift</kbd> | Hold / Save Piece |
| <kbd>E</kbd> | Trigger Matrix Surge |
| <kbd>P</kbd> / <kbd>Esc</kbd> | Pause / Resume |

👉 *Full details, scoring tables, and strategy tips in the [Matrixfall README](matrix-fall/README.md).*

---

## 🌍 Game 2: GeoTrivia — Earth Explorer

An interactive 3D WebGL Globe trivia experience designed to test geography knowledge and help players permanently remember world nations through unforgettable cultural anchors.

### ✨ Key Features
- **Interactive 3D Earth Globe**: Smooth orbital controls (drag to rotate, pinch/scroll to zoom) with atmospheric rim shaders, starfields, and real-time cartographic rasterization (8192×4096) powered by Three.js.
- **Cinematic Fly-To Zoom**: When an answer is submitted, the camera takes orbital flight, smoothly rotating along the shortest great-circle trajectory and zooming directly to the country.
- **Sovereign Cartographic Accuracy**: Survey of India official sovereign boundaries (complete integration of Jammu & Kashmir, Ladakh, Aksai Chin, Siachen, and Arunachal Pradesh with zero disputed overlay strokes).
- **Educational Memory Vault**:
  - Unlocked after each identification to cement knowledge:
    - 🏛️ **Iconic Wonder**: Unforgettable landmarks and UNESCO World Heritage sites.
    - 🍲 **Taste & Tradition**: Signature cultural dishes and heritage.
    - 🧠 **Memory Anchor**: Surprising historical trivia, current affairs, and geographical facts.
    - 📋 **Rich Country Dossier**: Official sovereign title, capital, subregion, population, area, languages, and neighbors.
- **Precision Distance & Maps Routing**:
  - Displays exact boundary distance in kilometers and miles.
  - High-DPI 3D globe distance badge with dynamic zoom scaling.
  - One-click direct links to **Google Maps** and **OpenStreetMap** to inspect real-world routes and terrain.
- **Free Clue System**: Take up to 3 clues freely per round without penalty; score potential stays at 800 pts.
- **Game Modes**: Clues Mode, Country Names Mode, and Flag Mode across Easy (42 nations), Medium (100 nations), and Hard (195 sovereign nations).

👉 *Full details, architecture documentation, and test gates in the [GeoTrivia README](earth-trivia/README.md).*

---

## 🚀 Running Locally

No complex dependencies, servers, or compilers required:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/vaishnavkk/Games.git
   cd Games
   ```

2. **Run any game directly**:
   - **Arcade Hub**: Double-click `index.html`
   - **Matrixfall**: Open `matrix-fall/index.html` in your browser
   - **GeoTrivia**: Open `earth-trivia/index.html` in your browser

3. **Or run with a local lightweight server**:
   ```bash
   # Using Python 3
   python -m http.server 8080
   # Then visit http://localhost:8080
   ```

---

## 🛠️ Technical Stack

- **HTML5 & CSS3**: Glassmorphic backdrop filters, responsive CSS grid/flexbox, custom animations
- **JavaScript (ES6+)**: Delta-time game loops, SRS wall-kick algorithms, modular architecture
- **Three.js & WebGL**: 3D globe geometry, shaders, orbital controls, and spherical camera interpolation
- **Web Audio API**: Procedural sound synthesis across both games—zero external MP3/WAV files

---

## 📄 License

Open source and free to use under the [MIT License](LICENSE).
