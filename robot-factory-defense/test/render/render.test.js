import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createRenderer } from '../../src/render/index.js';
import { getEnemySprite, drawEnemyIcon } from '../../src/render/icons.js';

function createMockCtx(recordDrawImages = false) {
  const calls = [];
  const drawnImages = [];
  return {
    calls,
    drawnImages,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    save() { calls.push('save'); },
    restore() { calls.push('restore'); },
    translate(x, y) { calls.push(['translate', x, y]); },
    rotate(a) { calls.push(['rotate', a]); },
    clip() { calls.push('clip'); },
    setLineDash(d) { calls.push(['setLineDash', d]); },
    beginPath() { calls.push('beginPath'); },
    closePath() { calls.push('closePath'); },
    moveTo(x, y) { calls.push(['moveTo', x, y]); },
    lineTo(x, y) { calls.push(['lineTo', x, y]); },
    arc(x, y, r) { calls.push(['arc', x, y, r]); },
    rect(x, y, w, h) { calls.push(['rect', x, y, w, h]); },
    stroke() { calls.push('stroke'); },
    fill() { calls.push('fill'); },
    fillRect(x, y, w, h) { calls.push(['fillRect', x, y, w, h]); },
    strokeRect(x, y, w, h) { calls.push(['strokeRect', x, y, w, h]); },
    fillText(text, x, y) { calls.push(['fillText', text, x, y]); },
    drawImage(img, x, y) {
      if (recordDrawImages) drawnImages.push({ img, x, y });
      calls.push(['drawImage', img, x, y]);
    }
  };
}

function createFakeCanvas(recordDrawImages = false) {
  const ctx = createMockCtx(recordDrawImages);
  return {
    width: 960,
    height: 540,
    _ctx: ctx,
    getContext: () => ctx
  };
}

function withFakeDocument(fn) {
  const prevDoc = globalThis.document;
  globalThis.document = {
    createElement: (tag) => {
      if (tag === 'canvas') return createFakeCanvas(false);
      return {};
    }
  };
  try {
    return fn();
  } finally {
    globalThis.document = prevDoc;
  }
}

function makeSnapshot(overrides = {}) {
  return {
    paused: false,
    speed: 1,
    towers: [],
    enemies: [],
    projectiles: [],
    events: [],
    purchasedUpgrades: [],
    config: {
      map: {
        grid: { cols: 16, rows: 9 },
        core: { position: { col: 15, row: 7 } }
      },
      towers: { towers: {} }
    },
    ...overrides
  };
}

describe('Renderer & Procedural Icons (src/render)', () => {
  it('clears enemy hit flash after > 80ms so no enemy stays washed-out', () => {
    withFakeDocument(() => {
      let nowMs = 1000;
      const nowMock = mock.method(performance, 'now', () => nowMs);
      try {
        const canvas = createFakeCanvas(true);
        const renderer = createRenderer(canvas);
        const enemy = { id: 42, type: 'crusher_tank', x: 3.5, y: 2.5, hp: 80, maxHp: 100 };
        const sprite = getEnemySprite('crusher_tank', 60);

        // Trigger hit flash at t = 1000ms
        renderer.fx.handleEvents([{ type: 'hit', enemyId: 42 }], makeSnapshot({ enemies: [enemy] }), 60);
        assert.equal(renderer.fx.hasHitFlash(42), true);

        canvas._ctx.drawnImages.length = 0;
        renderer.render(makeSnapshot({ enemies: [enemy] }));
        assert.ok(
          canvas._ctx.drawnImages.some(d => d.img === sprite.flashCanvas),
          'Expected flashCanvas to be drawn immediately on hit'
        );

        // At +50ms (<= 80ms), flash is still active
        nowMs = 1050;
        canvas._ctx.drawnImages.length = 0;
        renderer.render(makeSnapshot({ enemies: [enemy] }));
        assert.ok(
          canvas._ctx.drawnImages.some(d => d.img === sprite.flashCanvas),
          'Expected flashCanvas to remain active at 50ms'
        );

        // At +90ms (> 80ms), hit flash must be cleared and normal sprite drawn
        nowMs = 1090;
        canvas._ctx.drawnImages.length = 0;
        renderer.render(makeSnapshot({ enemies: [enemy] }));
        assert.ok(
          !canvas._ctx.drawnImages.some(d => d.img === sprite.flashCanvas),
          'Expected flashCanvas NOT to be drawn after > 80ms'
        );
        assert.ok(
          canvas._ctx.drawnImages.some(d => d.img === sprite.canvas),
          'Expected normal sprite.canvas to be drawn after > 80ms'
        );
      } finally {
        nowMock.mock.restore();
      }
    });
  });

  it('renders icy blue tint and procedural snowflake pip when enemy.slowTimer > 0', () => {
    withFakeDocument(() => {
      const canvas = createFakeCanvas(true);
      const renderer = createRenderer(canvas);
      const enemy = { id: 7, type: 'rust_walker', x: 4.5, y: 2.5, hp: 40, maxHp: 40, slowTimer: 1.5 };
      const sprite = getEnemySprite('rust_walker', 60);

      renderer.render(makeSnapshot({ enemies: [enemy] }));

      assert.ok(
        canvas._ctx.drawnImages.some(d => d.img === sprite.slowCanvas),
        'Expected icy blue slowCanvas tint when slowTimer > 0'
      );
      // Frost ring arc + 3 crossed lines (moveTo/lineTo) for snowflake pip
      const arcs = canvas._ctx.calls.filter(c => Array.isArray(c) && c[0] === 'arc');
      const moveTos = canvas._ctx.calls.filter(c => Array.isArray(c) && c[0] === 'moveTo');
      assert.ok(arcs.length >= 1, 'Expected frost ring arc for slowed enemy');
      assert.ok(moveTos.length >= 3, 'Expected 3-axis procedural snowflake pip for slowed enemy');

      // Standalone drawEnemyIcon with slowed = true also uses slowCanvas
      const standaloneCtx = createMockCtx(true);
      drawEnemyIcon(standaloneCtx, enemy, 100, 100, 60, 1, true, false);
      assert.equal(standaloneCtx.drawnImages[0].img, sprite.slowCanvas);
    });
  });

  it('clears stale selectedCell when a tower is placed on that cell', () => {
    withFakeDocument(() => {
      const canvas = createFakeCanvas(false);
      const renderer = createRenderer(canvas);

      // Select empty buildable cell (1, 1) -> range circle dashed stroke is drawn
      renderer.setSelectedCell({ col: 1, row: 1 });
      renderer.render(makeSnapshot({ towers: [] }));
      assert.ok(
        canvas._ctx.calls.some(c => Array.isArray(c) && c[0] === 'setLineDash'),
        'Expected range preview dashed ring when empty cell is selected'
      );

      // Now cell (1, 1) has a placed tower -> stale selectedCell must clear automatically
      canvas._ctx.calls.length = 0;
      renderer.render(makeSnapshot({
        towers: [{ id: 1, type: 'pulse', col: 1, row: 1, level: 1, cooldown: 0 }]
      }));
      assert.ok(
        !canvas._ctx.calls.some(c => Array.isArray(c) && c[0] === 'setLineDash'),
        'Expected no stale range preview ring once a tower occupies selectedCell'
      );
    });
  });

  it('renders iron_sentry and mega_mixer visibly bigger than crusher_tank and distinct spark_drone vs glitchbot', () => {
    withFakeDocument(() => {
      const crusher = getEnemySprite('crusher_tank', 60);
      const sentry = getEnemySprite('iron_sentry', 60);
      const mixer = getEnemySprite('mega_mixer', 60);
      const glitch = getEnemySprite('glitchbot', 60);
      const drone = getEnemySprite('spark_drone', 60);

      assert.ok(sentry.dim > crusher.dim, `iron_sentry dim (${sentry.dim}) must exceed crusher_tank (${crusher.dim})`);
      assert.ok(mixer.dim > crusher.dim, `mega_mixer dim (${mixer.dim}) must exceed crusher_tank (${crusher.dim})`);
      assert.notEqual(drone.canvas, glitch.canvas);
    });
  });
});
