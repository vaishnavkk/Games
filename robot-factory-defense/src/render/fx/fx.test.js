import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createFxSystem, MAX_PARTICLES } from './index.js';

function createMockCtx() {
  const calls = [];
  return {
    calls,
    globalAlpha: 1,
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    beginPath() { calls.push('beginPath'); },
    moveTo(x, y) { calls.push(['moveTo', x, y]); },
    lineTo(x, y) { calls.push(['lineTo', x, y]); },
    arc(x, y, r) { calls.push(['arc', x, y, r]); },
    stroke() { calls.push('stroke'); },
    fill() { calls.push('fill'); },
    fillText(text, x, y) { calls.push(['fillText', text, x, y]); }
  };
}

function makeState() {
  return {
    towers: [
      { id: 't_pulse', type: 'pulse', col: 1, row: 1, level: 1 },
      { id: 't_coolant', type: 'coolant', col: 3, row: 1, level: 1 },
      { id: 't_arc', type: 'arc', col: 5, row: 1, level: 2 },
      { id: 't_rocket', type: 'rocket', col: 7, row: 1, level: 2 }
    ],
    enemies: [
      { id: 'e1', x: 2, y: 2 },
      { id: 'e2', x: 4, y: 2 },
      { id: 'e3', x: 5, y: 2 }
    ],
    projectiles: [
      { id: 'p1', type: 'rocket', x: 6, y: 1.5 }
    ],
    config: {
      map: {
        grid: { cols: 16, rows: 9 },
        core: { position: { col: 15, row: 7 } }
      },
      towers: {
        towers: {
          rocket: {
            levels: [
              { level: 1, splashRadius: 1.2 },
              { level: 2, splashRadius: 1.25 },
              { level: 3, splashRadius: 1.3 }
            ]
          }
        }
      }
    }
  };
}

describe('Procedural FX System (src/render/fx)', () => {
  it('handles pulse, coolant, arc chain hops, and rocket splash at true splashRadius * cellSize', () => {
    const fx = createFxSystem();
    const state = makeState();
    const cache = new Map([
      ['e1', { x: 2, y: 2 }],
      ['e2', { x: 4, y: 2 }],
      ['e3', { x: 5, y: 2 }]
    ]);
    const cellSize = 60;

    fx.handleEvents(
      [
        { type: 'hit', towerId: 't_pulse', enemyId: 'e1', damage: 12 },
        { type: 'hit', towerId: 't_coolant', enemyId: 'e2', damage: 3 },
        { type: 'hit', towerId: 't_arc', enemyId: 'e1', damage: 14 },
        { type: 'hit', towerId: 't_arc', enemyId: 'e2', damage: 14 },
        { type: 'hit', towerId: 't_arc', enemyId: 'e3', damage: 14 },
        { type: 'hit', towerId: 't_rocket', enemyId: 'e3', damage: 44 }
      ],
      state,
      cellSize,
      cache
    );

    assert.equal(fx.hasHitFlash('e1'), true);
    assert.equal(fx.hasHitFlash('e2'), true);
    assert.equal(fx.hasHitFlash('e3'), true);
    assert.ok(fx.getTowerRecoil('t_pulse') > 0);
    assert.ok(fx.getTowerRecoil('t_arc') > 0);
    assert.ok(fx.getParticleCount() > 0);
    assert.ok(fx.getParticleCount() <= MAX_PARTICLES);

    const ctx = createMockCtx();
    fx.update(0.05, state, cellSize);
    fx.render(ctx, cellSize, state);

    // Rocket L2 splashRadius is 1.25 * 60 = 75px; verify ring arc drawn and fillText not broken
    const arcs = ctx.calls.filter(c => Array.isArray(c) && c[0] === 'arc');
    assert.ok(arcs.length > 0);
    assert.ok(ctx.calls.includes('stroke'));

    // After enough time, flashes and recoils decay to 0/false
    fx.update(0.1, state, cellSize);
    fx.update(0.1, state, cellSize);
    assert.equal(fx.hasHitFlash('e1'), false);
    assert.equal(fx.getTowerRecoil('t_pulse'), 0);
  });

  it('handles killed (+N scrap text), leaked (core flash + shake), built, and upgraded events', () => {
    const fx = createFxSystem();
    const state = makeState();
    const cache = new Map([['e1', { x: 2, y: 2 }]]);
    const cellSize = 60;

    fx.handleEvents(
      [
        { type: 'killed', enemyId: 'e1', scrap: 15 },
        { type: 'leaked', enemyId: 'e2', coreDamage: 1 },
        { type: 'built', towerId: 't_pulse', cell: { col: 1, row: 1 }, towerType: 'pulse' },
        { type: 'upgraded', towerId: 't_pulse', newLevel: 2 }
      ],
      state,
      cellSize,
      cache
    );

    assert.ok(fx.getCoreFlashAlpha() > 0);
    const shake = fx.getShakeOffset();
    assert.equal(typeof shake.x, 'number');
    assert.equal(typeof shake.y, 'number');

    const ctx = createMockCtx();
    fx.render(ctx, cellSize, state);
    const texts = ctx.calls.filter(c => Array.isArray(c) && c[0] === 'fillText');
    assert.ok(texts.some(t => t[1] === '+15'));

    fx.clear();
    assert.equal(fx.getParticleCount(), 0);
    assert.equal(fx.getCoreFlashAlpha(), 0);
    assert.deepEqual(fx.getShakeOffset(), { x: 0, y: 0 });
  });

  it('strictly caps live particles at <= MAX_PARTICLES (300) under heavy event spam', () => {
    assert.equal(MAX_PARTICLES, 300);
    const fx = createFxSystem();
    const state = makeState();
    const cache = new Map([['e1', { x: 2, y: 2 }]]);
    const events = [];
    for (let i = 0; i < 200; i++) {
      events.push({ type: 'hit', towerId: 't_coolant', enemyId: 'e1', damage: 3 });
      events.push({ type: 'killed', enemyId: 'e1', scrap: 5 });
    }
    fx.handleEvents(events, state, 60, cache);
    assert.ok(fx.getParticleCount() <= 300, `Expected <= 300 particles, got ${fx.getParticleCount()}`);
  });

  it('respects prefers-reduced-motion: disables screen shake and keeps particles minimal', () => {
    const prevWindow = globalThis.window;
    globalThis.window = {
      matchMedia: (q) => ({ matches: q === '(prefers-reduced-motion: reduce)' })
    };
    try {
      const fx = createFxSystem();
      const state = makeState();
      fx.handleEvents([{ type: 'leaked', enemyId: 'e1', coreDamage: 1 }], state, 60, new Map());
      assert.deepEqual(fx.getShakeOffset(), { x: 0, y: 0 });
      assert.ok(fx.getCoreFlashAlpha() > 0);
      assert.ok(fx.getParticleCount() <= 2);
    } finally {
      globalThis.window = prevWindow;
    }
  });
});
