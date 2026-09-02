import { describe, expect, it } from 'vitest'
import { TOTAL_DECK_COMBOS } from './matrix'
import {
  PERCENT_RANGES,
  countRangeCombos,
  expandRangeTokens,
  parsePredefinedRange,
} from './predefinedRanges'

const NOMINAL: Record<string, number> = {
  'top-10': 10,
  'top-15': 15,
  'top-20': 20,
  'top-25': 25,
  'top-30': 30,
  'top-40': 40,
  'top-50': 50,
  'full-range': 100,
}

describe('top-X% preset ranges', () => {
  it('covers every advertised percentage', () => {
    expect(PERCENT_RANGES.map((range) => range.id)).toEqual(Object.keys(NOMINAL))
  })

  it.each(PERCENT_RANGES)('$label lands within 1.5pp of its label', (range) => {
    const pct = (countRangeCombos(parsePredefinedRange(range)) / TOTAL_DECK_COMBOS) * 100
    expect(Math.abs(pct - NOMINAL[range.id])).toBeLessThanOrEqual(1.5)
  })

  it('nests each range inside the next one up', () => {
    for (let i = 1; i < PERCENT_RANGES.length; i++) {
      const inner = new Set(expandRangeTokens(PERCENT_RANGES[i - 1].tokens))
      const outer = new Set(expandRangeTokens(PERCENT_RANGES[i].tokens))
      const missing = [...inner].filter((hand) => !outer.has(hand))
      expect(missing, `${PERCENT_RANGES[i].label} drops ${missing.join(', ')}`).toEqual([])
      expect(outer.size).toBeGreaterThan(inner.size)
    }
  })

  it('makes the full range every cell in the matrix', () => {
    const full = PERCENT_RANGES.find((range) => range.id === 'full-range')!
    expect(expandRangeTokens(full.tokens)).toHaveLength(169)
    expect(countRangeCombos(parsePredefinedRange(full))).toBe(TOTAL_DECK_COMBOS)
  })
})
