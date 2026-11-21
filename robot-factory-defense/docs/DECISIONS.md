# Robot Factory Defense — Architecture & Design Decisions Log

This log records major architectural decisions, threshold updates, and cross-worker agreements.

- Phase 0: Initial stack, frozen contract, data schemas, 16x9 grid (28 buildable cells, 39 path cells, 4 turns).
- Phase 0.5: Boss stats (IronSentry 1200 HP / 8 arm, MegaMixer 3500 HP / 10 arm), leak damage (Glitchbot 1, RustWalker 1, SparkDrone 1, CrusherTank 3, IronSentry 5, MegaMixer 10), armour damage rule max(1, dmg - armour), circuit economy (Fabricator 10s, 75 scrap, Workshop 220 + unlocks 60), sell refund floor(70% actually paid), stricter testplan gates.
- Phase 1: Swarm build and integration. Merged Worker A (sim engine on rfd-sim), Worker B (balance model & bot runner on rfd-balance), Worker C (Canvas2D render & UI on rfd-ui), Worker D (QA selfplay & invariants on rfd-qa), Reviewer V1 (property tests and reviews on rfd-review-rules), and Reviewer V2 (UX/QA reviews and planted defect tests on rfd-review-ux). All 4 deliverables independently reviewed and APPROVED. Full verification suite: 52 unit/property tests, 18 balance matrix gates (64% competent win rate), 6/6 selftest defects caught, and smoke selfplay passing.
- Phase 2.5: Close Phase 2 verification and hardening.
  - Fix x2 event overwrite: discrete sub-ticks accumulate within `state.events` buffer; added `drainEvents(state)` API ensuring won, lost, and wave_cleared fire exactly once and counts match across 1x and 2x.
  - Contract & Targeting: Formally documented `setTowerTargetMode(state, towerId, mode)` in CONTRACT.md.
  - Canvas2D Performance Optimization: Replaced per-frame object allocations with Float32Array coordinates (`enemyX`, `enemyY`) and batched draw calls (projectiles, health bar backgrounds, health fills, slow rings). Reduced 4x-throttled frame p95 from 23-34 ms to 16.20 ms (threshold <= 20.00 ms).
  - Red Team Findings Resolved: Fixed SEC-001 (null cell input validation in `place`) and SEC-002 (NaN/infinite `dtMs` guard in `step`), all 14 adversarial attack vectors pass.
  - Reverted Vite strict mode override: removed `fs: { strict: false }` from vite.config.js, fully offline with zero external network calls.
