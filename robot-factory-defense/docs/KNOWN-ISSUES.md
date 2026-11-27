# Known Issues (v0.1 -> v0.2)

1. **W5-7 difficulty spike**: Casual runs experience a sharp lethality jump across waves 5-7 before economy/upgrades stabilize.
2. **Casual `hpScale` 0.95 non-monotonic result**: Casual sensitivity at `hpScale=0.95` shows non-monotonic win-rate behavior relative to `1.0`.
3. **`balance.js` vs `sim` multiplier naming mismatch**: `scripts/balance.js` reads `scrapScale`/`hpScale` while `src/sim/` reads `scrapMultiplier`/`hpMultiplier`.
4. **Perfect-bot sensitivity step (25.3 > 25)**: Perfect-bot sensitivity step measures 25.3 pts, exceeding the 25-pt target ceiling.
5. **Portrait grid cells 24px (`rotate-overlay` workaround)**: Narrow mobile portrait viewports (`390x844`) yield ~24px grid cells; mitigated in v0.1 via a "Rotate your phone" overlay with "Continue anyway" and `0.5 * cellSize` pad snapping.
6. **Stress p95 17 ms (small headroom)**: Puppeteer 4x-CPU-throttled stress benchmark measures p95 = 17.00 ms against the 20.00 ms budget, leaving ~3 ms headroom.
