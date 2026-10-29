# 🎮 Matrixfall

> A modern, dark glassmorphic falling blocks game built with pure HTML5, CSS3, and Vanilla JavaScript. Zero external libraries, zero frameworks, 100% self-contained

[![Play Live](https://img.shields.io/badge/Play_Live-GitHub_Pages-06b6d4?style=for-the-badge&logo=github)](https://vaishnavkk.github.io/Games/)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![Vanilla JS](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

---

## 🕹️ Live Demo

Play instantly in your browser:
👉 **[https://vaishnavkk.github.io/Games/](https://vaishnavkk.github.io/Games/)**

---

## ✨ Features

### 🌌 Dark Frosted Glassmorphism
- **Atmosphere**: Deep radial slate gradient (`#1a1f35` to `#0b0f19`) illuminated by floating ambient glowing orbs.
- **Panels**: Translucent frosted glass (`backdrop-filter: blur(16px)`) with crisp borders and soft outer shadows.
- **Tetrominoes**: Sleek glass tiles rendered with an inner highlight border, translucent core, and colored glow.
- **Retina Scaling**: Dual-buffered HiDPI canvas rendering automatically tailored to your device's pixel ratio.

### ⚡ Matrix Surge
- Clearing rows charges the **Surge Meter** by 25% per line cleared.
- Once the meter reaches **100%**, press **`E`** to activate **Matrix Surge for 7 seconds**:
  - Drops drop speed to **20%** (bullet-time slow motion).
  - Instantly **vaporizes the bottom-most row of blocks** into upward-drifting luminous particles to rescue you from tight stacks.
  - The board border pulses with a radiant cyan and violet aura.

### ⚛ Quantum Phase Blocks
- Every 10th block spawned is a **Quantum Phase Block** with an intense pulsing cyan-white glow and floating indicator badge.
- Phase blocks **ignore collisions with locked blocks** while falling, allowing you to slide through covered overhangs to fill deep buried cavities.
- Hard-dropping or soft-dropping locks the piece safely into the nearest free spot.

### 🎯 Combo Multipliers & Particle Juice
- Clearing lines consecutively increments the **Combo Multiplier** (`1x`, `2x`, `3x`...).
- Awards bonus points: `50 × combo × level`.
- Dynamic screen-nudge effects and canvas glass shard bursts accompany every clear.

### 💾 Saved Piece Slot
- Store any active piece into the **Saved Piece** slot using `C` or `Shift` and swap it back whenever needed (once per drop).

---

## ⌨️ Controls & Mobile Support

### Desktop Keyboard
| Key | Action | Reward / Notes |
| :--- | :--- | :--- |
| <kbd>←</kbd> <kbd>→</kbd> | **Move Left / Right** | Responsive horizontal shift |
| <kbd>↑</kbd> or <kbd>X</kbd> | **Rotate Clockwise** | Safe horizontal wall-kick tests |
| <kbd>↓</kbd> | **Soft Drop** | Accelerated descent (**+1 point** per cell) |
| <kbd>Space</kbd> | **Hard Drop** | Instant lock (**+2 points** per cell) |
| <kbd>C</kbd> or <kbd>Shift</kbd> | **Save Piece** | Store/swap active piece into reserve |
| <kbd>E</kbd> | **Matrix Surge** | Trigger when Surge Meter reaches 100% |
| <kbd>P</kbd> or <kbd>Esc</kbd> | **Pause / Resume** | Toggle pause overlay or click top ⏸ button |

### 📱 Mobile & Gesture Controls
- **Direct Board Gestures**:
  - 👈 **Swipe Left**: Steer active block one cell left.
  - 👉 **Swipe Right**: Steer active block one cell right.
  - 👆 **Single Tap**: Rotate falling piece clockwise.
  - ✌️ **Double Tap**: Fast drop piece instantly to the bottom (Hard Drop).
  - 👇 **Drag Down**: Accelerate downward descent (Soft Drop).
  - ☝️ **Swipe Up**: Quick-store active piece into Saved/Hold slot.
- **Ergonomic Virtual Touch Pad**: Dedicated bottom bar with Left (◀), Rotate (↻), Right (▶), Hold (💾), Soft Drop (▼), Hard Drop (⬇), and Surge (⚡).
- **Auto-Repeat (DAS)**: Hold left, right, or soft drop for continuous high-speed movement.
- **Haptic Feedback**: Tactile micro-vibrations on moves, rotations, drops, and clears.
- **Dynamic Viewport Fit**: Perfectly adapts to modern smartphones (`100dvh`), eliminating page scrolling.
- **Compact Mobile HUD**: Sleek glass cards for Hold, Score, Level, Lines, Surge %, and Next previews.
- **Lock Delay System**: 0.5s placement buffer allowing micro-adjustments before pieces lock.

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
- **CSS3**: Backdrop-filter glassmorphism, flexbox dashboard, ambient orb animations
- **JavaScript**: Pure Vanilla ES6+, `requestAnimationFrame` delta-time loop, 7-bag randomizer, safe wall-kick rotation matrix

---

## 📄 License

Open source and free to use under the [MIT License](LICENSE).
