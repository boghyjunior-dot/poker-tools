import { ALL_CELLS } from './matrix'
import { comboToHoleCards } from './board'
import { getCellComboKeys } from './combos'
import { cardToIndex } from './cards'
import { cellKey, type BoardCard } from '../types/poker'

/**
 * A range, cell by cell, as how often each hand is in it.
 *
 * Values are a frequency from 0 to 100. The strings are what the bundled
 * presets speak — they were written before ranges had frequencies — and are
 * read as all or nothing, so a preset and a hand-painted range can sit in the
 * same object without either having to be converted.
 */
export type RangeCellStates = Record<string, number | 'in' | 'out'>

export type HoleCombo = readonly [number, number]

/** The frequencies a click cycles through, richest first. */
export const RANGE_WEIGHTS = [100, 75, 50, 25, 0] as const

/**
 * Sampling repeats a combo once per quarter of frequency, so every weight has
 * to be a multiple of this for the repetition to be exact.
 */
const WEIGHT_STEP = 25

/** How often this hand is in the range: 0–100, absent meaning never. */
export function cellWeight(cellStates: RangeCellStates, key: string): number {
  const raw = cellStates[key]
  if (raw === 'in') return 100
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0
  return Math.min(100, Math.max(0, raw))
}

/** The next frequency for a cell: 0 → 100 → 75 → 50 → 25 → 0. */
export function nextWeight(weight: number): number {
  const index = RANGE_WEIGHTS.indexOf(Math.round(weight / WEIGHT_STEP) * WEIGHT_STEP as 100)
  if (index === -1) return 100
  return RANGE_WEIGHTS[(index + 1) % RANGE_WEIGHTS.length]
}

/**
 * Every combo in the range, a partial hand repeated fewer times.
 *
 * Frequency is expressed by repetition rather than by a weight alongside,
 * because everything that samples a range picks uniformly from this list —
 * so a hand at 50% appearing twice where a full one appears four times makes
 * every one of those samplers weight-aware without knowing it.
 */
export function expandRangeToCombos(
  cellStates: RangeCellStates,
  dead: ReadonlySet<number> = new Set(),
): HoleCombo[] {
  const combos: HoleCombo[] = []
  for (const cell of ALL_CELLS) {
    const key = cellKey(cell.row, cell.col)
    const copies = Math.round(cellWeight(cellStates, key) / WEIGHT_STEP)
    if (copies === 0) continue
    for (const comboKey of getCellComboKeys(cell)) {
      const hole = comboToHoleCards(cell, comboKey)
      const a = cardToIndex(hole[0])
      const b = cardToIndex(hole[1])
      if (dead.has(a) || dead.has(b)) continue
      for (let copy = 0; copy < copies; copy++) combos.push([a, b])
    }
  }
  return combos
}

export function holeCardsToCombo(cards: [BoardCard, BoardCard]): HoleCombo {
  return [cardToIndex(cards[0]), cardToIndex(cards[1])]
}

/** Combos in the range, counting a half-frequency hand as half of them. */
export function countRangeCombosFromStates(cellStates: RangeCellStates): number {
  let total = 0
  for (const cell of ALL_CELLS) {
    const key = cellKey(cell.row, cell.col)
    total += (cell.combos * cellWeight(cellStates, key)) / 100
  }
  return Math.round(total * 10) / 10
}
