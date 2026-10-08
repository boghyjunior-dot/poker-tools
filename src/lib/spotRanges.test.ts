import { describe, expect, it } from 'vitest'
import { TOTAL_DECK_COMBOS } from './matrix'
import {
  EQUITY_PRESET_CATEGORIES,
  EQUITY_PRESET_RANGES,
  SPOT_RANGES,
  countRangeCombos,
  expandRangeTokens,
  getPredefinedRange,
  parsePredefinedRange,
} from './predefinedRanges'

describe('spot ranges', () => {
  it('each one is reachable the way the calculator looks it up', () => {
    // Through EQUITY_PRESET_RANGES, not getPredefinedRange: that one is scoped
    // to the positional ranges on purpose, being what Practice and the MDF
    // reducer are allowed to load.
    for (const range of SPOT_RANGES) {
      expect(EQUITY_PRESET_RANGES.find((item) => item.id === range.id), range.id).toBeDefined()
      expect(getPredefinedRange(range.id), range.id).toBeUndefined()
      expect(range.category).toBe('Spots')
    }
  })

  it('offers them under their own heading, after the percentages', () => {
    expect(EQUITY_PRESET_CATEGORIES).toEqual(['Top %', 'Spots'])
  })

  it('quotes its real combo count in the description', () => {
    for (const range of SPOT_RANGES) {
      const combos = countRangeCombos(parsePredefinedRange(range))
      expect(range.description, range.label).toContain(combos.toLocaleString('en-US'))
    }
  })

  it('spells no hand twice and every token means something', () => {
    for (const range of SPOT_RANGES) {
      const hands = expandRangeTokens(range.tokens)
      expect(new Set(hands).size, range.label).toBe(hands.length)
      // A token the parser does not understand expands to nothing and would
      // vanish from the range without a word, so none may.
      for (const token of range.tokens) {
        expect(expandRangeTokens([token]).length, `${range.label}: "${token}"`).toBeGreaterThan(0)
      }
    }
  })
})

describe('the BB resteal range under ICM', () => {
  const range = SPOT_RANGES.find((item) => item.id === 'resteal-bb-icm')!
  const hands = new Set(expandRangeTokens(range.tokens))

  it('holds exactly what it was given', () => {
    expect([...hands].sort()).toEqual(
      [
        '22', '33', '44', '55', '66', '77', '88', '99',
        'A2s', 'A3s', 'A4s', 'A5s', 'A6s', 'A7s', 'A8s', 'A9s', 'ATs', 'AJs', 'AQs',
        'JTs', 'QTs', 'QJs', 'KTs', 'KJs', 'KQs',
        'A2o', 'A3o', 'A4o', 'A5o',
        'AJo', 'AQo', 'AKo',
      ].sort(),
    )
  })

  it('comes to 200 combos, a shade over 15% of the deck', () => {
    const combos = countRangeCombos(parsePredefinedRange(range))
    // 8 pairs at 6, 17 suited at 4, 7 offsuit at 12.
    expect(combos).toBe(8 * 6 + 17 * 4 + 7 * 12)
    expect(combos).toBe(200)
    expect((combos / TOTAL_DECK_COMBOS) * 100).toBeCloseTo(15.1, 1)
  })

  it('has the suited broadways whole, with no gap in the middle', () => {
    for (const broadway of ['JTs', 'QTs', 'QJs', 'KTs', 'KJs', 'KQs']) {
      expect(hands.has(broadway), broadway).toBe(true)
    }
  })

  it('takes every suited ace but stops short of AKs', () => {
    // A2s+ would have been shorter and would have swept up the one hand the
    // name says is being held back.
    for (const ace of ['A2s', 'A5s', 'A9s', 'ATs', 'AJs', 'AQs']) {
      expect(hands.has(ace), ace).toBe(true)
    }
    expect(hands.has('AKs')).toBe(false)
  })

  it('leaves out the top of the range, which is the point of the name', () => {
    for (const premium of ['AA', 'KK', 'QQ', 'JJ', 'TT', 'AKs']) {
      expect(hands.has(premium), premium).toBe(false)
    }
  })

  it('is polarised rather than a slice off the top', () => {
    // A top-X% range of this size would never reach A2o while skipping TT.
    expect(hands.has('A2o')).toBe(true)
    expect(hands.has('TT')).toBe(false)
  })
})
