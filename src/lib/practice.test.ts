import { describe, expect, it } from 'vitest'
import { buildStreetScore, randomBoardCards, scoreStreet } from './practice'

describe('practice', () => {
  it('draws unique board cards', () => {
    const flop = randomBoardCards(3)
    expect(flop).toHaveLength(3)
    const ids = flop.map((c) => `${c.rank}-${c.suit}`)
    expect(new Set(ids).size).toBe(3)

    const turn = randomBoardCards(1, flop)
    expect(turn).toHaveLength(1)
    expect(ids).not.toContain(`${turn[0].rank}-${turn[0].suit}`)
  })

  it('scores streets by distance from target', () => {
    expect(scoreStreet(50, 50).points).toBe(3)
    expect(scoreStreet(52, 50).points).toBe(2)
    expect(scoreStreet(54, 50).points).toBe(1)
    expect(scoreStreet(60, 50).points).toBe(0)
  })

  it('builds street score with bet target', () => {
    const score = buildStreetScore('flop', 'b50', 33)
    expect(score.targetPct).toBe(33)
    expect(score.points).toBe(3)
  })
})
