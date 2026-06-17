import { fullDeckIndices } from './cards'
import { evaluate } from './handEvaluator'
import { expandRangeToCombos, holeCardsToCombo, type HoleCombo, type RangeCellStates } from './equityRange'
import type { BoardCard } from '../types/poker'

export interface EquityHandPlayer {
  type: 'hand'
  name: string
  cards: [BoardCard, BoardCard]
}

export interface EquityRangePlayer {
  type: 'range'
  name: string
  cellStates: RangeCellStates
}

export type EquityPlayer = EquityHandPlayer | EquityRangePlayer

export interface EquityPlayerResult {
  name: string
  equity: number
  winPct: number
  tiePct: number
}

export interface EquityResult {
  players: EquityPlayerResult[]
  iterations: number
  combos: number[]
}

export interface EquityOptions {
  iterations?: number
}

const DEFAULT_ITERATIONS = 10_000
const Z_95 = 1.96

/** Worst-case margin of error (±%) at 95% confidence when equity is 50%. */
export function worstCaseMarginOfError(iterations: number): number {
  return Z_95 * Math.sqrt(0.25 / iterations) * 100
}

/** Margin of error (±%) at 95% confidence for a given equity estimate. */
export function marginOfErrorForEquity(equityPct: number, iterations: number): number {
  const p = equityPct / 100
  return Z_95 * Math.sqrt((p * (1 - p)) / iterations) * 100
}

export function formatMarginOfError(marginPct: number): string {
  if (marginPct >= 1) return `±${marginPct.toFixed(1)}%`
  return `±${marginPct.toFixed(2)}%`
}

export const ITERATION_OPTIONS = [
  { value: 5_000, label: '5,000' },
  { value: 10_000, label: '10,000' },
  { value: 25_000, label: '25,000' },
  { value: 50_000, label: '50,000' },
  { value: 100_000, label: '100,000' },
  { value: 500_000, label: '500,000' },
  { value: 1_000_000, label: '1,000,000' },
] as const

function buildComboPool(player: EquityPlayer, dead: ReadonlySet<number>): HoleCombo[] {
  if (player.type === 'hand') {
    const combo = holeCardsToCombo(player.cards)
    if (dead.has(combo[0]) || dead.has(combo[1])) return []
    return [combo]
  }
  return expandRangeToCombos(player.cellStates, dead)
}

function sampleCombo(pool: HoleCombo[]): HoleCombo {
  return pool[Math.floor(Math.random() * pool.length)]
}

function dealBoard(deck: number[], used: Set<number>): number[] {
  const remaining: number[] = []
  for (const card of deck) {
    if (!used.has(card)) remaining.push(card)
  }
  for (let i = remaining.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[remaining[i], remaining[j]] = [remaining[j], remaining[i]]
  }
  return remaining.slice(0, 5)
}

export function calculateEquity(players: EquityPlayer[], options: EquityOptions = {}): EquityResult {
  if (players.length < 2) throw new Error('Need at least 2 players')

  const iterations = options.iterations ?? DEFAULT_ITERATIONS
  const deck = fullDeckIndices()
  const wins = new Array(players.length).fill(0)
  const ties = new Array(players.length).fill(0)
  const comboCounts = players.map((player) => {
    if (player.type === 'hand') return 1
    return buildComboPool(player, new Set()).length
  })

  let completed = 0
  let attempts = 0
  const maxAttempts = iterations * 20

  while (completed < iterations && attempts < maxAttempts) {
    attempts++
    const used = new Set<number>()
    const holes: HoleCombo[] = []
    let valid = true

    for (const player of players) {
      const pool = buildComboPool(player, used)
      if (pool.length === 0) {
        valid = false
        break
      }
      const combo = sampleCombo(pool)
      if (used.has(combo[0]) || used.has(combo[1])) {
        valid = false
        break
      }
      holes.push(combo)
      used.add(combo[0])
      used.add(combo[1])
    }

    if (!valid) continue

    const board = dealBoard(deck, used)
    const scores = holes.map((hole) => evaluate([hole[0], hole[1], ...board]))
    const best = Math.max(...scores)
    const winnerIndexes = scores
      .map((score, index) => (score === best ? index : -1))
      .filter((index) => index >= 0)

    if (winnerIndexes.length === 1) {
      wins[winnerIndexes[0]]++
    } else {
      const share = 1 / winnerIndexes.length
      for (const index of winnerIndexes) ties[index] += share
    }
    completed++
  }

  if (completed === 0) {
    throw new Error('Could not run simulation — check for overlapping cards or empty ranges')
  }

  return {
    iterations: completed,
    combos: comboCounts,
    players: players.map((player, index) => {
      const equity = ((wins[index] + ties[index]) / completed) * 100
      return {
        name: player.name,
        equity,
        winPct: (wins[index] / completed) * 100,
        tiePct: (ties[index] / completed) * 100,
      }
    }),
  }
}
