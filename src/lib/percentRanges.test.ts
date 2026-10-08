import { describe, expect, it } from 'vitest'
import { TOTAL_DECK_COMBOS } from './matrix'
import {
  EQUITY_PRESET_RANGES,
  PERCENT_RANGES,
  SPOT_RANGES,
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
  'top-60': 60,
  'top-70': 70,
  'top-80': 80,
  'top-90': 90,
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

  it('leads the equity dropdown, with spots after it', () => {
    expect(EQUITY_PRESET_RANGES.slice(0, PERCENT_RANGES.length)).toEqual(PERCENT_RANGES)
    expect(EQUITY_PRESET_RANGES.slice(PERCENT_RANGES.length)).toEqual(SPOT_RANGES)
    // The positional presets live on for the tools built around them, but a
    // range named for a position has no business on a seat that already has one.
    expect(EQUITY_PRESET_RANGES.some((range) => range.id.startsWith('40bb-'))).toBe(false)
  })

  it('says its own combo count in the description the dropdown shows', () => {
    // A stale number under a preset is worse than none, so it is checked.
    for (const range of PERCENT_RANGES) {
      const combos = countRangeCombos(parsePredefinedRange(range))
      expect(range.description, range.label).toContain(combos.toLocaleString('en-US'))
    }
  })

  it('makes the full range every cell in the matrix', () => {
    const full = PERCENT_RANGES.find((range) => range.id === 'full-range')!
    expect(expandRangeTokens(full.tokens)).toHaveLength(169)
    expect(countRangeCombos(parsePredefinedRange(full))).toBe(TOTAL_DECK_COMBOS)
  })
})
