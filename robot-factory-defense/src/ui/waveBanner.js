import wavesData from '../data/waves.json' with { type: 'json' };
import enemiesData from '../data/enemies.json' with { type: 'json' };

const PLURAL_NAMES = {
  glitchbot: 'Glitchbots',
  rust_walker: 'Rust Walkers',
  spark_drone: 'Spark Drones',
  crusher_tank: 'Crusher Tanks',
  iron_sentry: 'Iron Sentry',
  mega_mixer: 'Mega Mixer'
};

export function isBossWave(waveNum, waveDef, enemiesConfig = enemiesData) {
  if (waveNum === 10 || waveNum === 15) return true;
  if (waveDef?.isBoss) return true;
  const spawns = waveDef?.spawns || [];
  return spawns.some(s => Boolean(enemiesConfig?.enemies?.[s.type]?.isBoss));
}

export function formatWaveBannerTitle(waveNum, waveDef, enemiesConfig = enemiesData) {
  const spawns = waveDef?.spawns || [];
  const boss = isBossWave(waveNum, waveDef, enemiesConfig);

  if (boss) {
    const bossSpawn = [...spawns].reverse().find(s => enemiesConfig?.enemies?.[s.type]?.isBoss);
    const bossName = bossSpawn
      ? (enemiesConfig?.enemies?.[bossSpawn.type]?.name || PLURAL_NAMES[bossSpawn.type] || 'Boss')
      : (waveNum === 15 ? 'Mega Mixer' : 'Iron Sentry');
    return `BOSS WAVE ${waveNum}: ${bossName}`;
  }

  if (spawns.length === 0) {
    return `WAVE ${waveNum}`;
  }

  const counts = new Map();
  for (const s of spawns) {
    counts.set(s.type, (counts.get(s.type) || 0) + (s.count || 0));
  }

  let featuredType = spawns[0].type;
  if (counts.has('crusher_tank')) {
    featuredType = 'crusher_tank';
  } else {
    let maxCount = -1;
    for (const [type, count] of counts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        featuredType = type;
      }
    }
  }

  const label = PLURAL_NAMES[featuredType] || enemiesConfig?.enemies?.[featuredType]?.name || featuredType;
  return `WAVE ${waveNum}: ${label}`;
}

export function createWaveBanner(callbacks = {}) {
  const banner = document.createElement('div');
  banner.className = 'wave-banner';
  banner.id = 'waveBanner';
  banner.setAttribute('data-testid', 'wave-banner');
  banner.setAttribute('role', 'status');
  banner.setAttribute('aria-live', 'polite');
  banner.style.display = 'none';

  const badge = document.createElement('span');
  badge.className = 'wave-banner-badge';
  badge.textContent = 'INCOMING';

  const title = document.createElement('span');
  title.className = 'wave-banner-title';
  title.id = 'waveBannerTitle';

  banner.appendChild(badge);
  banner.appendChild(title);

  let hideTimer = null;

  function hide() {
    if (hideTimer !== null) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    banner.style.display = 'none';
    banner.classList?.remove?.('wave-banner--active', 'wave-banner--boss');
  }

  function show(waveNum) {
    if (!Number.isFinite(waveNum) || waveNum <= 0) return;
    const wavesConfig = callbacks.getWavesConfig?.() || wavesData;
    const enemiesConfig = callbacks.getEnemiesConfig?.() || enemiesData;
    const waveDef = wavesConfig?.waves?.find(w => w.wave === waveNum) || null;
    const boss = isBossWave(waveNum, waveDef, enemiesConfig);

    hide();

    badge.textContent = boss ? 'BOSS ALERT' : 'INCOMING';
    title.textContent = formatWaveBannerTitle(waveNum, waveDef, enemiesConfig);
    banner.classList?.toggle?.('wave-banner--boss', boss);
    banner.style.display = 'flex';

    const reducedMotion = typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!reducedMotion) {
      // Force reflow so the 2s CSS fade animation restarts cleanly
      void banner.offsetWidth;
      banner.classList?.add?.('wave-banner--active');
    }

    hideTimer = setTimeout(() => {
      hide();
    }, 2000);
  }

  return {
    element: banner,
    show,
    hide
  };
}
