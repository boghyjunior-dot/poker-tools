/**
 * A random number generator you can reproduce.
 *
 * Every pretend log in this project is built from one of these rather than
 * from `Math.random`, for two reasons: a test can assert on the result, and a
 * number somebody queries can be regenerated exactly instead of argued about.
 */

/** mulberry32: small, fast, and good enough for pretend tournaments. */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface Weighted<T> {
  value: T
  weight: number
}

/** One option, chosen in proportion to its weight. */
export function pick<T>(random: () => number, options: readonly Weighted<T>[]): T {
  const total = options.reduce((sum, option) => sum + option.weight, 0)
  let roll = random() * total
  for (const option of options) {
    roll -= option.weight
    if (roll <= 0) return option.value
  }
  return options[options.length - 1].value
}
