---
name: Bug Report
about: Create a report to help us improve GeoTrivia
title: '[BUG] '
labels: bug
assignees: ''
---

### Bug Description
A clear and concise description of what the bug is.

### Environment & Settings
- **Viewport**: (e.g., Desktop `1440x900`, Mobile `390x844`, Tablet `768x1024`, or small `360x740`)
- **Game Mode**: (e.g., `Clues`, `Country Names`, `Flag Mode`)
- **Difficulty Tier**: (e.g., `Easy`, `Medium`, `Hard`)
- **Timer**: (e.g., `25s Timer Enabled` or `Relaxed Timer Off`)
- **Endless Mode**: (e.g., `Standard 10 Rounds`, `25 Rounds`, `Endless`)
- **PRNG Seed**: (e.g., `725868` from footer or URL)
- **Browser & OS**: (e.g., Chrome 130 on Windows 11 / Safari on iOS 18)

### Reproduction Command (Puppeteer Selfplay)
Run this command from `earth-trivia` to reproduce the exact state:
```bash
npm run selfplay -- --config=<mode>-<tier>-<width>x<height> --seed=<seed>
```

### Steps to Reproduce
1. Start game on mode '...' and tier '...'
2. Play round '...'
3. Click on '...'
4. See unexpected error or visual glitch

### Expected Behavior
A clear and concise description of what you expected to happen.

### Actual Behavior / Screenshots
What actually happened (attach screenshot or copy console logs if available).
