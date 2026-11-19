/**
 * Mulberry32 deterministic 32-bit PRNG
 * @param {number} seed
 * @returns {(() => number) & { getState: () => number }} Returns float in [0, 1) with getState()
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  const fn = function() {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  fn.getState = () => a >>> 0;
  return fn;
}
