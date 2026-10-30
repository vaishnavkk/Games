# 🕹️ Web Games Collection

> An arcade collection of web games built with pure HTML5, CSS3, modern JavaScript, and WebGL. Fast, responsive, dark glassmorphic UI, and 100% self-contained.

[![Play Live](https://img.shields.io/badge/Play_Arcade-GitHub_Pages-06b6d4?style=for-the-badge&logo=github)](https://vaishnavkk.github.io/Games/)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-000000?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)

---

## 🚀 Play Instantly

| Game | Description | Play Link |
| :--- | :--- | :--- |
| 🎮 **Matrixfall** | Dark glassmorphic falling blocks with Matrix Surge, Quantum Phase Blocks & Dynamic Acceleration | 👉 **[Play Matrixfall](https://vaishnavkk.github.io/Games/)** |
| 🌍 **GeoTrivia: Earth Explorer** | Interactive 3D WebGL Globe geography trivia with cinematic fly-to zoom & educational Memory Anchors | 👉 **[Play GeoTrivia](https://vaishnavkk.github.io/Games/earth-trivia/)** |

---

## 🌍 Game 2: GeoTrivia — Earth Explorer

An interactive 3D WebGL Globe trivia experience designed to test geography knowledge and help players permanently remember world nations through unforgettable cultural anchors.

### ✨ Key Features
- **Interactive 3D Earth Globe**: Smooth orbital controls (drag to rotate, pinch/scroll to zoom) with atmospheric glow, starfields, and real-time day/night lighting powered by Three.js.
- **Cinematic Fly-To Zoom**: When an answer is submitted (or missed), the camera takes orbital flight, smoothly rotating and zooming directly to the country's coordinates on the globe.
- **3D Surface Beacons**: Target countries light up with pulsing holographic rings and upward vertical light beams on the sphere's surface.
- **Educational Memory Vault (Study & Remember)**:
  - When an answer is incorrect, the game swoops into the nation and unlocks a **Memory Vault Card**.
  - Highlights:
    - 🏛️ **Iconic Wonder**: Unforgettable landmarks and natural phenomena.
    - 🍲 **Taste & Tradition**: Signature cultural dishes and heritage.
    - 🧠 **Memory Anchor**: Surprising, memorable trivia designed so players never forget the nation again.
- **Progressive Clues**: Each round offers 3 distinct clues (Geography, Iconic Landmark, Culture) plus an optional **Secret Hint**.
- **Synthesized Audio**: Web Audio API sound synthesis for camera swooshes, success arpeggios, and educational chords—zero external audio dependencies.
- **Mobile Responsive**: Ergonomic touch controls and compact layout optimized for mobile screens.

---

## 🎮 Game 1: Matrixfall

A dark glassmorphic falling blocks game built with dual-buffered canvas rendering.

### ✨ Key Features
- **Dark Frosted Glassmorphism**: Deep radial slate gradient (`#1a1f35` to `#0b0f19`) with translucent frosted glass panels and glowing ambient orbs.
- **Matrix Surge**: Clearing rows charges the Surge Meter. At 100%, trigger Matrix Surge to enter 20% bullet-time speed and vaporize the bottom stack row.
- **Quantum Phase Blocks**: Every 10th block passes completely through existing solid blocks to fill deep buried cavities with a dedicated cyan ghost preview and 16-particle solidification burst.
- **Speed Acceleration**: Fall tempo accelerates with every block placed and on **every row destroyed** (with a `.speed-pulse` HUD notification).
- **Mobile Gestures & Virtual Pad**: Full touch gesture support (swipe left/right, single tap rotate, double tap hard drop, drag down soft drop, swipe up save) plus on-screen touch controls.

---

## ⌨️ Matrixfall Controls

### Desktop Keyboard
| Key | Action | Reward / Notes |
| :--- | :--- | :--- |
| <kbd>←</kbd> <kbd>→</kbd> | **Move Left / Right** | Responsive horizontal shift |
| <kbd>↑</kbd> or <kbd>X</kbd> | **Rotate Clockwise** | Safe horizontal wall-kick tests |
| <kbd>↓</kbd> | **Soft Drop** | Accelerated descent (**+1 pt** / cell) |
| <kbd>Space</kbd> | **Hard Drop** | Instant lock (**+2 pts** / cell) |
| <kbd>C</kbd> or <kbd>Shift</kbd> | **Save Piece** | Store/swap active piece into reserve |
| <kbd>E</kbd> | **Matrix Surge** | Trigger when Surge Meter reaches 100% |
| <kbd>P</kbd> or <kbd>Esc</kbd> | **Pause / Resume** | Toggle pause overlay or click top ⏸ button |

---

## 🚀 Running Locally

No build tools or web servers required:

1. Clone the repository:
   ```bash
   git clone https://github.com/vaishnavkk/Games.git
   cd Games
   ```
2. Open either game in your browser:
   - **Matrixfall**: Double-click `index.html`
   - **GeoTrivia**: Double-click `earth-trivia/index.html`

---

## 🛠️ Tech Stack

- **HTML5 & CSS3**: Semantic layouts, glassmorphic backdrop filters, custom animations
- **JavaScript (ES6+)**: Pure vanilla game engines, delta-time game loops, Web Audio API
- **Three.js & WebGL**: 3D globe geometry, shaders, orbital controls, and spherical camera interpolation
- **Tween.js**: Smooth cubic easing for camera flight trajectories

---

## 📄 License

Open source and free to use under the [MIT License](LICENSE).
