import { describe, expect, it } from 'vitest'
import { applyThreshold, callingRange, handEquities } from './callingRange'
import { calculateEquity } from './equity'
import { cellKey, type BoardCard, type RankIndex, type SuitId } from '../types/poker'
import { ALL_CELLS } from './matrix'
import type { RangeCellStates } from './equityRange'

/** Build a range from hand labels, e.g. rangeOf('AA', 'KK'). */
function rangeOf(...labels: string[]): RangeCellStates {
  const states: RangeCellStates = {}
  for (const label of labels) {
    const cell = ALL_CELLS.find((c) => c.label === label)
    if (!cell) throw new Error(`no cell for ${label}`)
    states[cellKey(cell.row, cell.col)] = 'in'
  }
  return states
}

const equityOf = (grid: { cells: { label: string; equityPct: number }[] }, label: string) =>
  grid.cells.find((cell) => cell.label === label)!.equityPct

describe('equity against a known range', () => {
  // Vs exactly aces, the answers are textbook, which is what makes this a
  // check on the maths rather than on itself.
  const grid = handEquities(rangeOf('AA'), { iterations: 20_000, seed: 7 })

  it('makes aces against aces a coin flip', () => {
    expect(equityOf(grid, 'AA')).toBeGreaterThan(45)
    expect(equityOf(grid, 'AA')).toBeLessThan(55)
  })

  it('puts kings around 18% against aces', () => {
    expect(equityOf(grid, 'KK')).toBeGreaterThan(15)
    expect(equityOf(grid, 'KK')).toBeLessThan(22)
  })

  it('gives a suited ace-king about 12%, ahead of the offsuit version', () => {
    expect(equityOf(grid, 'AKs')).toBeGreaterThan(8)
    expect(equityOf(grid, 'AKs')).toBeLessThan(16)
    expect(equityOf(grid, 'AKs')).toBeGreaterThan(equityOf(grid, 'AKo'))
  })

  it('ranks a suited connector above its offsuit twin', () => {
    expect(equityOf(grid, '76s')).toBeGreaterThan(equityOf(grid, '76o'))
  })

  it('covers all 169 hands', () => {
    expect(grid.cells).toHaveLength(169)
    expect(new Set(grid.cells.map((cell) => cell.label)).size).toBe(169)
  })
})

describe('reading a range off the grid', () => {
  const grid = handEquities(rangeOf('AA', 'KK', 'QQ', 'AKs', 'AKo'), {
    iterations: 20_000,
    seed: 3,
  })

  it('widens as the price gets better', () => {
    const steep = applyThreshold(grid, 50)
    const cheap = applyThreshold(grid, 30)
    expect(cheap.callRangePct).toBeGreaterThan(steep.callRangePct)
  })

  it('calls with everything at a zero threshold and nothing at 100', () => {
    expect(applyThreshold(grid, 0).callRangePct).toBe(100)
    expect(applyThreshold(grid, 100).callCombos).toBe(0)
  })

  it('counts combos the way the deck does', () => {
    const all = applyThreshold(grid, 0)
    expect(all.callCombos).toBe(1326)
  })

  it('does not re-simulate — the equities are the same at any price', () => {
    const a = applyThreshold(grid, 20)
    const b = applyThreshold(grid, 80)
    expect(a.cells.map((cell) => cell.equityPct)).toEqual(b.cells.map((cell) => cell.equityPct))
  })

  it('flags hands the sample cannot separate from break-even', () => {
    // Set the bar exactly at one hand's equity; it must read as marginal.
    const target = grid.cells.find((cell) => cell.label === '77')!
    const read = applyThreshold(grid, target.equityPct)
    expect(read.cells.find((cell) => cell.label === '77')!.marginal).toBe(true)
  })
})

describe('a bounty widens the range', () => {
  it('turns a lower required equity into more calling combos', () => {
    const villain = rangeOf('AA', 'KK', 'AKs', 'A5s', '76s')
    const grid = handEquities(villain, { iterations: 20_000, seed: 11 })
    // Bounties only ever pull the requirement down, so the range only grows.
    const withoutBounty = applyThreshold(grid, 40)
    const withBounty = applyThreshold(grid, 30)
    expect(withBounty.callCombos).toBeGreaterThan(withoutBounty.callCombos)
  })
})

describe('determinism and edges', () => {
  it('repeats exactly for the same seed, and differs for another', () => {
    const villain = rangeOf('AA', 'KK')
    const a = handEquities(villain, { iterations: 2000, seed: 42 })
    const b = handEquities(villain, { iterations: 2000, seed: 42 })
    const c = handEquities(villain, { iterations: 2000, seed: 43 })
    expect(a.cells.map((x) => x.equityPct)).toEqual(b.cells.map((x) => x.equityPct))
    expect(a.cells.map((x) => x.equityPct)).not.toEqual(c.cells.map((x) => x.equityPct))
  })

  it('survives an empty villain range instead of throwing', () => {
    const result = callingRange({}, 33, { iterations: 500 })
    expect(result.cells).toHaveLength(169)
    expect(result.callCombos).toBe(0)
    expect(result.cells.every((cell) => cell.marginPct === 100)).toBe(true)
  })

  it('handles a range so narrow that some hands are always blocked', () => {
    // Vs exactly aces, hero can never hold all four aces himself.
    const result = callingRange(rangeOf('AA'), 50, { iterations: 2000 })
    const aces = result.cells.find((cell) => cell.label === 'AA')!
    expect(Number.isFinite(aces.equityPct)).toBe(true)
    expect(aces.equityPct).toBeGreaterThan(0)
  })
})

describe('against the general equity engine', () => {
  // Two implementations that share nothing but the hand evaluator: this one
  // samples villain first and scores 169 hands off one board, the other
  // samples per hand. Agreement is what makes either trustworthy.
  const villain = rangeOf('AA')
  const grid = handEquities(villain, { iterations: 20_000, seed: 5 })

  const R = 'AKQJT98765432'
  const card = (text: string): BoardCard => ({
    rank: R.indexOf(text[0]) as RankIndex,
    suit: text[1] as SuitId,
  })

  it.each([
    ['KK', 'Ks', 'Kh'],
    ['AKo', 'Ad', 'Kh'],
    ['AKs', 'Ad', 'Kd'],
    ['22', '2s', '2h'],
  ])('agrees on %s against aces', (label, a, b) => {
    const engine = calculateEquity(
      [
        { type: 'hand', name: 'hero', cards: [card(a), card(b)] },
        { type: 'range', name: 'villain', cellStates: villain },
      ],
      { iterations: 20_000 },
    )
    // The engine is unseeded, so at 20,000 iterations the two estimates sit
    // up to about a point apart on pure sampling noise. The bug this test
    // exists to catch — dealing hero a board full of his own rank — was a
    // twelve-point error, so a 1.5-point gate is still a tight one.
    expect(Math.abs(equityOf(grid, label) - engine.players[0].equity)).toBeLessThan(1.5)
  })
})
