import { evaluate } from './handEvaluator'
import { expandRangeToCombos, holeCardsToCombo, type HoleCombo, type RangeCellStates } from './equityRange'
import {
  bountyAmountToChips,
  bountyEquityAddPct,
  buildBountyBreakdown,
  bountyChipsPerWin,
  buildCallEvResult,
  computeShowdownPot,
  heroCoversVillain,
  totalCapturableBountyChips,
  requiredEquityPct,
  totalEquityWithBounty,
  type CallEvResult,
  type StackBountyInput,
} from './equityBounty'
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
  bountyEvChips?: number
  bountyEquityAdd?: number
  totalEquity?: number
  chipEvChips?: number
  totalEvChips?: number
}

export interface EquityResult {
  players: EquityPlayerResult[]
  iterations: number
  combos: number[]
  buyIn?: number
  startingStack?: number
  effectiveStack?: number
  existingPotChips?: number
  playerPotTotal?: number
  potChips?: number
  capturableBountyChips?: number
  callEv?: CallEvResult
}

export interface EquityOptions {
  iterations?: number
  buyIn?: number
  startingStack?: number
  /** Antes + blinds already in the pot before the all-in. */
  existingPot?: number
  /** Chips hero must call; defaults to matched effective contribution when omitted. */
  callAmount?: number
  /** Parallel to players: stack per seat; bountyAmount only used for non-hero opponents. */
  stacks?: StackBountyInput[]
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

export function calculateEquity(players: EquityPlayer[], options: EquityOptions = {}): EquityResult {
  if (players.length < 2) throw new Error('Need at least 2 players')

  const iterations = options.iterations ?? DEFAULT_ITERATIONS
  const buyIn = options.buyIn
  const startingStack = options.startingStack
  const stackInfo = options.stacks
  const useStacks =
    buyIn !== undefined &&
    buyIn > 0 &&
    startingStack !== undefined &&
    startingStack > 0 &&
    stackInfo !== undefined &&
    stackInfo.length === players.length

  // Each player's combos, worked out once. Rebuilding these per iteration —
  // 169 cells expanded and filtered against the dead cards, every time — was
  // what held this to ten thousand hands a second, which made the accuracy
  // settings the menu already offered unusable.
  const pools = players.map((player) => buildComboPool(player, new Set()))
  const wins = new Array(players.length).fill(0)
  const ties = new Array(players.length).fill(0)
  const bountyChipsWon = new Array(players.length).fill(0)
  const comboCounts = pools.map((pool, index) =>
    players[index].type === 'hand' ? 1 : pool.length,
  )

  let completed = 0
  let attempts = 0
  const maxAttempts = iterations * 20

  // Reused across iterations so the hot loop allocates nothing.
  const used = new Uint8Array(52)
  const holes: HoleCombo[] = new Array(players.length)
  const board = new Array<number>(5)
  const seven = new Array<number>(7)
  const scores = new Array<number>(players.length)
  // A combo blocked by the cards already dealt is redrawn rather than
  // filtered out beforehand, which samples the same hands and costs nothing.
  const MAX_DRAWS = 200

  while (completed < iterations && attempts < maxAttempts) {
    attempts++
    used.fill(0)
    let valid = true

    for (let index = 0; index < players.length; index++) {
      const pool = pools[index]
      if (pool.length === 0) {
        valid = false
        break
      }
      let combo: HoleCombo | null = null
      for (let draw = 0; draw < MAX_DRAWS; draw++) {
        const candidate = pool[Math.floor(Math.random() * pool.length)]
        if (used[candidate[0]] === 0 && used[candidate[1]] === 0) {
          combo = candidate
          break
        }
      }
      if (combo === null) {
        valid = false
        break
      }
      holes[index] = combo
      used[combo[0]] = 1
      used[combo[1]] = 1
    }

    if (!valid) continue

    for (let i = 0; i < 5; i++) {
      let card = Math.floor(Math.random() * 52)
      while (used[card] === 1) card = Math.floor(Math.random() * 52)
      used[card] = 1
      board[i] = card
    }

    for (let i = 0; i < 5; i++) seven[i + 2] = board[i]
    for (let index = 0; index < players.length; index++) {
      seven[0] = holes[index][0]
      seven[1] = holes[index][1]
      scores[index] = evaluate(seven)
    }
    let best = scores[0]
    for (let index = 1; index < scores.length; index++) {
      if (scores[index] > best) best = scores[index]
    }
    const winnerIndexes: number[] = []
    for (let index = 0; index < scores.length; index++) {
      if (scores[index] === best) winnerIndexes.push(index)
    }

    if (winnerIndexes.length === 1) {
      wins[winnerIndexes[0]]++
      if (useStacks) {
        const heroIndex = 0
        const winner = winnerIndexes[0]
        if (winner === heroIndex) {
          let iterationBounty = 0
          for (let i = 1; i < players.length; i++) {
            if (winnerIndexes.includes(i)) continue
            const villainInfo = stackInfo![i]
            const bountyAmount = villainInfo.bountyAmount ?? 0
            if (bountyAmount <= 0) continue
            if (!heroCoversVillain(stackInfo![heroIndex].stack, villainInfo.stack)) continue
            iterationBounty += bountyAmountToChips(bountyAmount, buyIn!, startingStack!)
          }
          bountyChipsWon[heroIndex] += iterationBounty
        }
      }
    } else {
      const share = 1 / winnerIndexes.length
      for (const index of winnerIndexes) ties[index] += share
    }
    completed++
  }

  if (completed === 0) {
    throw new Error('Could not run simulation — check for overlapping cards or empty ranges')
  }

  const effectiveStack = useStacks
    ? Math.min(...stackInfo!.map((info) => info.stack))
    : undefined

  const heroCallAmount =
    options.callAmount !== undefined && options.callAmount > 0
      ? options.callAmount
      : effectiveStack

  const showdown =
    useStacks && stackInfo
      ? computeShowdownPot(
          stackInfo.map((info) => info.stack),
          {
            existingPot: options.existingPot ?? 0,
            heroCallAmount,
          },
        )
      : undefined

  const potChips = showdown?.potChips
  const resolvedEffectiveStack = showdown?.effectiveStack ?? effectiveStack
  const heroContribution = showdown?.contributions[0] ?? heroCallAmount
  const capturableBountyChips = useStacks
    ? totalCapturableBountyChips(
        buildBountyBreakdown(
          buyIn!,
          startingStack!,
          stackInfo![0].stack,
          stackInfo!.slice(1),
        ),
      )
    : undefined

  const heroCallAmountForEv = heroContribution ?? heroCallAmount

  const heroResult = (() => {
    const index = 0
    const equity = ((wins[index] + ties[index]) / completed) * 100
    const avgBountyChips = bountyChipsWon[index] / completed
    const chipEvChips =
      useStacks && potChips !== undefined && heroContribution !== undefined
        ? (equity / 100) * potChips - heroContribution
        : undefined
    const totalEvChips =
      chipEvChips !== undefined ? chipEvChips + avgBountyChips : undefined
    const bountyEquityAdd =
      useStacks && potChips !== undefined && avgBountyChips > 0
        ? bountyEquityAddPct(avgBountyChips, potChips)
        : undefined
    const totalEquity =
      bountyEquityAdd !== undefined ? totalEquityWithBounty(equity, bountyEquityAdd) : undefined

    return {
      equity,
      winPct: (wins[index] / completed) * 100,
      tiePct: (ties[index] / completed) * 100,
      avgBountyChips,
      bountyEquityAdd,
      totalEquity,
      chipEvChips,
      totalEvChips,
    }
  })()

  const callEv =
    potChips !== undefined && heroCallAmountForEv !== undefined && heroCallAmountForEv > 0
      ? (() => {
          const base = buildCallEvResult(
            heroResult.equity,
            potChips,
            heroCallAmountForEv,
            heroResult.avgBountyChips,
          )
          const perWin = bountyChipsPerWin(heroResult.avgBountyChips, heroResult.winPct)
          const required = requiredEquityPct(heroCallAmountForEv, potChips, perWin)
          return {
            ...base,
            requiredEquityPct: required,
            requiredEquityNoBountyPct: requiredEquityPct(heroCallAmountForEv, potChips),
            heroEquityPct: heroResult.equity,
            equityMarginPct: heroResult.equity - required,
          }
        })()
      : undefined

  return {
    iterations: completed,
    combos: comboCounts,
    buyIn: useStacks ? buyIn : undefined,
    startingStack: useStacks ? startingStack : undefined,
    effectiveStack: resolvedEffectiveStack,
    existingPotChips: showdown?.existingPot,
    playerPotTotal: showdown?.playerTotal,
    potChips,
    capturableBountyChips,
    callEv,
    players: players.map((player, index) => {
      if (index === 0) {
        return {
          name: player.name,
          equity: heroResult.equity,
          winPct: heroResult.winPct,
          tiePct: heroResult.tiePct,
          bountyEvChips: useStacks && heroResult.avgBountyChips > 0 ? heroResult.avgBountyChips : undefined,
          bountyEquityAdd: heroResult.bountyEquityAdd,
          totalEquity: heroResult.totalEquity,
          chipEvChips: heroResult.chipEvChips,
          totalEvChips: heroResult.totalEvChips,
        }
      }

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

/**
 * How hard to work, as one choice covering both engines.
 *
 * A single equity figure and the 169-hand grid cost very different amounts
 * per iteration — the grid scores every hand against each board it deals —
 * so one iteration count cannot serve both. These pair them by how long the
 * answer takes rather than by a number that means different things in each.
 */
export interface AccuracyLevel {
  id: 'fast' | 'normal' | 'high' | 'max'
  label: string
  /** Hands dealt for a single equity figure. */
  equityIterations: number
  /** Boards dealt for the grid, each scored against all 169 hands. */
  gridIterations: number
}

export const ACCURACY_LEVELS: AccuracyLevel[] = [
  { id: 'fast', label: 'Fast', equityIterations: 50_000, gridIterations: 10_000 },
  { id: 'normal', label: 'Normal', equityIterations: 200_000, gridIterations: 25_000 },
  { id: 'high', label: 'High', equityIterations: 1_000_000, gridIterations: 60_000 },
  { id: 'max', label: 'Max', equityIterations: 4_000_000, gridIterations: 150_000 },
]

export function accuracyLevel(id: string): AccuracyLevel {
  return ACCURACY_LEVELS.find((level) => level.id === id) ?? ACCURACY_LEVELS[1]
}
