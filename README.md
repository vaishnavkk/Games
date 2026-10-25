# 🎮 Matrixfall

> A modern, off-white glassmorphic falling blocks game built with pure HTML5, CSS3, and Vanilla JavaScript. Zero external libraries, zero frameworks, 100% self-contained.

[![Play Live](https://img.shields.io/badge/Play_Live-GitHub_Pages-0284c7?style=for-the-badge&logo=github)](https://vaishnavkk.github.io/Games/)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![Vanilla JS](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

---

## 🕹️ Live Demo

Play instantly in your browser:
👉 **[https://vaishnavkk.github.io/Games/](https://vaishnavkk.github.io/Games/)**

---

## ✨ Features

### 💎 Off-White Frosted Glassmorphism
- **Palette**: Pristine soft off-white canvas with luminous floating ambient orbs (`#60a5fa`, `#38bdf8`, `#c084fc`, `#f472b6`).
- **Panels**: `backdrop-filter: blur(20px)` with delicate white translucent borders and subtle drop shadows.
- **Tiles**: Optical glass gemstone tiles rendered with custom canvas bevels, inner highlights, and jewel-tone glow.
- **Retina Ready**: Dual-buffered HiDPI canvas rendering automatically adapted to your device's pixel ratio.

### ⚡ Matrix Surge (Antigravity Flux)
- Clearing rows charges the **Flux Meter** by 25% per line.
- Once the meter reaches **100%**, press **`E`** to activate **Matrix Surge for 7 seconds**:
  - Drops gravity speed to **20%** (bullet-time zero-G mode).
  - Instantly **vaporizes the bottom-most row of blocks** into floating antigravity particles, lowering your stack to escape tight spots.
  - The board border radiates with a cyan and violet aura while shards float upward.

### ⚛ Quantum Phase Blocks
- Every 10th block spawned is a **Quantum Phase Block** with a prismatic rainbow aura and spinning orbital sparkles.
- Phase blocks **ignore collisions with existing locked blocks** while falling, allowing you to slide them through roofs to patch deep holes.
- Hard-dropping or locking snaps the piece cleanly to the nearest valid free space.

### 🎯 Combo Multipliers & Particle Juice
- Clearing lines consecutively builds a **Combo Multiplier** (`1x`, `2x`, `3x`...).
- Awards bonus points: `50 × combo × level`.
- Dynamic screen-nudge animations and glass particle explosions accompany every clear.

### 💾 Saved Piece (Hold Slot)
- Beginners and pros alike can park any active piece into the **Saved Piece** slot using `C` or `Shift` and swap it back when needed (once per drop).

---

## ⌨️ Controls

| Key | Action | Reward / Notes |
| :--- | :--- | :--- |
| <kbd>←</kbd> <kbd>→</kbd> | **Move Left / Right** | Precise single-column shifting |
| <kbd>↑</kbd> or <kbd>X</kbd> | **Rotate Clockwise** | Multi-point wall-kick safety checks |
| <kbd>↓</kbd> | **Soft Drop** | Fast descent (**+1 point** per cell) |
| <kbd>Space</kbd> | **Hard Drop** | Instant slam & lock (**+2 points** per cell) |
| <kbd>C</kbd> or <kbd>Shift</kbd> | **Save Piece** | Store/swap active piece into reserve |
| <kbd>E</kbd> | **Matrix Surge** | Trigger when Flux = 100% |
| <kbd>P</kbd> or <kbd>Esc</kbd> | **Pause / Resume** | Toggle pause overlay or click top ⏸ button |

---

## 🏆 Scoring System

| Move | Points |
| :--- | :--- |
| **Single Line** | `100 × Level` |
| **Double (2 lines)** | `300 × Level` |
| **Triple (3 lines)** | `500 × Level` |
| **Matrixfall (4 lines)** | `800 × Level` |
| **Cascade Combo** | `+ (50 × Combo × Level)` |
| **Soft Drop** | `+1 pt / cell` |
| **Hard Drop** | `+2 pts / cell` |

*High scores are saved automatically in your browser's `localStorage`.*

---

## 🚀 Running Locally

No installation, build tools, or web server required:

1. Clone or download the repository:
   ```bash
   git clone https://github.com/vaishnavkk/Games.git
   cd Games
   ```
2. Double-click **`index.html`** or open it in any modern browser (Chrome, Edge, Firefox, Safari).

---

## 🛠️ Tech Stack

- **HTML5**: Semantic document layout & Canvas 2D API
- **CSS3**: Modern Flexbox, CSS variables, backdrop-filter glassmorphism, keyframe particle animations
- **JavaScript**: Pure ES6+, `requestAnimationFrame` delta-time physics engine, 7-bag randomizer, safe wall-kick rotation matrix

---

## 📄 License

Open source and free to use under the [MIT License](LICENSE).
