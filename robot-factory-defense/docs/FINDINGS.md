# Security & Adversarial Attack Findings (Red Team — Worker R)

| Finding ID | Title | Severity | Component | Status | Regression Test |
|---|---|---|---|---|---|
| SEC-001 | Unchecked null/undefined coordinates in `place()` | Medium | Sim Core (`src/sim/index.js`) | Fixed (Verified by V1) | `test/red/attack.test.js` (Attack 3) |
| SEC-002 | Unsanitized `dtMs` in `step()` poisons `accumulatorMs` with NaN | High | Sim Loop (`src/sim/index.js`) | Fixed (Verified by V1) | `test/red/attack.test.js` (Attack 3) |

---

## Detailed Reports

### SEC-001: Unchecked null/undefined coordinates in `place()`
- **Severity**: Medium
- **Status**: CLOSED
- **Attack Vector**: Passing `null` or non-numeric coordinate object to `place(state, cell, towerType)`.
- **Expected Rule**: `place()` must gracefully return `null` without throwing unhandled exceptions if `cell` is malformed, missing, or non-object.
- **Reproduce Command**:
  ```bash
  node -e "import('./src/sim/index.js').then(s => s.place(s.createGame(), null, 'pulse'))"
  ```
- **Observed Behavior (Pre-fix)**: Threw unhandled `TypeError: Cannot read properties of null (reading 'col')`.
- **Resolution**: Added input validation guard `if (!cell || typeof cell.col !== 'number' || typeof cell.row !== 'number') return null;` at start of `place()`.
- **Verification**: Verified by Reviewer V1 via `node --test test/red/attack.test.js`.

---

### SEC-002: Unsanitized `dtMs` in `step()` poisons `accumulatorMs` with NaN
- **Severity**: High
- **Status**: CLOSED
- **Attack Vector**: Passing negative, zero, or `NaN` `dtMs` to `step(state, dtMs)`.
- **Expected Rule**: `step()` must ignore non-positive or non-finite `dtMs` without altering state accumulator.
- **Reproduce Command**:
  ```bash
  node -e "import('./src/sim/index.js').then(s => { const g = s.createGame(); s.step(g, NaN); console.log(g.accumulatorMs); })"
  ```
- **Observed Behavior (Pre-fix)**: `state.accumulatorMs` became `NaN`, permanently halting simulation progression.
- **Resolution**: Added guard `if (!dtMs || dtMs <= 0 || Number.isNaN(dtMs)) return;` at start of `step()`.
- **Verification**: Verified by Reviewer V1 via `node --test test/red/attack.test.js`.

---

## Findings Summary
- **High**: 1 found / 1 fixed / 0 open
- **Medium**: 1 found / 1 fixed / 0 open
- **Low**: 0 found / 0 fixed / 0 open
- **Total**: 2 found / 2 fixed / 0 open
