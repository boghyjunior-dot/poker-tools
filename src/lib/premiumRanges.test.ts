import { describe, expect, it } from 'vitest'
import { TOTAL_DECK_COMBOS } from './matrix'
import {
  EQUITY_PRESET_CATEGORIES,
  EQUITY_PRESET_RANGES,
  PREMIUM_RANGES,
  countRangeCombos,
  expandRangeTokens,
  parsePredefinedRange,
} from './predefinedRanges'

const byId = (id: string) => PREMIUM_RANGES.find((range) => range.id === id)!
const combos = (id: string) => countRangeCombos(parsePredefinedRange(byId(id)))

describe('premium ranges', () => {
  it('are offered under their own heading, after the rest', () => {
    expect(EQUITY_PRESET_CATEGORIES).toEqual(['Top %', 'Spots', 'W/ Premium'])
    expect(EQUITY_PRESET_RANGES.slice(-PREMIUM_RANGES.length)).toEqual(PREMIUM_RANGES)
  })

  it('all ten are there, each tagged to the section', () => {
    expect(PREMIUM_RANGES).toHaveLength(10)
    for (const range of PREMIUM_RANGES) {
      expect(range.category, range.label).toBe('W/ Premium')
    }
  })

  it('spells every token in a notation the parser knows', () => {
    // A token it cannot read expands to nothing and drops out of the range in
    // silence, which is the one failure mode nobody would notice.
    for (const range of PREMIUM_RANGES) {
      for (const token of range.tokens) {
        expect(expandRangeTokens([token]).length, `${range.label}: "${token}"`).toBeGreaterThan(0)
      }
    }
  })

  it('quotes its real size in the description', () => {
    for (const range of PREMIUM_RANGES) {
      const count = countRangeCombos(parsePredefinedRange(range))
      const pct = ((count / TOTAL_DECK_COMBOS) * 100).toFixed(1)
      expect(range.description, `${range.label} combos`).toContain(`${count} combos`)
      expect(range.description, `${range.label} percentage`).toContain(`${pct}%`)
    }
  })
})

describe('the pair ladder from QQ+ down to 66+', () => {
  // The seven that are one idea loosened by steps, tightest first.
  const LADDER = [
    'prem-qq-ako',
    'prem-jj-ako',
    'prem-tt-aqo',
    'prem-99-aqo',
    'prem-88-ajs',
    'prem-77-ajo',
    'prem-66-ats',
  ]

  it('never drops a hand on the way down', () => {
    for (let i = 1; i < LADDER.length; i += 1) {
      const tighter = new Set(expandRangeTokens(byId(LADDER[i - 1]).tokens))
      const looser = new Set(expandRangeTokens(byId(LADDER[i]).tokens))
      const missing = [...tighter].filter((hand) => !looser.has(hand))
      expect(missing, `${byId(LADDER[i]).label} drops ${missing.join(', ')}`).toEqual([])
    }
  })

  it('widens at every step', () => {
    const sizes = LADDER.map(combos)
    expect(sizes).toEqual([34, 40, 62, 68, 78, 96, 110])
    for (let i = 1; i < sizes.length; i += 1) {
      expect(sizes[i], LADDER[i]).toBeGreaterThan(sizes[i - 1])
    }
  })
})

describe('the ranges named for a seat', () => {
  it('holds the cutoff range as given', () => {
    expect(expandRangeTokens(byId('prem-co-vs-hj-mp').tokens).sort()).toEqual(
      [
        '44', '55', '66', '77', '88', '99', 'TT', 'JJ', 'QQ', 'KK', 'AA',
        'A7s', 'A8s', 'A9s', 'ATs', 'AJs', 'AQs', 'AKs',
        'KTs', 'KJs', 'KQs',
        'ATo', 'AJo', 'AQo', 'AKo',
        'KQo',
      ].sort(),
    )
    expect(combos('prem-co-vs-hj-mp')).toBe(166)
  })

  it('keeps the small blind ranges apart, the wider one against the button', () => {
    // A2s+ and 22+ against a button open; a tighter, ace-heavy shape when the
    // open came from somewhere earlier and the opener is covered.
    expect(combos('prem-sb-vs-bu')).toBe(270)
    expect(combos('prem-sb-vs-open-covering')).toBe(172)
    expect(combos('prem-sb-vs-bu')).toBeGreaterThan(combos('prem-sb-vs-open-covering'))
  })

  it('carries the odd ace the covering range is built on', () => {
    // A5o in the button range and A5s in the covering one are deliberate: the
    // wheel ace is a blocker, not a slip for a reader to tidy into A7o+/A8s+.
    expect(expandRangeTokens(byId('prem-sb-vs-bu').tokens)).toContain('A5o')
    expect(expandRangeTokens(byId('prem-sb-vs-open-covering').tokens)).toContain('A5s')
  })
})
