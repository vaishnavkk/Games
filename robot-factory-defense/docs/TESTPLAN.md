# Robot Factory Defense — Verification & Test Plan (v0.1)

This test plan defines the non-negotiable verification gates enforced in Phase 1, Phase 2, and Phase 3. Never loosen a check or threshold to pass.

## 1. Simulation Determinism Gate
- **Same Seed + Same Actions**: Executing 5,000 fixed simulation ticks with identical actions on seed $S_1$ must yield the exact same 32-bit state hash across multiple runs.
- **Different Seeds Differ**: Executing on seed $S_1$ versus $S_2$ under identical actions must produce distinct state hashes.
- **Floating Point Stability**: Math operations must avoid non-deterministic order-of-operation drifts.

## 2. Invariant Gates
Across all bot simulation runs and tests:
1. **Resource Floor**: Scrap and Circuits must never drop below 0 (`scrap >= 0`, `circuits >= 0`).
2. **Core HP Bounds**: Core HP must satisfy $0 \le \text{coreHp} \le \text{maxCoreHp}$.
3. **No NaN / Infinity**: Position, velocity, damage, and cooldown fields must never contain `NaN`, `null`, or `undefined`.
4. **Enemy Lifecycle Invariant**: Every spawned enemy must terminate in exactly one exit state: either `killed` or `leaked`, exactly once.
5. **Entity Bounding**: Active enemies, projectiles, and particle arrays must never exceed upper hard limits (leak prevention).
6. **Wave Progression**: Each wave triggers `wave_cleared` at most once, and wave index increments monotonically.

## 3. Bot Matrix Gates (100 Seeds)
A matrix of automated simulation bots tests economy, pacing, and strategic depth:
- **Idle Bot** (does not build or upgrade):
  - Must lose on or before Wave 4 (`lossWave <= 4`).
- **Random Bot** (places random towers and upgrades haphazardly):
  - Median wave reached must be between Wave 3 and Wave 7 ($3 \le \text{medianWave} \le 7$).
- **Monoculture / Single-Tower-Type Bots** (builds only one tower type exclusively):
  - No single-tower bot (only Pulse, only Coolant, only Arc, or only Rocket) may achieve $> 50\%$ win rate over 100 seeds.
- **Competent Bot** (balanced strategy: builds fabricator, pulse, coolant slow, unlocks arc/rocket for armored waves):
  - Must achieve a win rate between 60% and 85% across 100 diverse random seeds ($60\% \le \text{winRate} \le 85\%$).
  - Must utilize every single tower type at least once across the winning runs.

## 4. UI & Layout Invariants (Puppeteer 320px to 1440px)
- **Viewport Span**: Tested at 320x568, 360x740, 390x844, 412x915, 568x320, 768x1024, 1024x768, 1440x900.
- **No Overlap or Clipping**: No text collisions, bounding box intersections, or off-canvas element overflows.
- **Minimum Touch Targets**: Every clickable interactive element (buttons, cells, modal dismissals) must measure $\ge 48\times 48$ CSS pixels.
- **Font & Asset Readiness**: Chakra Petch and Space Mono fonts must be loaded and verified via `document.fonts.ready`.
- **Offline Resilience**: App must run 100% locally from file/local server with zero external network requests.
- **Storage Resilience**: When `localStorage` throws (QuotaExceededError, SecurityError), gameplay continues seamlessly in memory with no unhandled exceptions.
- **Reduced Motion**: Under `@media (prefers-reduced-motion: reduce)`, rapid particle bursts and screen shakes must be suppressed.

## 5. Performance & Stress Gate
- **Stress Test**: 150 active automata and 50 projectiles on screen under $4\times$ CPU throttling in Puppeteer.
- **Frame Budget**: p95 frame processing duration must stay $\le 20$ ms (stable 50+ FPS equivalent).

## 6. Selftest Gate (6 Planted Defects)
The test runner must detect and fail on 6 planted artificial defects:
1. Negative scrap expenditure bug.
2. Core HP exceeding maximum bound.
3. Unregistered enemy leaked without event trigger.
4. Non-deterministic random call bypassing `mulberry32`.
5. Sub-48px touch target violation in HUD.
6. Contrast ratio $< 4.5:1$ on text element.
