/**
 * Mulberry32 32-bit PRNG generator.
 * Fast, deterministic pseudo-random number generator for reproducible mock data.
 *
 * @param {number} [seed=20261007]
 * @returns {() => number} Function that generates float in [0, 1)
 */
export function mulberry32(seed = 20261007) {
  let s = seed >>> 0
  return function () {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Helper to pick a random integer in [min, max] inclusive using a PRNG.
 * @param {() => number} prng
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function randomInt(prng, min, max) {
  return Math.floor(prng() * (max - min + 1)) + min
}

/**
 * Helper to pick a random item from an array using a PRNG.
 * @template T
 * @param {() => number} prng
 * @param {T[]} list
 * @returns {T}
 */
export function randomChoice(prng, list) {
  if (!list || list.length === 0) return null
  return list[Math.floor(prng() * list.length)]
}

/**
 * Helper to return true with a given probability (0.0 to 1.0).
 * @param {() => number} prng
 * @param {number} probability
 * @returns {boolean}
 */
export function chance(prng, probability) {
  return prng() < probability
}
