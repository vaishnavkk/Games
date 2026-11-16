# Matrixfall

Falling blocks arcade game built with vanilla HTML5 dual-buffered 2D Canvas rendering and procedural Web Audio API sound synthesis.

[![Play Live](https://img.shields.io/badge/Play_Live-GitHub_Pages-06b6d4)](https://vaishnavkk.github.io/Games/matrix-fall/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../LICENSE)

No external libraries, CDN scripts, or audio assets required at runtime.

---

## Features and Mechanics

- **Canvas Rendering**: Main gameplay grid and preview queues rendered via dual-buffered 2D canvas at display refresh rate.
- **Matrix Surge**: Clearing lines fills the Surge Meter. At 100%, trigger Matrix Surge (<kbd>E</kbd> or on-screen Surge button) to enter 20% bullet-time speed and clear the bottom row of your stack.
- **Quantum Phase Blocks**: Every 10th block transforms into a cyan Quantum Phase Block that passes through solid blocks to fill buried cavities.
- **Dynamic Speed Acceleration**: Fall tempo accelerates with every placed block and line clear.
- **Synthesized Audio**: Procedural sound effects for movement, rotation, lock-down, line clears, surge activation, and game over via Web Audio API.
- **Mobile Touch Controls**: Touch gesture support (swipe left/right, tap rotate, drag down soft drop, double tap hard drop, swipe up hold) plus on-screen virtual d-pad.

---

## Controls

### Keyboard
| Key | Action | Notes |
| :--- | :--- | :--- |
| <kbd>←</kbd> / <kbd>→</kbd> or <kbd>A</kbd> / <kbd>D</kbd> | Move Left / Right | Horizontal shift with auto-repeat |
| <kbd>↑</kbd> or <kbd>W</kbd> / <kbd>X</kbd> | Rotate Clockwise | Standard SRS wall-kick rotation |
| <kbd>Z</kbd> | Rotate Counter-Clockwise | Reverse rotation |
| <kbd>↓</kbd> or <kbd>S</kbd> | Soft Drop | Accelerated descent (+1 pt/cell) |
| <kbd>Space</kbd> | Hard Drop | Instant lock down (+2 pts/cell) |
| <kbd>C</kbd> or <kbd>Shift</kbd> | Hold / Save Piece | Reserve active piece for strategic swap |
| <kbd>E</kbd> | Activate Matrix Surge | Usable when Surge meter is 100% full |
| <kbd>P</kbd> or <kbd>Esc</kbd> | Pause / Resume | Toggle pause overlay |

### Mobile Touch Controls
- **Swipe Left / Right**: Move piece horizontally
- **Tap**: Rotate piece 90° clockwise
- **Swipe Down**: Soft drop
- **Double Tap**: Instant hard drop
- **Swipe Up**: Hold piece in reserve
- **On-Screen D-Pad**: Left, Right, Rotate, Soft Drop, Hard Drop, and Hold buttons

---

## Scoring

| Action | Score |
| :--- | :--- |
| Single Line Clear | 100 × Level |
| Double Line Clear | 300 × Level |
| Triple Line Clear | 500 × Level |
| Tetris Clear (4 Lines) | 800 × Level |
| Soft Drop | +1 point per cell |
| Hard Drop | +2 points per cell |
| Matrix Surge Activation | +250 bonus points |

---

## Running Locally

Matrixfall requires no installation, build step, or external dependencies:

```bash
cd matrix-fall

# Open index.html directly in a browser:
# On Windows:
start index.html
# On macOS:
open index.html

# Or serve locally using any HTTP server:
python -m http.server 8080
```

---

## License

Open source and free to use under the [MIT License](../LICENSE).
