import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { preview } from 'vite';
import puppeteer from 'puppeteer-core';
import { launchOptions } from './chrome.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const outDir = path.join(projectRoot, 'docs', 'visual-qa');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function waitFrames(page, count = 2) {
  await page.evaluate(
    (n) =>
      new Promise((resolve) => {
        let left = n;
        const tick = () => {
          left -= 1;
          if (left <= 0) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    count
  );
}

async function setupScenario(page, opts = {}) {
  await page.evaluate((o) => {
    const rfd = window.__rfd;
    rfd.resetGame();
    const s = rfd.state;
    s.scrap = o.scrap ?? 5000;
    s.circuits = o.circuits ?? 30;
    s.wave = o.wave ?? 5;
    s.waveState = o.waveState ?? 'active';
    s.paused = false;
    s.speed = 1;
    s.unlockedTowers = o.unlockedTowers ?? ['pulse', 'coolant', 'arc', 'rocket'];

    if (Array.isArray(o.towers)) {
      for (const t of o.towers) {
        rfd.place(t.cell, t.type);
      }
    }

    if (Array.isArray(o.enemies)) {
      for (const e of o.enemies) {
        const def = s.config.enemies.enemies[e.type];
        if (!def) continue;
        const id = `enemy_${++s.nextEnemyId}_${e.type}`;
        const hp = e.hp ?? def.hp;
        const dist = e.distance ?? 3.0;
        s.enemies.push({
          id,
          type: e.type,
          name: def.name,
          hp,
          maxHp: hp,
          speed: e.speed ?? def.speed,
          armour: def.armour,
          scrap: def.scrap,
          leakDamage: def.leakDamage,
          isBoss: !!def.isBoss,
          distance: dist,
          x: e.x ?? dist + 0.5,
          y: e.y ?? 2.5,
          slowTimer: 0,
          slowRatio: 0,
          isDead: false,
          shape: def.shape,
          color: def.color
        });
      }
    }

    rfd.ui?.renderHUD?.(rfd.snapshot());
  }, opts);
}

async function captureFxShot(page, towerType) {
  const enemies =
    towerType === 'arc'
      ? [
          { type: 'rust_walker', hp: 5000, distance: 2.7, x: 3.2, y: 2.5, speed: 0.2 },
          { type: 'rust_walker', hp: 5000, distance: 3.3, x: 3.8, y: 2.5, speed: 0.2 },
          { type: 'rust_walker', hp: 5000, distance: 3.9, x: 4.4, y: 2.5, speed: 0.2 }
        ]
      : towerType === 'pulse'
        ? [{ type: 'crusher_tank', hp: 5000, distance: 4.5, x: 5.0, y: 2.5, speed: 0.15 }]
        : [{ type: 'crusher_tank', hp: 5000, distance: 3.0, x: 3.5, y: 2.5, speed: 0.15 }];

  await setupScenario(page, {
    scrap: 5000,
    wave: 5,
    waveState: 'active',
    towers: [{ cell: { col: 3, row: 1 }, type: towerType }],
    enemies
  });

  // Clear placement 'built' FX so fxCount strictly measures combat/projectile FX
  await page.evaluate(() => {
    const rfd = window.__rfd;
    rfd.drainEvents();
    rfd.renderer?.fx?.clear?.();
  });

  // Step simulation via rAF until live combat FX count > 0 (for rocket, prefer explosion burst;
  // for pulse, wait 2 extra frames so the 0.09s bolt stretches mid-flight between tower and target)
  const fxStats = await page.evaluate(
    (type) =>
      new Promise((resolve) => {
        const rfd = window.__rfd;
        let frames = 0;
        let pulseSeenFrames = 0;
        const maxFrames = 180;

        const check = () => {
          frames += 1;
          const particles = rfd.renderer?.fx?.getParticleCount?.() ?? 0;
          const projectiles = rfd.state?.projectiles?.length ?? 0;
          const fxCount = particles + projectiles;

          let ready = false;
          if (type === 'rocket') {
            ready = particles >= 6;
          } else if (type === 'pulse') {
            if (particles > 0) pulseSeenFrames += 1;
            ready = pulseSeenFrames >= 3;
          } else {
            ready = particles > 0;
          }

          if (ready || (frames >= 90 && fxCount > 0) || frames >= maxFrames) {
            if (rfd.renderer?.fx && !window.__rfdOrigFxUpdate) {
              window.__rfdOrigFxUpdate = rfd.renderer.fx.update;
              rfd.renderer.fx.update = () => {};
            }
            resolve({ particles, projectiles, fxCount, frames });
            return;
          }
          requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
      }),
    towerType
  );

  if (!fxStats || fxStats.fxCount <= 0) {
    throw new Error(`FX assertion failed for ${towerType}: fxCount=${fxStats?.fxCount ?? 0}`);
  }

  const outPath = path.join(outDir, `fx_${towerType}.png`);
  await page.screenshot({ path: outPath });
  await page.evaluate(() => {
    const rfd = window.__rfd;
    if (rfd.renderer?.fx && window.__rfdOrigFxUpdate) {
      rfd.renderer.fx.update = window.__rfdOrigFxUpdate;
      delete window.__rfdOrigFxUpdate;
    }
  });
  console.log(
    `[visual_fix_shots] Saved fx_${towerType}.png (fxCount=${fxStats.fxCount}, particles=${fxStats.particles}, projectiles=${fxStats.projectiles}, frames=${fxStats.frames})`
  );
  return { towerType, ...fxStats, path: outPath };
}

async function main() {
  ensureDir(outDir);

  const server = await preview({
    root: projectRoot,
    preview: { port: 4173, strictPort: false }
  });
  const baseUrl = server.resolvedUrls?.local?.[0] || 'http://localhost:4173/';
  console.log(`[visual_fix_shots] Vite preview active on ${baseUrl}`);

  const browser = await puppeteer.launch(launchOptions());
  const savedPaths = [];
  const fxResults = [];

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.__rfd !== 'undefined', { timeout: 5000 });
    await page.evaluate(async () => {
      if (document.fonts) await document.fonts.ready;
    });

    // Dismiss title screen
    await page.click('#btnPlay');
    await waitFrames(page, 3);

    // 1. Capture 4 FX shots
    for (const towerType of ['pulse', 'coolant', 'arc', 'rocket']) {
      const res = await captureFxShot(page, towerType);
      fxResults.push(res);
      savedPaths.push(res.path);
    }

    // 2. Boss: Iron Sentry (W10)
    await setupScenario(page, {
      scrap: 420,
      wave: 10,
      waveState: 'active',
      towers: [
        { cell: { col: 3, row: 1 }, type: 'pulse' },
        { cell: { col: 5, row: 1 }, type: 'arc' }
      ],
      enemies: [
        { type: 'crusher_tank', distance: 2.5, x: 3.0, y: 2.5, speed: 0 },
        { type: 'iron_sentry', distance: 4.5, x: 5.0, y: 2.5, speed: 0 },
        { type: 'crusher_tank', distance: 6.5, x: 7.0, y: 2.5, speed: 0 }
      ]
    });
    await waitFrames(page, 3);
    const ironPath = path.join(outDir, 'boss_iron_sentry.png');
    await page.screenshot({ path: ironPath });
    savedPaths.push(ironPath);
    console.log('[visual_fix_shots] Saved boss_iron_sentry.png');

    // 3. Boss: Mega Mixer (W15)
    await setupScenario(page, {
      scrap: 680,
      wave: 15,
      waveState: 'active',
      towers: [
        { cell: { col: 3, row: 3 }, type: 'coolant' },
        { cell: { col: 5, row: 1 }, type: 'rocket' },
        { cell: { col: 7, row: 1 }, type: 'arc' }
      ],
      enemies: [
        { type: 'crusher_tank', distance: 3.0, x: 3.5, y: 2.5, speed: 0 },
        { type: 'mega_mixer', distance: 5.5, x: 6.0, y: 2.5, speed: 0 },
        { type: 'crusher_tank', distance: 8.0, x: 8.5, y: 2.5, speed: 0 }
      ]
    });
    await waitFrames(page, 3);
    const megaPath = path.join(outDir, 'boss_mega_mixer.png');
    await page.screenshot({ path: megaPath });
    savedPaths.push(megaPath);
    console.log('[visual_fix_shots] Saved boss_mega_mixer.png');

    // 4. Spark Drone closeup (W5)
    await setupScenario(page, {
      scrap: 240,
      wave: 5,
      waveState: 'active',
      towers: [{ cell: { col: 5, row: 1 }, type: 'pulse' }],
      enemies: [
        { type: 'spark_drone', distance: 2.5, x: 3.0, y: 2.5, speed: 0 },
        { type: 'spark_drone', distance: 3.4, x: 3.9, y: 2.5, speed: 0 },
        { type: 'spark_drone', distance: 4.3, x: 4.8, y: 2.5, speed: 0 },
        { type: 'spark_drone', distance: 5.2, x: 5.7, y: 2.5, speed: 0 }
      ]
    });
    await waitFrames(page, 3);
    const sparkPath = path.join(outDir, 'spark_drone_closeup.png');
    await page.screenshot({ path: sparkPath });
    savedPaths.push(sparkPath);
    console.log('[visual_fix_shots] Saved spark_drone_closeup.png');

    // 5. Selected tower inspect card + range ring
    await setupScenario(page, {
      scrap: 500,
      wave: 4,
      waveState: 'idle',
      towers: [{ cell: { col: 5, row: 3 }, type: 'arc' }]
    });
    await page.evaluate(() => {
      const rfd = window.__rfd;
      const t = rfd.state.towers[0];
      if (t) rfd.selectTower(t.id);
    });
    await waitFrames(page, 3);
    await new Promise((r) => setTimeout(r, 80));
    const inspectVisible = await page.evaluate(() => {
      const el = document.getElementById('inspectCard');
      return el && window.getComputedStyle(el).display !== 'none';
    });
    if (!inspectVisible) throw new Error('inspectCard did not open for selected_tower_inspect.png');
    const inspectPath = path.join(outDir, 'selected_tower_inspect.png');
    await page.screenshot({ path: inspectPath });
    savedPaths.push(inspectPath);
    console.log('[visual_fix_shots] Saved selected_tower_inspect.png');

    // 6. Build bar with unaffordable towers dimmed
    await setupScenario(page, {
      scrap: 65,
      wave: 2,
      waveState: 'idle',
      unlockedTowers: ['pulse', 'coolant', 'arc', 'rocket']
    });
    await page.evaluate(() => {
      window.__rfd.selectCell({ col: 1, row: 1 });
    });
    await waitFrames(page, 3);
    await new Promise((r) => setTimeout(r, 80));
    const buildBarVisible = await page.evaluate(() => {
      const el = document.getElementById('buildBar');
      return el && window.getComputedStyle(el).display !== 'none';
    });
    if (!buildBarVisible) throw new Error('buildBar did not open for buildbar_unaffordable.png');
    const buildBarPath = path.join(outDir, 'buildbar_unaffordable.png');
    await page.screenshot({ path: buildBarPath });
    savedPaths.push(buildBarPath);
    console.log('[visual_fix_shots] Saved buildbar_unaffordable.png');

    // 7. Workshop modal open
    await setupScenario(page, { scrap: 200, circuits: 35, wave: 3, waveState: 'idle' });
    await page.click('#btnWorkshop');
    await waitFrames(page, 3);
    await new Promise((r) => setTimeout(r, 100));
    const workshopVisible = await page.evaluate(() => {
      const el = document.getElementById('workshopModal');
      return el && window.getComputedStyle(el).display !== 'none';
    });
    if (!workshopVisible) throw new Error('workshopModal did not open for workshop_modal.png');
    const workshopPath = path.join(outDir, 'workshop_modal.png');
    await page.screenshot({ path: workshopPath });
    savedPaths.push(workshopPath);
    console.log('[visual_fix_shots] Saved workshop_modal.png');
    await page.click('#btnCloseWorkshop');
    await new Promise((r) => setTimeout(r, 60));

    // 8. Phone landscape 844x390
    await page.setViewport({ width: 844, height: 390 });
    await setupScenario(page, {
      scrap: 180,
      wave: 3,
      waveState: 'active',
      towers: [
        { cell: { col: 3, row: 1 }, type: 'pulse' },
        { cell: { col: 5, row: 3 }, type: 'coolant' }
      ],
      enemies: [
        { type: 'rust_walker', distance: 2.8, x: 3.3, y: 2.5, speed: 0 },
        { type: 'glitchbot', distance: 4.8, x: 5.3, y: 2.5, speed: 0 }
      ]
    });
    await waitFrames(page, 3);
    await new Promise((r) => setTimeout(r, 120));
    const landscapePath = path.join(outDir, 'phone_landscape_844x390.png');
    await page.screenshot({ path: landscapePath });
    savedPaths.push(landscapePath);
    console.log('[visual_fix_shots] Saved phone_landscape_844x390.png');

    // 9. Phone portrait 390x844 showing Rotate your phone overlay
    await page.setViewport({ width: 390, height: 844 });
    await setupScenario(page, { scrap: 150, wave: 1, waveState: 'idle' });
    await waitFrames(page, 3);
    await new Promise((r) => setTimeout(r, 120));
    const rotateVisible = await page.evaluate(() => {
      const overlay = document.getElementById('rotateOverlay');
      const btn = document.getElementById('btnContinuePortrait');
      return (
        overlay &&
        window.getComputedStyle(overlay).display !== 'none' &&
        btn &&
        window.getComputedStyle(btn).display !== 'none'
      );
    });
    if (!rotateVisible) {
      throw new Error('rotateOverlay + btnContinuePortrait not visible at 390x844');
    }
    const portraitPath = path.join(outDir, 'phone_portrait_390x844_overlay.png');
    await page.screenshot({ path: portraitPath });
    savedPaths.push(portraitPath);
    console.log('[visual_fix_shots] Saved phone_portrait_390x844_overlay.png');

    console.log('\n[visual_fix_shots] ALL 12 SCREENSHOTS CAPTURED SUCCESSFULLY!');
    console.log('FX Summary:', JSON.stringify(fxResults));
    console.log('Saved Paths:', JSON.stringify(savedPaths));
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error('[visual_fix_shots] FAILED:', err);
  process.exit(1);
});
