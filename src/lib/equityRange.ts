import { ALL_CELLS } from './matrix'
import { comboToHoleCards } from './board'
import { getCellComboKeys } from './combos'
import { cardToIndex } from './cards'
import { cellKey, type BoardCard } from '../types/poker'

export type RangeCellStates = Record<string, 'in' | 'out'>

export type HoleCombo = readonly [number, number]

export function expandRangeToCombos(cellStates: RangeCellStates, dead: ReadonlySet<number> = new Set()): HoleCombo[] {
  const combos: HoleCombo[] = []
  for (const cell of ALL_CELLS) {
    const key = cellKey(cell.row, cell.col)
    if (cellStates[key] !== 'in') continue
    for (const comboKey of getCellComboKeys(cell)) {
      const hole = comboToHoleCards(cell, comboKey)
      const a = cardToIndex(hole[0])
      const b = cardToIndex(hole[1])
      if (!dead.has(a) && !dead.has(b)) combos.push([a, b])
    }
  }
  return combos
}

export function holeCardsToCombo(cards: [BoardCard, BoardCard]): HoleCombo {
  return [cardToIndex(cards[0]), cardToIndex(cards[1])]
}

export function countRangeCombosFromStates(cellStates: RangeCellStates): number {
  let total = 0
  for (const cell of ALL_CELLS) {
    const key = cellKey(cell.row, cell.col)
    if (cellStates[key] === 'in') total += cell.combos
  }
  return total
}
