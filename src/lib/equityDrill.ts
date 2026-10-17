/**
 * The one question the calculator exists to answer, asked back at you.
 *
 * Reading an equity off a tool teaches you the tool. Guessing first and then
 * being told teaches you the spot — and the gap between "that looks like a
 * call" and 38% is where the money is. So a drill is a hand, a range and a
 * price, and the only thing to say is whether you have enough.
 *
 * Nothing here stores an answer. Each spot is solved by the same engine the
 * rest of the page uses, so a drill cannot come to disagree with the
 * calculator sitting next to it, and nobody has to keep a table of
 * hand-worked percentages true.
 */

import { calculateEquity, marginOfErrorForEquity } from './equity'
import { requiredEquityPct } from './equityBounty'
import { EQUITY_PRESET_RANGES, parsePredefinedRange } from './predefinedRanges'
import type { RangeCellStates } from './equityRange'
import { RANKS, type BoardCard, type RankIndex, type SuitId } from '../types/poker'

export interface DrillSpot {
  id: string
  /** Hero's cards, written the way everyone writes them: 'As', 'Kd'. */
  hand: [string, string]
  /** The villain's range, by preset id, so the drill shows a range you know. */
  villain: string
  /** What is already in the middle when it is on you. */
  pot: number
  /** What calling costs. */
  call: number
  /** The story, in one line. */
  blurb: string
}

const SUITS: SuitId[] = ['s', 'h', 'd', 'c']

/** "As" to a card. Null for anything that is not one, rather than a guess. */
export function parseCardToken(token: string): BoardCard | null {
  const text = token.trim()
  if (text.length !== 2) return null
  const rank = RANKS.indexOf(text[0].toUpperCase() as (typeof RANKS)[number])
  const suit = text[1].toLowerCase() as SuitId
  if (rank < 0 || !SUITS.includes(suit)) return null
  return { rank: rank as RankIndex, suit }
}

/** Ordinary pot odds: what you put in over what the pot pays once you have. */
export function requiredEquityFor(spot: DrillSpot): number {
  return requiredEquityPct(spot.call, spot.pot + spot.call)
}

/** The price said the way it gets said out loud. */
export function priceOf(spot: DrillSpot): string {
  if (spot.call <= 0) return '—'
  return `${(spot.pot / spot.call).toFixed(1)} : 1`
}

export function villainRangeOf(spot: DrillSpot): {
  label: string
  description: string
  cellStates: RangeCellStates
} | null {
  const preset = EQUITY_PRESET_RANGES.find((item) => item.id === spot.villain)
  if (!preset) return null
  return {
    label: preset.label,
    description: preset.description,
    cellStates: parsePredefinedRange(preset) as RangeCellStates,
  }
}

export interface DrillSolution {
  /** Hero's share of the pot at showdown. */
  equity: number
  /** Sampling error on that, at 95%. */
  margin: number
  /** What the price demands. */
  needed: number
  /** Whether the equity clears it. */
  enough: boolean
  /** True when the sample cannot tell the two apart. */
  tooClose: boolean
  iterations: number
}

/**
 * Work a drill out.
 *
 * `tooClose` matters more here than anywhere else on the page: a question
 * whose answer is inside the margin of error is not a question, it is a coin
 * flip being marked right or wrong. The authored spots are checked against
 * this in the tests, so none of them can ship that way.
 */
export function solveDrill(spot: DrillSpot, iterations = 120_000): DrillSolution {
  const villain = villainRangeOf(spot)
  const cards = spot.hand.map(parseCardToken)
  const needed = requiredEquityFor(spot)

  if (!villain || !cards[0] || !cards[1]) {
    return { equity: 0, margin: 0, needed, enough: false, tooClose: true, iterations: 0 }
  }

  const result = calculateEquity(
    [
      { type: 'hand', name: 'You', cards: [cards[0], cards[1]] },
      { type: 'range', name: villain.label, cellStates: villain.cellStates },
    ],
    { iterations },
  )

  const equity = result.players[0].equity
  const margin = marginOfErrorForEquity(equity, result.iterations)
  return {
    equity,
    margin,
    needed,
    enough: equity >= needed,
    tooClose: Math.abs(equity - needed) <= margin,
    iterations: result.iterations,
  }
}

/**
 * Ten spots, chosen to be wrong-footing in different directions.
 *
 * KQs and ATo look like calls and are folds; 76s, A5s and deuces look like
 * folds and are calls. A drill where the pretty hand is always the answer
 * teaches you to read the cards instead of the price, which is the habit
 * this is meant to break.
 */
export const DRILL_SPOTS: DrillSpot[] = [
  {
    id: 'd1',
    hand: ['Ac', 'Kd'],
    villain: 'top-20',
    pot: 3000,
    call: 2000,
    blurb: 'A 20% range jams and you have the best offsuit hand there is.',
  },
  {
    id: 'd2',
    hand: ['8h', '8s'],
    villain: 'prem-qq-ako',
    pot: 1200,
    call: 1000,
    blurb: 'Middling pair against the tightest range on the list.',
  },
  {
    id: 'd3',
    hand: ['Ad', '5d'],
    villain: 'prem-66-ats',
    pot: 4000,
    call: 1500,
    blurb: 'The wheel ace, suited, getting a decent price.',
  },
  {
    id: 'd4',
    hand: ['Kh', 'Qh'],
    villain: 'prem-tt-aqo',
    pot: 2200,
    call: 2000,
    blurb: 'Suited broadway into a range built on the hands that dominate it.',
  },
  {
    id: 'd5',
    hand: ['7s', '6s'],
    villain: 'top-10',
    pot: 5000,
    call: 1200,
    blurb: 'A suited connector at a good price against a tight jam.',
  },
  {
    id: 'd6',
    hand: ['Jc', 'Jh'],
    villain: 'prem-sb-vs-bu',
    pot: 2000,
    call: 1600,
    blurb: 'Jacks against the wide range a small blind defends with.',
  },
  {
    id: 'd7',
    hand: ['Ah', 'Ts'],
    villain: 'prem-88-ajs',
    pot: 1800,
    call: 1500,
    blurb: 'Ace-ten offsuit, and most of what calls has it beaten.',
  },
  {
    id: 'd8',
    hand: ['2c', '2d'],
    villain: 'top-50',
    pot: 2600,
    call: 1400,
    blurb: 'The worst pair there is, against half the deck.',
  },
  {
    id: 'd9',
    hand: ['Qd', 'Jd'],
    villain: 'resteal-bb-icm',
    pot: 3400,
    call: 1600,
    blurb: 'Queen-jack suited against a polarised ICM resteal.',
  },
  {
    id: 'd10',
    hand: ['As', '9c'],
    villain: 'prem-co-vs-hj-mp',
    pot: 2400,
    call: 2000,
    blurb: 'Ace-nine offsuit, laid a short price by a cutoff continuing range.',
  },
]
