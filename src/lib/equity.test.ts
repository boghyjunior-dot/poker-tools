import { describe, expect, it } from 'vitest'
import { cardToIndex } from './cards'
import { evaluate } from './handEvaluator'
import { ACCURACY_LEVELS, accuracyLevel, calculateEquity, callVerdict, formatMarginOfError, marginOfErrorForEquity, worstCaseMarginOfError } from './equity'
import { cardFromRankSuit } from '../components/PlayingCard'
import type { RankIndex } from '../types/poker'

function c(rank: RankIndex, suit: 's' | 'h' | 'd' | 'c' = 's') {
  return cardToIndex(cardFromRankSuit(rank, suit))
}

describe('handEvaluator', () => {
  it('ranks hand categories correctly', () => {
    const royal = [c(0, 's'), c(1, 's'), c(2, 's'), c(3, 's'), c(4, 's')]
    const quads = [c(0, 's'), c(0, 'h'), c(0, 'd'), c(0, 'c'), c(1, 's')]
    const fullHouse = [c(0, 's'), c(0, 'h'), c(0, 'd'), c(1, 's'), c(1, 'h')]
    expect(evaluate(royal)).toBeGreaterThan(evaluate(quads))
    expect(evaluate(quads)).toBeGreaterThan(evaluate(fullHouse))
  })

  it('detects wheel straight', () => {
    const wheel = [c(0, 's'), c(9, 'h'), c(10, 'd'), c(11, 'c'), c(12, 's')]
    const highCard = [c(0, 's'), c(1, 'h'), c(5, 'd'), c(6, 'c'), c(7, 's')]
    expect(evaluate(wheel)).toBeGreaterThan(evaluate(highCard))
  })
})

describe('margin of error', () => {
  it('computes worst-case margin for iteration counts', () => {
    expect(worstCaseMarginOfError(10_000)).toBeCloseTo(0.98, 1)
    expect(worstCaseMarginOfError(100_000)).toBeCloseTo(0.31, 1)
  })

  it('formats margin of error', () => {
    expect(formatMarginOfError(1.39)).toBe('±1.4%')
    expect(formatMarginOfError(0.31)).toBe('±0.31%')
  })

  it('uses lower margin away from 50% equity', () => {
    expect(marginOfErrorForEquity(80, 10_000)).toBeLessThan(worstCaseMarginOfError(10_000))
  })
})

describe('reading a result as a decision', () => {
  it('calls when the equity clears the bar and folds when it does not', () => {
    expect(callVerdict(52, 38, 0.3, 1200)).toBe('call')
    expect(callVerdict(30, 38, 0.3, -900)).toBe('fold')
  })

  it('refuses to decide inside the margin of error', () => {
    // 38.1% against a bar of 38.0% at ±0.9 is noise, not an edge.
    expect(callVerdict(38.1, 38, 0.9, 5)).toBe('tooClose')
    expect(callVerdict(37.5, 38, 0.9, -5)).toBe('tooClose')
    // The same numbers at an accuracy that can tell them apart.
    expect(callVerdict(38.1, 38, 0.05, 5)).toBe('call')
  })

  it('follows the money, not the percentages', () => {
    // A bounty pays on the branch hero wins, so the EV can be positive while
    // the equity sits under a bar drawn before the bounty was counted.
    expect(callVerdict(41, 44, 0.3, 800)).toBe('call')
    expect(callVerdict(46, 44, 0.3, -800)).toBe('fold')
  })

  it('falls back to the percentages when there is no EV to read', () => {
    expect(callVerdict(41, 38, 0.3, null)).toBe('call')
    expect(callVerdict(35, 38, 0.3, null)).toBe('fold')
  })

  it('treats breaking even exactly as a call', () => {
    expect(callVerdict(44, 38, 0.3, 0)).toBe('call')
  })
})

describe('calculateEquity', () => {
  it('gives AA a strong edge vs KK', () => {
    const result = calculateEquity([
      {
        type: 'hand',
        name: 'Hero',
        cards: [cardFromRankSuit(0, 's'), cardFromRankSuit(0, 'h')],
      },
      {
        type: 'hand',
        name: 'Villain',
        cards: [cardFromRankSuit(1, 's'), cardFromRankSuit(1, 'h')],
      },
    ], { iterations: 5000 })

    expect(result.players[0].equity).toBeGreaterThan(75)
    expect(result.players[1].equity).toBeLessThan(25)
  })

  it('adds bounty EV when stacks and bounties are provided', () => {
    const result = calculateEquity(
      [
        {
          type: 'hand',
          name: 'Hero',
          cards: [cardFromRankSuit(0, 's'), cardFromRankSuit(0, 'h')],
        },
        {
          type: 'hand',
          name: 'Villain',
          cards: [cardFromRankSuit(1, 's'), cardFromRankSuit(1, 'h')],
        },
      ],
      {
        iterations: 5000,
        buyIn: 10,
        startingStack: 10_000,
        stacks: [
          { stack: 12_000 },
          { stack: 8000, bountyAmount: 10 },
        ],
      },
    )

    // $10 knockout x (10,000 / 10) = 10,000 chips, paid in full to the captor.
    expect(result.capturableBountyChips).toBe(10_000)
    expect(result.players[0].bountyEvChips).toBeGreaterThan(0)
    expect(result.players[0].bountyEquityAdd).toBeGreaterThan(0)
    expect(result.players[0].totalEquity).toBeGreaterThan(result.players[0].equity)
    expect(result.players[0].totalEvChips).toBeGreaterThan(result.players[0].chipEvChips!)
  })

  it('adds existing pot to player contributions at showdown', () => {
    const result = calculateEquity(
      [
        {
          type: 'hand',
          name: 'Hero',
          cards: [cardFromRankSuit(0, 's'), cardFromRankSuit(0, 'h')],
        },
        {
          type: 'hand',
          name: 'Villain',
          cards: [cardFromRankSuit(1, 's'), cardFromRankSuit(1, 'h')],
        },
      ],
      {
        iterations: 5000,
        buyIn: 10,
        startingStack: 10_000,
        existingPot: 2500,
        stacks: [
          { stack: 12_000 },
          { stack: 8000, bountyAmount: 10 },
        ],
      },
    )

    expect(result.existingPotChips).toBe(2500)
    expect(result.playerPotTotal).toBe(16_000)
    expect(result.potChips).toBe(18_500)
  })

  it('returns call EV suggestion for hero', () => {
    const result = calculateEquity(
      [
        {
          type: 'hand',
          name: 'Hero',
          cards: [cardFromRankSuit(0, 's'), cardFromRankSuit(0, 'h')],
        },
        {
          type: 'hand',
          name: 'Villain',
          cards: [cardFromRankSuit(1, 's'), cardFromRankSuit(1, 'h')],
        },
      ],
      {
        iterations: 5000,
        buyIn: 10,
        startingStack: 10_000,
        stacks: [
          { stack: 12_000 },
          { stack: 8000, bountyAmount: 10 },
        ],
      },
    )

    expect(result.callEv).toBeDefined()
    expect(result.callEv!.callAmount).toBe(8000)
    expect(result.callEv!.recommendation).toBe('call')
    expect(result.callEv!.evChips).toBeGreaterThan(0)
  })
})

describe('accuracy levels', () => {
  it('gets more accurate as it goes', () => {
    for (let i = 1; i < ACCURACY_LEVELS.length; i++) {
      expect(ACCURACY_LEVELS[i].equityIterations).toBeGreaterThan(
        ACCURACY_LEVELS[i - 1].equityIterations,
      )
      expect(ACCURACY_LEVELS[i].gridIterations).toBeGreaterThan(
        ACCURACY_LEVELS[i - 1].gridIterations,
      )
    }
  })

  it('asks the grid for fewer deals, each one being far more work', () => {
    // A grid deal scores 169 hands; an equity deal scores two.
    for (const level of ACCURACY_LEVELS) {
      expect(level.gridIterations).toBeLessThan(level.equityIterations)
    }
  })

  it('narrows the error bar at every step', () => {
    const margins = ACCURACY_LEVELS.map((l) => worstCaseMarginOfError(l.equityIterations))
    expect(margins[0]).toBeLessThan(0.5)
    expect(margins[margins.length - 1]).toBeLessThan(0.06)
    for (let i = 1; i < margins.length; i++) expect(margins[i]).toBeLessThan(margins[i - 1])
  })

  it('falls back to the middle when asked for a level it does not have', () => {
    expect(accuracyLevel('nonsense').id).toBe('normal')
    expect(accuracyLevel('max').id).toBe('max')
  })
})
