import { describe, expect, it } from 'vitest'
import {
  cellWeight,
  countRangeCombosFromStates,
  expandRangeToCombos,
  nextWeight,
  type RangeCellStates,
} from './equityRange'
import { ALL_CELLS } from './matrix'
import { cellKey } from '../types/poker'

const keyOf = (label: string) => {
  const cell = ALL_CELLS.find((c) => c.label === label)!
  return cellKey(cell.row, cell.col)
}

const range = (entries: Record<string, number | 'in'>): RangeCellStates =>
  Object.fromEntries(Object.entries(entries).map(([label, value]) => [keyOf(label), value]))

describe('how often a hand is in the range', () => {
  it('reads a frequency straight off', () => {
    const states = range({ AA: 100, KK: 50, QQ: 25 })
    expect(cellWeight(states, keyOf('AA'))).toBe(100)
    expect(cellWeight(states, keyOf('KK'))).toBe(50)
    expect(cellWeight(states, keyOf('QQ'))).toBe(25)
  })

  it('reads a preset, which predates frequencies, as always', () => {
    expect(cellWeight(range({ AA: 'in' }), keyOf('AA'))).toBe(100)
  })

  it('treats a hand it has never heard of as never', () => {
    expect(cellWeight({}, keyOf('72o'))).toBe(0)
    expect(cellWeight({ [keyOf('72o')]: 'out' }, keyOf('72o'))).toBe(0)
  })

  it('refuses a frequency outside the range it can mean', () => {
    expect(cellWeight({ x: 180 }, 'x')).toBe(100)
    expect(cellWeight({ x: -20 }, 'x')).toBe(0)
    expect(cellWeight({ x: Number.NaN }, 'x')).toBe(0)
  })
})

describe('the click cycle', () => {
  it('goes 0 → 100 → 75 → 50 → 25 → 0', () => {
    expect(nextWeight(0)).toBe(100)
    expect(nextWeight(100)).toBe(75)
    expect(nextWeight(75)).toBe(50)
    expect(nextWeight(50)).toBe(25)
    expect(nextWeight(25)).toBe(0)
  })

  it('comes back round', () => {
    let weight = 0
    const seen = [weight]
    for (let step = 0; step < 5; step++) {
      weight = nextWeight(weight)
      seen.push(weight)
    }
    expect(seen).toEqual([0, 100, 75, 50, 25, 0])
  })

  it('snaps a frequency from somewhere else onto the cycle', () => {
    expect(nextWeight(70)).toBe(50)
  })
})

describe('expanding a range to combos', () => {
  it('repeats a full hand four times and a half one twice', () => {
    // Pairs are six combos; frequency shows up as how often each is listed.
    expect(expandRangeToCombos(range({ AA: 100 }))).toHaveLength(24)
    expect(expandRangeToCombos(range({ AA: 50 }))).toHaveLength(12)
    expect(expandRangeToCombos(range({ AA: 25 }))).toHaveLength(6)
  })

  it('leaves out a hand played never', () => {
    expect(expandRangeToCombos(range({ AA: 0 }))).toHaveLength(0)
  })

  it('keeps the ratio between two hands at different frequencies', () => {
    const combos = expandRangeToCombos(range({ AA: 100, KK: 25 }))
    const aces = combos.filter(([a]) => a >> 2 === 12).length
    const kings = combos.filter(([a]) => a >> 2 === 11).length
    expect(aces).toBe(kings * 4)
  })

  it('still drops combos blocked by a dead card', () => {
    const all = expandRangeToCombos(range({ AA: 100 }))
    const blocked = expandRangeToCombos(range({ AA: 100 }), new Set([48]))
    expect(blocked.length).toBeLessThan(all.length)
  })
})

describe('counting a range', () => {
  it('counts a half-frequency hand as half its combos', () => {
    expect(countRangeCombosFromStates(range({ AA: 100 }))).toBe(6)
    expect(countRangeCombosFromStates(range({ AA: 50 }))).toBe(3)
    expect(countRangeCombosFromStates(range({ AKs: 50 }))).toBe(2)
    expect(countRangeCombosFromStates(range({ AKo: 25 }))).toBe(3)
  })

  it('adds the frequencies up', () => {
    expect(countRangeCombosFromStates(range({ AA: 100, KK: 50, AKo: 25 }))).toBe(6 + 3 + 3)
  })

  it('counts a preset at full', () => {
    expect(countRangeCombosFromStates(range({ AA: 'in' }))).toBe(6)
  })
})
