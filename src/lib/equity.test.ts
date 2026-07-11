import { describe, expect, it } from 'vitest'
import { cardToIndex } from './cards'
import { evaluate } from './handEvaluator'
import { calculateEquity, formatMarginOfError, marginOfErrorForEquity, worstCaseMarginOfError } from './equity'
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

    expect(result.capturableBountyChips).toBe(5000)
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
