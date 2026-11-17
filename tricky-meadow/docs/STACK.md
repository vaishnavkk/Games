# Technology Stack — Tricky Meadow

| Slot | Choice | Licence (file path) | Why | Rejected Alternatives |
| :--- | :--- | :--- | :--- | :--- |
| Build | Vite | MIT (`node_modules/vite/LICENSE.md`) | Smallest modern ESM bundler, base './' for Pages sub-folder, zero config | Webpack (heavy config/plugins), Parcel (heavy cache overhead), Rollup manual |
| Illustrations | Twemoji SVG | CC-BY-4.0 (`node_modules/@twemoji/svg/license`) | Clean vector SVGs, permissive license, build-time sprite packaging (~80 icons) | OpenMoji (CC-BY-SA copyleft clause), Noto (huge formats), FontAwesome (freemium) |
| Fonts | Fredoka & Patrick Hand | OFL-1.1 (`node_modules/@fontsource/fredoka/LICENSE`, `patrick-hand/LICENSE`) | Rounded, kid-friendly typography, bundled locally via Fontsource (no CDN) | Google Fonts CDN (runtime network calls), system fonts (inconsistent across OS) |
| Celebration | canvas-confetti | ISC (`node_modules/canvas-confetti/LICENSE`) | Lightweight (3 KB gzip), zero dependencies, hardware-accelerated canvas particles | Matter.js (overkill physics), tsParticles (heavy footprint) |
| Tests | puppeteer-core | Apache-2.0 (`node_modules/puppeteer-core/package.json`) | Reuses local Chrome via earth-trivia/scripts/qa/chrome.js, native node --test | Playwright (separate browser install), Cypress (heavy UI framework) |
