import { describe, expect, it } from 'vitest'
import {
  DRILL_SPOTS,
  parseCardToken,
  priceOf,
  requiredEquityFor,
  solveDrill,
  villainRangeOf,
} from './equityDrill'
import { EQUITY_PRESET_RANGES } from './predefinedRanges'

describe('reading a drill spot', () => {
  it('parses a card the way people write one', () => {
    expect(parseCardToken('As')).toEqual({ rank: 0, suit: 's' })
    expect(parseCardToken('2c')).toEqual({ rank: 12, suit: 'c' })
    expect(parseCardToken('td')).toEqual({ rank: 4, suit: 'd' })
  })

  it('refuses anything that is not a card rather than guessing one', () => {
    for (const bad of ['', 'A', 'Axs', 'Xs', 'Ax', '  ', '10s']) {
      expect(parseCardToken(bad), bad).toBeNull()
    }
  })

  it('prices the call off the pot', () => {
    expect(requiredEquityFor({ ...DRILL_SPOTS[0], pot: 3000, call: 1000 })).toBeCloseTo(25, 6)
    expect(priceOf({ ...DRILL_SPOTS[0], pot: 3000, call: 1000 })).toBe('3.0 : 1')
  })
})

describe('the authored drill', () => {
  it('has ten spots, each with a range that exists', () => {
    expect(DRILL_SPOTS).toHaveLength(10)
    for (const spot of DRILL_SPOTS) {
      expect(
        EQUITY_PRESET_RANGES.some((preset) => preset.id === spot.villain),
        `${spot.id}: ${spot.villain}`,
      ).toBe(true)
      expect(villainRangeOf(spot), spot.id).not.toBeNull()
    }
  })

  it('deals every hand out of one deck', () => {
    for (const spot of DRILL_SPOTS) {
      const [a, b] = spot.hand.map(parseCardToken)
      expect(a, `${spot.id} first card`).not.toBeNull()
      expect(b, `${spot.id} second card`).not.toBeNull()
      expect(a).not.toEqual(b)
    }
  })

  it('gives every spot a price worth asking about', () => {
    for (const spot of DRILL_SPOTS) {
      expect(spot.pot, spot.id).toBeGreaterThan(0)
      expect(spot.call, spot.id).toBeGreaterThan(0)
      const needed = requiredEquityFor(spot)
      expect(needed, spot.id).toBeGreaterThan(5)
      expect(needed, spot.id).toBeLessThan(60)
    }
  })

  it('has unique ids, so the score cannot double-count one', () => {
    const ids = DRILL_SPOTS.map((spot) => spot.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  // The one that matters. A question whose answer sits inside the sampling
  // error is a coin flip being marked right or wrong, and the player has no
  // way to tell it apart from a question they got wrong fairly.
  it.each(DRILL_SPOTS)('$id is decided, not a coin flip', (spot) => {
    const solved = solveDrill(spot, 200_000)
    const gap = Math.abs(solved.equity - solved.needed)
    expect(solved.tooClose, `${spot.id} sits within the margin`).toBe(false)
    expect(gap, `${spot.id} is only ${gap.toFixed(1)}pts clear`).toBeGreaterThan(2.5)
  }, 30_000)

  it('is not answerable by always saying the same thing', () => {
    // Both answers have to be worth considering, or the drill teaches a reflex.
    const verdicts = DRILL_SPOTS.map((spot) => solveDrill(spot, 60_000).enough)
    expect(verdicts.filter(Boolean).length).toBeGreaterThanOrEqual(3)
    expect(verdicts.filter((v) => !v).length).toBeGreaterThanOrEqual(3)
  }, 30_000)
})

describe('solving a spot that cannot be solved', () => {
  it('says so rather than inventing an answer', () => {
    const broken = solveDrill({ ...DRILL_SPOTS[0], villain: 'no-such-range' })
    expect(broken.tooClose).toBe(true)
    expect(broken.iterations).toBe(0)
    const badHand = solveDrill({ ...DRILL_SPOTS[0], hand: ['Zz', 'Kd'] })
    expect(badHand.iterations).toBe(0)
  })
})
