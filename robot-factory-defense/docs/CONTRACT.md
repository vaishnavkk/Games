# Robot Factory Defense — Simulation Contract (v0.1)

This specification defines the frozen, deterministic, DOM-free simulation engine contract for Robot Factory Defense. All changes require an explicit lead sign-off and a semantic version bump.

## 1. Engine Core API

### `createGame(config, seed) -> state`
Initializes a new game simulation state:
- `config`: Optional configuration object (overrides for map, towers, waves, enemies, upgrades).
- `seed`: Integer seed for deterministic PRNG (`mulberry32`).
- Returns a mutable simulation `state`.

### `step(state, dtMs)`
Advances the simulation by real-world delta time `dtMs`.
- Simulation advances in discrete, fixed $1/60$s ($16.666$ ms) tick intervals.
- Accumulator maintains fractional time without drifting.
- When `state.paused` is true, simulation time does not advance.
- When `state.speed === 2`, tick rate runs at $2\times$ simulation speed.
- Target wave duration: 40-75 s of sim time at 1x for the competent bot (~12-20 minutes for a complete 15-wave run).

### Actions & Mechanics
Actions are deterministic state mutations invoked synchronously:
- `place(state, cell, towerType)`: Builds a tower at `{ col, row }`. Validates cell buildability, vacancy, unlocked status, and Scrap affordability. Deducts Scrap actually paid.
- `upgrade(state, towerId)`: Upgrades tower to next level. Validates level cap (max level 3), Scrap affordability. Tracks total Scrap paid.
- `sell(state, towerId)`: Destroys tower, frees cell, refunds `floor(0.70 * totalScrapPaid)` (70% of Scrap actually paid for that tower including its upgrades).
- `startWave(state)`: Spawns the next wave when state is ready (between waves, respecting wave spawn gap).
- `setSpeed(state, n)`: Sets game speed multiplier (1 or 2).
- `setTowerTargetMode(state, towerId, mode)`: Sets targeting priority for a tower ('first' for furthest along conveyor path, 'nearest' for closest distance). Defaults to 'first'.
- `buyUpgrade(state, upgradeId)`: Purchases a Workshop upgrade or tower unlock using Circuits. Fast Assembly affects only future purchases.
- `togglePause(state)`: Toggles the pause flag.
- `drainEvents(state)`: Returns and drains all accumulated events from `state.events` buffer across discrete sub-ticks.

### Combat & Leak Rules
- **Damage Formula**: `damageDealt = max(1, attackDamage - targetArmour)`. Arc Coil ignores target armour entirely.
- **Leak Damage**: When an enemy reaches the core exit, it inflicts discrete core damage based on enemy type:
  - Glitchbot: 1 core damage
  - Rust Walker: 1 core damage
  - Spark Drone: 1 core damage
  - Crusher Tank: 3 core damage
  - Iron Sentry (Wave 10 mini-boss): 5 core damage
  - Mega Mixer (Wave 15 boss): 10 core damage

### Events Buffer
Every tick, `state.events` records all events generated in that tick:
- `spawned`: `{ type: 'spawned', enemyId, enemyType, wave }`
- `hit`: `{ type: 'hit', enemyId, damage, towerId }`
- `killed`: `{ type: 'killed', enemyId, scrapReward }`
- `leaked`: `{ type: 'leaked', enemyId, coreDamage }`
- `built`: `{ type: 'built', towerId, cell, towerType }`
- `upgraded`: `{ type: 'upgraded', towerId, newLevel }`
- `sold`: `{ type: 'sold', towerId, refundScrap }`
- `wave_cleared`: `{ type: 'wave_cleared', wave, rewardScrap }`
- `won`: `{ type: 'won', score, remainingHp }`
- `lost`: `{ type: 'lost', wave, coreHp }`

### Snapshots & Serialization
- `snapshot(state)`: Returns an immutable, structured read-only projection of the current frame for rendering and UI binding without exposing internal simulation pointers.
- `serialize(state)`: Deterministic JSON serialization of canonical simulation fields (tick, seed, rngState, scrap, circuits, coreHp, wave, towers, enemies, projectiles, upgrades).
- `hashState(state)`: 32-bit FNV-1a or Murmur3 hash of the serialized string for determinism verification.

## 2. Seeded RNG (`mulberry32`)
The simulation exclusively uses a 32-bit `mulberry32` PRNG algorithm:
```js
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

## 3. Data Schemas

### `map.json`
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["grid", "core", "startScrap", "startCircuits", "pathLengthCells", "waypoints", "pathCells", "buildableCells"],
  "properties": {
    "grid": { "type": "object", "properties": { "cols": { "type": "integer" }, "rows": { "type": "integer" }, "cellSize": { "type": "integer" } } },
    "core": { "type": "object", "properties": { "hp": { "type": "integer" }, "position": { "type": "object" } } },
    "startScrap": { "type": "integer" },
    "startCircuits": { "type": "integer" },
    "pathLengthCells": { "type": "integer" },
    "waypoints": { "type": "array", "items": { "type": "object", "properties": { "col": { "type": "integer" }, "row": { "type": "integer" } } } },
    "buildableCells": { "type": "array", "items": { "type": "object", "properties": { "col": { "type": "integer" }, "row": { "type": "integer" } } } }
  }
}
```

### `towers.json`
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["sellRefundRatio", "towers"],
  "properties": {
    "sellRefundRatio": { "type": "number" },
    "towers": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "required": ["id", "name", "levels"],
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "unlockedByDefault": { "type": "boolean" },
          "unlockCircuitCost": { "type": "integer" },
          "levels": { "type": "array", "items": { "type": "object", "required": ["level", "cost", "damage", "range"] } }
        }
      }
    }
  }
}
```

### `enemies.json`
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["enemies"],
  "properties": {
    "enemies": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "required": ["id", "name", "hp", "speed", "armour", "scrap", "leakDamage"],
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "hp": { "type": "number" },
          "speed": { "type": "number" },
          "armour": { "type": "number" },
          "scrap": { "type": "integer" },
          "leakDamage": { "type": "integer" },
          "isBoss": { "type": "boolean" }
        }
      }
    }
  }
}
```

### `waves.json`
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["totalWaves", "waveSpawnGapSeconds", "waves"],
  "properties": {
    "totalWaves": { "type": "integer" },
    "waveSpawnGapSeconds": { "type": "number" },
    "targetWaveDuration": { "type": "object" },
    "waves": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["wave", "rewardScrap", "spawns"],
        "properties": {
          "wave": { "type": "integer" },
          "rewardScrap": { "type": "integer" },
          "spawns": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["type", "count", "interval", "delay"]
            }
          }
        }
      }
    }
  }
}
```

### `upgrades.json`
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["workshop"],
  "properties": {
    "workshop": {
      "type": "object",
      "required": ["unlocks", "globalUpgrades"],
      "properties": {
        "unlocks": { "type": "array" },
        "globalUpgrades": { "type": "array" }
      }
    }
  }
}
```
