# Technology Stack & License Verification

All runtime and development dependencies are strictly verified against their official repository `LICENSE` / `LICENSE.md` files. Only MIT, Apache-2.0, and OFL-1.1 licenses are permitted. No runtime network calls are made.

## Stack Overview

| Slot | Component | Choice | License | License File Verified | Runtime Network |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Engine / Core** | Vanilla JavaScript | ES2022 + Canvas2D | Web Standard | Native Browser W3C API | None (0 calls) |
| **Build Tool** | Bundler & Dev Server | Vite 6 | MIT | `node_modules/vite/LICENSE.md` | None |
| **Linter** | Static Analysis | ESLint 9 | MIT | `node_modules/eslint/LICENSE` | None |
| **Test Runner** | Unit / Sim Tests | `node:test` | MIT | Node.js Core License | None |
| **E2E Automation** | Browser Selfplay | `puppeteer-core` 24 | Apache-2.0 | `node_modules/puppeteer-core/package.json` | None (Local Dev Protocol) |
| **Chrome QA** | Browser Detection | `scripts/chrome.js` | MIT | Custom adapted helper | None |
| **Primary Font** | UI & Headings | Chakra Petch (OFL) | OFL-1.1 | `@fontsource/chakra-petch/LICENSE` | None (Bundled local WOFF2) |
| **Monospace Font** | Telemetry / Numbers | Space Mono (OFL) | OFL-1.1 | `@fontsource/space-mono/LICENSE` | None (Bundled local WOFF2) |
| **Visual Assets** | Procedural Rendering | All art drawn in code | MIT (Project License) | Native Procedural Code | None |

## Verification Details

1. **Vite**: MIT License by VoidZero Inc. & Vite contributors (`node_modules/vite/LICENSE.md`).
2. **ESLint**: MIT License by OpenJS Foundation (`node_modules/eslint/LICENSE`).
3. **Puppeteer-Core**: Apache-2.0 License by Chromium Authors / Google LLC (`node_modules/puppeteer-core/package.json`).
4. **Chakra Petch**: SIL Open Font License 1.1 by Cadson Demak (`@fontsource/chakra-petch/LICENSE`).
5. **Space Mono**: SIL Open Font License 1.1 by Colophon Foundry / Google Fonts (`@fontsource/space-mono/LICENSE`).
6. **All Art Drawn in Code**: Pure procedural vector rendering with geometric shapes, gradients, and chevrons under the project's MIT license, guaranteeing zero external asset loading errors, zero network calls, and instant scale-independent rasterization.
