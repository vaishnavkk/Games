# 🧱 Matrixfall — Glassmorphic Falling Blocks

> A high-performance, dark frosted glassmorphic falling blocks game built with vanilla HTML5 dual-buffered 2D Canvas rendering and Web Audio API sound synthesis. 100% self-contained with zero external dependencies.

[![Play Live](https://img.shields.io/badge/Play_Live-GitHub_Pages-06b6d4?style=for-the-badge&logo=github)](https://vaishnavkk.github.io/Games/matrix-fall/)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

---

## 🎮 Key Features & Mechanics

- **Dark Frosted Glassmorphism**:
  - Deep slate gradient backdrop (`#1a1f35` to `#0b0f19`) with glowing ambient back-lights.
  - Translucent frosted glass panels with dynamic specular highlight borders.
- **Dual-Buffered Canvas**:
  - Main gameplay grid and preview queues rendered via custom canvas pipelines for 60+ FPS responsiveness.
- **⚡ Matrix Surge**:
  - Clearing lines fills the Surge Meter.
  - At 100%, trigger Matrix Surge (<kbd>E</kbd> or on-screen Surge button) to enter **20% bullet-time speed** and instantly vaporize the bottom row of your stack.
- **✨ Quantum Phase Blocks**:
  - Every 10th block transforms into a glowing cyan Quantum Phase Block.
  - Passes completely through existing solid blocks to fill deep, buried cavities with a dedicated cyan ghost preview and 16-particle solidification burst.
- **🚀 Dynamic Speed Acceleration**:
  - Fall tempo dynamically accelerates with every block placed and on **every line cleared** (visualized with a `.speed-pulse` HUD notification).
- **🎵 Synthesized Web Audio API**:
  - Procedural sound effects for movement, rotation, lock-down, line clears, surge activation, and game over—requiring no external MP3/WAV files.
- **📱 Mobile Gestures & Virtual Pad**:
  - Responsive layout with touch gesture support (swipe left/right, tap rotate, drag down soft drop, double tap hard drop, swipe up save) plus on-screen virtual d-pad.

---

## 🕹️ Controls Guide

### Desktop Keyboard
| Key | Action | Notes / Reward |
| :--- | :--- | :--- |
| <kbd>←</kbd> / <kbd>→</kbd> or <kbd>A</kbd> / <kbd>D</kbd> | **Move Left / Right** | Responsive horizontal shift with auto-repeat |
| <kbd>↑</kbd> or <kbd>W</kbd> / <kbd>X</kbd> | **Rotate Clockwise** | Standard SRS wall-kick rotation |
| <kbd>Z</kbd> | **Rotate Counter-Clockwise** | Reverse rotation |
| <kbd>↓</kbd> or <kbd>S</kbd> | **Soft Drop** | Accelerated descent (**+1 pt** / cell) |
| <kbd>Space</kbd> | **Hard Drop** | Instant lock down (**+2 pts** / cell) |
| <kbd>C</kbd> or <kbd>Shift</kbd> | **Hold / Save Piece** | Reserve active piece for strategic swap |
| <kbd>E</kbd> | **Activate Matrix Surge** | Usable when Surge meter is 100% full |
| <kbd>P</kbd> or <kbd>Esc</kbd> | **Pause / Resume** | Toggle pause overlay |

### Mobile Touch Controls
- **Swipe Left / Right**: Move piece horizontally
- **Tap**: Rotate piece 90° clockwise
- **Swipe Down**: Soft drop
- **Double Tap**: Instant hard drop
- **Swipe Up**: Hold piece in reserve
- **On-Screen D-Pad**: Left, Right, Rotate, Soft Drop, Hard Drop, and Hold buttons

---

## 🏆 Scoring & Multipliers

| Action | Base Score |
| :--- | :--- |
| **Single Line Clear** | 100 × Level |
| **Double Line Clear** | 300 × Level |
| **Triple Line Clear** | 500 × Level |
| **Tetris Clear (4 Lines)** | 800 × Level |
| **Soft Drop** | +1 point per cell |
| **Hard Drop** | +2 points per cell |
| **Matrix Surge Activation** | +250 bonus points |

---

## 🚀 Running Locally

No dependencies or build steps needed:

```bash
# Clone the repository
git clone https://github.com/vaishnavkk/Games.git
cd Games/matrix-fall

# Open in any modern browser
open index.html # On macOS
# or start index.html on Windows
```

---

## 📄 License

Open source and free to use under the [MIT License](../LICENSE).
