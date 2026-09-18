/**
 * Which starting hands are a +EV call against a shove.
 *
 * The equity calculator answers "how does this hand run against that range".
 * This answers the question you actually face at the table: given the pot, the
 * price and the bounty, *which* hands can you call with? That is one threshold
 * and 169 equities, so the work is arranged around computing 169 equities at
 * once rather than calling the general engine 169 times.
 *
 * The trick is that every hero hand is scored against the *same* board. One
 * iteration deals a villain combo and a board, evaluates villain once, then
 * runs all 169 hero cells past it. The general engine rebuilds the villain
 * combo pool on every iteration and shuffles a 48-card deck to take five
 * cards, which is what makes 169 separate runs unaffordable.
 */

import { ALL_CELLS } from './matrix'
import { comboToHoleCards } from './board'
import { getCellComboKeys } from './combos'
import { cardToIndex } from './cards'
import { evaluate } from './handEvaluator'
import { mulberry32 } from './mttVariance'
import { cellKey } from '../types/poker'
import type { RangeCellStates, HoleCombo } from './equityRange'

export type CallVerdict = 'call' | 'fold'

export interface CellEquity {
  key: string
  label: string
  row: number
  col: number
  /** Combos of this hand in a full deck: 6 pair, 4 suited, 12 offsuit. */
  combos: number
  equityPct: number
  /** 95% confidence half-width at the sample this cell actually got. */
  marginPct: number
}

/** Equity for all 169 starting hands against one range. No threshold applied. */
export interface HandEquityGrid {
  cells: CellEquity[]
  iterations: number
}

export interface CallingCell extends CellEquity {
  /** Which side of the threshold the estimate falls on. */
  verdict: CallVerdict
  /**
   * True when the threshold sits inside the error bars.
   *
   * Kept apart from the verdict on purpose. The verdict is still the best
   * answer available and belongs in the range; this only says the sample
   * cannot separate the hand from break-even, so it is a close spot rather
   * than a clear one.
   */
  marginal: boolean
}

export interface CallingRangeResult {
  cells: CallingCell[]
  thresholdPct: number
  iterations: number
  /** Combo-weighted share of all 1,326 hands that clear the bar. */
  callRangePct: number
  callCombos: number
  /** Combos the sample cannot separate from break-even, inside the call range or not. */
  marginalCombos: number
}

export interface CallingRangeOptions {
  iterations?: number
  seed?: number
}

const DEFAULT_ITERATIONS = 20_000
const TOTAL_COMBOS = 1326
const Z_95 = 1.96

interface CellPlan {
  cell: (typeof ALL_CELLS)[number]
  combos: HoleCombo[]
}

/** Every cell's combos as card indices, built once and reused across calls. */
const CELL_PLANS: CellPlan[] = ALL_CELLS.map((cell) => ({
  cell,
  combos: getCellComboKeys(cell).map((comboKey) => {
    const hole = comboToHoleCards(cell, comboKey)
    return [cardToIndex(hole[0]), cardToIndex(hole[1])] as HoleCombo
  }),
}))

function villainPool(states: RangeCellStates): HoleCombo[] {
  const pool: HoleCombo[] = []
  for (const plan of CELL_PLANS) {
    if (states[cellKey(plan.cell.row, plan.cell.col)] !== 'in') continue
    pool.push(...plan.combos)
  }
  return pool
}

/**
 * Equity for all 169 starting hands against one range.
 *
 * Deliberately knows nothing about the price. What a hand is worth against a
 * range does not depend on what you are being charged, so the simulation runs
 * once and {@link applyThreshold} answers as many prices as you like from it —
 * which is what makes showing the range with and without the bounty free.
 *
 * Seeded, so the same range always produces the same grid.
 */
export function handEquities(
  villain: RangeCellStates,
  options: CallingRangeOptions = {},
): HandEquityGrid {
  const iterations = Math.max(1, Math.floor(options.iterations ?? DEFAULT_ITERATIONS))
  const random = mulberry32(options.seed ?? 1)
  const pool = villainPool(villain)

  const wins = new Float64Array(CELL_PLANS.length)
  const trials = new Float64Array(CELL_PLANS.length)

  if (pool.length > 0) {
    // Reused across iterations so the hot loop allocates nothing.
    const villainDead = new Uint8Array(52)
    const onBoard = new Uint8Array(52)
    const board = new Array<number>(5)
    const seven = new Array<number>(7)

    for (let iteration = 0; iteration < iterations; iteration++) {
      const villainCombo = pool[Math.floor(random() * pool.length)]
      villainDead.fill(0)
      villainDead[villainCombo[0]] = 1
      villainDead[villainCombo[1]] = 1

      // Rejection sampling beats shuffling 48 cards to take five.
      onBoard.fill(0)
      for (let i = 0; i < 5; i++) {
        let card = Math.floor(random() * 52)
        while (villainDead[card] === 1 || onBoard[card] === 1) {
          card = Math.floor(random() * 52)
        }
        onBoard[card] = 1
        board[i] = card
      }

      seven[0] = villainCombo[0]
      seven[1] = villainCombo[1]
      for (let i = 0; i < 5; i++) seven[i + 2] = board[i]
      const villainScore = evaluate(seven)

      for (let index = 0; index < CELL_PLANS.length; index++) {
        const combos = CELL_PLANS[index].combos

        // Hero's cards are chosen without looking at the board, then the deal
        // is thrown away if the board turned out to need them. Picking a combo
        // that dodges the board instead would quietly deal hero a board full
        // of his own rank — the version that did that gave KK 30% against
        // aces instead of 18%, because a king on the flop became a set rather
        // than an impossible deal.
        let available = 0
        for (let i = 0; i < combos.length; i++) {
          const candidate = combos[i]
          if (villainDead[candidate[0]] === 0 && villainDead[candidate[1]] === 0) available++
        }
        if (available === 0) continue

        // One combo of a cell stands for all of them: a range is defined per
        // cell, so every suit arrangement of a hand runs the same against it.
        let wanted = Math.floor(random() * available)
        let hero: HoleCombo | null = null
        for (let i = 0; i < combos.length; i++) {
          const candidate = combos[i]
          if (villainDead[candidate[0]] === 1 || villainDead[candidate[1]] === 1) continue
          if (wanted === 0) {
            hero = candidate
            break
          }
          wanted--
        }
        if (hero === null) continue
        if (onBoard[hero[0]] === 1 || onBoard[hero[1]] === 1) continue

        seven[0] = hero[0]
        seven[1] = hero[1]
        const heroScore = evaluate(seven)

        trials[index]++
        if (heroScore > villainScore) wins[index]++
        else if (heroScore === villainScore) wins[index] += 0.5
      }
    }
  }

  const cells = CELL_PLANS.map((plan, index) => {
    const sample = trials[index]
    const equity = sample > 0 ? (wins[index] / sample) * 100 : 0
    const share = equity / 100
    const margin =
      sample > 0 ? Z_95 * Math.sqrt(Math.max(share * (1 - share), 0) / sample) * 100 : 100

    return {
      key: cellKey(plan.cell.row, plan.cell.col),
      label: plan.cell.label,
      row: plan.cell.row,
      col: plan.cell.col,
      combos: plan.cell.combos,
      equityPct: equity,
      marginPct: sample > 0 ? margin : 100,
    }
  })

  return { cells, iterations }
}

/**
 * Read a calling range off the equity grid at one price.
 *
 * Pure and instant, so a page can show the range the bounty buys you next to
 * the range without it from a single simulation.
 */
export function applyThreshold(grid: HandEquityGrid, thresholdPct: number): CallingRangeResult {
  let callCombos = 0
  let marginalCombos = 0

  const cells = grid.cells.map((cell) => {
    // The point estimate decides the range; the error bars only decide whether
    // the call is a close one. Folding everything the sample cannot separate
    // would shrink the answer as the sample shrank, which would read as a
    // tighter range rather than as a vaguer one.
    const verdict: CallVerdict = cell.equityPct >= thresholdPct ? 'call' : 'fold'
    const marginal = Math.abs(cell.equityPct - thresholdPct) <= cell.marginPct

    if (verdict === 'call') callCombos += cell.combos
    if (marginal) marginalCombos += cell.combos

    return { ...cell, verdict, marginal }
  })

  return {
    cells,
    thresholdPct,
    iterations: grid.iterations,
    callRangePct: (callCombos / TOTAL_COMBOS) * 100,
    callCombos,
    marginalCombos,
  }
}

/** Simulate and read off one price in a single call. */
export function callingRange(
  villain: RangeCellStates,
  thresholdPct: number,
  options: CallingRangeOptions = {},
): CallingRangeResult {
  return applyThreshold(handEquities(villain, options), thresholdPct)
}
