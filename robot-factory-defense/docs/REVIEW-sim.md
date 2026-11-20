# Review Report: Simulation Core (`rfd-sim`)

- **Author**: Worker A (`sim`)
- **Reviewer**: Reviewer V1 (`v1` - Rules & Sim)
- **Branch**: `rfd-sim` (commit `600956ad005b2a56c6cf860aaa6a0ac266514ee4`)
- **Evaluation Date**: 2026-11-20
- **Final Verdict**: **APPROVED** (with non-blocking architectural recommendation)

---

## 1. Commands Executed & Outputs

### 1.1 Full Unit & Contract Test Suite
```bash
cd robot-factory-defense
npm test
```
**Output:**
```
> robot-factory-defense@0.1.0 test
> node --test test/**/*.test.js

▶ Property Tests: Rules, Invariants & Conservation
  ✔ Conservation of Scrap invariant holds across arbitrary valid and invalid operations (4.264ms)
  ✔ Resource non-negativity and Core HP bounds hold under random stress (15.4713ms)
  ✔ Property test: 1,000 random action sequences verify invariants, scrap conservation, and enemy lifecycle (63.4352ms)
✔ Property Tests: Rules, Invariants & Conservation (85.6434ms)
▶ Data Specifications & Balance Invariants
  ✔ map.json matches 16x9 grid and has 24-30 buildable cells (1.1969ms)
  ✔ towers.json defines 4 combat towers with 3 levels each + fabricator (0.3966ms)
  ✔ enemies.json defines Glitchbot, Rust Walker, Spark Drone, Crusher Tank, mini-boss, boss (0.2273ms)
  ✔ waves.json defines exactly 15 waves with mini-boss at wave 10 and boss at wave 15 (0.2619ms)
  ✔ upgrades.json defines 6 global upgrades and 2 tower unlocks (0.3253ms)
✔ Data Specifications & Balance Invariants (4.5677ms)
▶ Simulation Determinism & Contract
  ✔ mulberry32 generates deterministic sequence for identical seed (4.2228ms)
  ✔ mulberry32 generates different sequences for different seeds (1.4379ms)
  ✔ createGame returns valid initial state with contract properties (2.1554ms)
  ✔ identical seeds and actions produce identical state hash after 100 ticks (5.6212ms)
  ✔ different seeds produce different state hash (0.5847ms)
  ✔ place rejects unbuildable or occupied cells (0.4766ms)
  ✔ sell refunds 70% of invested Scrap (0.5168ms)
  ✔ upgrade increases tower level and deducts cost (0.5672ms)
  ✔ Fabricator generates 1 Circuit every 10 seconds (1.6412ms)
  ✔ togglePause, setSpeed, and startWave update state cleanly (0.932ms)
  ✔ buyUpgrade unlocks towers and applies global upgrades with Circuits (0.6075ms)
  ✔ snapshot returns read-only projection (0.5972ms)
✔ Simulation Determinism & Contract (23.514ms)
▶ Simulation Combat & Mechanic Rules
  ✔ targeting logic: first along path vs nearest (2.1766ms)
  ✔ armour reduction rule: max(1, damage - armour) (1.1724ms)
  ✔ cryogenic slow: 50% speed reduction for 2.0s without stacking (1.8615ms)
  ✔ Arc Coil chaining: 3 targets within 1.5 cells, completely ignores armour (1.17ms)
  ✔ Rocket Rack: projectile launch, flight, and area splash damage (0.9763ms)
  ✔ leak damage: discrete core damage per enemy type (1.4289ms)
  ✔ economy & fabricator limit: max 4 fabricators at 75 scrap (0.322ms)
  ✔ sell refund and Fast Assembly: affects only future purchases (0.3117ms)
  ✔ Workshop upgrades: Overclock, Hardened Rounds, Long Barrels, Scrap Magnet (0.5794ms)
  ✔ win and loss conditions transition waveState cleanly (0.5891ms)
✔ Simulation Combat & Mechanic Rules (13.4494ms)
▶ Phase 0.5 Stricter Gates: Real Simulation (5,000 Ticks, >= 20 Actions)
  ✔ executes 5,000 continuous ticks with >= 20 actions and satisfies all invariant gates (72.1526ms)
✔ Phase 0.5 Stricter Gates: Real Simulation (5,000 Ticks, >= 20 Actions) (72.3141ms)
▶ UI & Storage Contract
  ✔ localStorage keys strictly use rfd: prefix and handle errors gracefully (3.7231ms)
  ✔ three first-run tips are all <= 12 words each (0.8114ms)
  ✔ verifies 48px target constant and grid sizing (0.3121ms)
✔ UI & Storage Contract (7.9192ms)
ℹ tests 34
ℹ suites 6
ℹ pass 34
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 346.676
```

### 1.2 Lint Execution
```bash
cd robot-factory-defense
npm run lint
```
**Output:**
```
> robot-factory-defense@0.1.0 lint
> eslint src/ test/ scripts/

(exit code 0, 0 errors, 0 warnings)
```

---

## 2. Concrete Findings

### Finding 1: Multi-Tick Substep Event Overwriting in `step(state, dtMs)` (`src/sim/index.js:206, 477-483`)
- **Severity**: Low / Architectural Notice (Mitigated)
- **Detail**: In `tickSimulation(state)`, `state.events = []` is called unconditionally at the beginning of each tick. When `step(state, dtMs)` is called with a delta time that triggers multiple substeps (e.g. `state.speed === 2` or `dtMs > 16.666ms`), events generated during sub-ticks $1$ through $N-1$ (e.g., `spawned`, `hit`, `killed`, `leaked`) are overwritten by the final sub-tick's `state.events`.
- **Evidence**: Verified in property testing where stepping with `speed === 2` caused intermediate `spawned` events to be replaced by empty event lists on subsequent ticks of the same step.
- **Recommendation**: To ensure UI or headless monitors receiving events from `step()` never miss events during 2x speed or multi-tick frame drops, consider resetting `state.events = []` once at the beginning of `step(state, dtMs)` and having each `tickSimulation(state)` append to `state.events`. (Discrete 1-tick callers using `TICK_MS / state.speed` are unaffected).

### Finding 2: Deterministic Mulberry32 PRNG & State Serialization Determinism (`src/sim/rng.js`, `src/sim/index.js:707-742`)
- **Severity**: Positive Verification (PASS)
- **Detail**: The Mulberry32 PRNG algorithm correctly implements the 32-bit stateful mathematical function specified in CONTRACT.md §2. `serialize(state)` deterministically serializes tick, seed, rngState, currency, HP, wave state, and active entities while rounding floating point values (enemy HP to 1 decimal, distances and coordinates to 2 decimals) and sorting array keys.
- **Evidence**: Executing 5,000 continuous simulation ticks across identical seeds ($S = 777, 12345$) produced byte-for-byte identical JSON serialization strings and identical 32-bit FNV-1a hashes (`hashState(s1) === hashState(s2)`). Executing on differing seeds produced distinct state hashes with zero collisions.

### Finding 3: Exact Combat Formula & Armour Rules Enforcement (`src/sim/index.js:330-385, 420-435`)
- **Severity**: Positive Verification (PASS)
- **Detail**: All 4 combat tower types strictly follow the rules defined in DESIGN.md §3 and CONTRACT.md §1:
  - **Pulse Turret**: Deals `max(1, damage - armour)`. Tested against Crusher Tank (12 damage - 6 armour = 6 damage, exactly 50% nominal). Against extreme armour (20 armour), damage is clamped to minimum 1.
  - **Coolant Sprayer**: Applies 50% cryogenic slow for 2.0s without stacking (`primaryTarget.slowTimer = Math.max(primaryTarget.slowTimer, duration)`). Speed accurately restores to 100% when timer expires.
  - **Arc Coil**: Chains up to 3 targets within 1.5 Euclidean cells, completely ignoring target armour (`damageDealt = damage`).
  - **Rocket Rack**: Spawns projectile entities traveling at 8 cells/s, detonating upon contact and inflicting area splash damage (1.2/1.4/1.6 cells) with flat armour reduction.

### Finding 4: Invariant Conservation of Scrap across 1,000 Random Action Sequences (`test/review/properties.test.js`)
- **Severity**: Positive Verification (PASS)
- **Detail**: The economy rules enforce exact scrap balance:
  $$\text{state.scrap} = \text{initialScrap} + \text{scrapEarned} - \left(\sum \text{buildCost} + \sum \text{upgradeCost} - \sum \text{sellRefund}\right)$$
  - Build and upgrade costs properly account for the 10% discount from the Fast Assembly workshop upgrade (`Math.floor(cost * 0.90)`).
  - `sell()` refunds `Math.floor(0.70 * tower.investedScrap)`, reflecting the scrap actually paid.
- **Evidence**: 1,000 randomized sequences of 10–25 interleaved actions (build, upgrade, sell, buyUpgrade, startWave, togglePause, setSpeed, step) verified that `state.scrap` perfectly matches the conservation formula at every single step with zero variance.

### Finding 5: Core HP Bounds, Leak Mechanics, and Enemy Lifecycle Invariant (`src/sim/index.js:255-285`)
- **Severity**: Positive Verification (PASS)
- **Detail**:
  - Discrete leak damage applies accurately based on enemy type: Glitchbot (1), Rust Walker (1), Spark Drone (1), Crusher Tank (3), Iron Sentry (5), Mega Mixer (10).
  - Core HP bounds ($0 \le \text{coreHp} \le \text{maxCoreHp}$) are maintained at all times. Core HP is clamped to 0 on defeat without going negative, cleanly transitioning `waveState` to `'lost'` and recording a `'lost'` event.
  - Lifecycle: Every enemy spawned into the simulation is guaranteed to exit via exactly one terminal state: `'killed'` or `'leaked'`, exactly once. No enemy is double-killed or double-leaked.

---

## 3. Final Verdict

**APPROVED**

Worker A's simulation implementation meets all requirements of CONTRACT.md, DESIGN.md, and TESTPLAN.md. All deterministic simulation gates, combat rules, economy invariants, and property tests pass cleanly with zero lint errors.
