import { describe, expect, it } from 'vitest'
import {
  bountyChipsPerWin,
  requiredEquityPct,
  bountyAmountToChips,
  bountyEquityAddPct,
  buildBountyBreakdown,
  buildCallEvResult,
  callEvChips,
  computeShowdownPot,
  heroCoversVillain,
  PKO_IMMEDIATE_CAPTURE,
  totalCapturableBountyChips,
  totalEquityWithBounty,
} from './equityBounty'

describe('equityBounty', () => {
  it('converts bounty amount to chips from buy-in and starting stack', () => {
    expect(bountyAmountToChips(5, 10, 10_000)).toBe(5000)
    expect(bountyAmountToChips(5.5, 11, 10_000)).toBeCloseTo(5000, 0)
  })

  it('checks coverage for bounty capture', () => {
    expect(heroCoversVillain(12_000, 8000)).toBe(true)
    expect(heroCoversVillain(8000, 12_000)).toBe(false)
  })

  it('builds capturable bounty chips for covered villains only', () => {
    const breakdown = buildBountyBreakdown(10, 10_000, 12_000, [
      { stack: 8000, bountyAmount: 5 },
      { stack: 15_000, bountyAmount: 10 },
    ])
    expect(breakdown[0].bountyChips).toBe(5000)
    expect(breakdown[0].captureChips).toBe(PKO_IMMEDIATE_CAPTURE * 5000)
    expect(breakdown[1].captureChips).toBe(0)
    expect(totalCapturableBountyChips(breakdown)).toBe(2500)
  })

  it('expresses bounty EV as added equity percent of the pot', () => {
    expect(bountyEquityAddPct(2500, 16_000)).toBeCloseTo(15.625, 2)
    expect(totalEquityWithBounty(82, 15.625)).toBeCloseTo(97.625, 2)
  })

  it('computes call EV from showdown pot and call amount', () => {
    expect(callEvChips(50, 16_000, 8000)).toBe(0)
    expect(callEvChips(60, 20_000, 8000, 500)).toBe(4500)
    const result = buildCallEvResult(82, 16_000, 8000, 500)
    expect(result.evChips).toBe(5620)
    expect(result.recommendation).toBe('call')
    expect(buildCallEvResult(30, 16_000, 8000).recommendation).toBe('fold')
  })

  it('computes showdown pot as existing pot plus player contributions', () => {
    const result = computeShowdownPot([12_000, 8000], { existingPot: 1500 })
    expect(result.contributions).toEqual([8000, 8000])
    expect(result.playerTotal).toBe(16_000)
    expect(result.potChips).toBe(17_500)
  })
})

describe('required equity', () => {
  it('is ordinary pot odds, because the pot already includes your call', () => {
    // Risk 8,000 to win a 16,000 pot: a coin flip breaks even.
    expect(requiredEquityPct(8000, 16_000)).toBeCloseTo(50, 9)
    // 10,000 into a 21,500 pot — the case the calculator shows by default.
    expect(requiredEquityPct(10_000, 21_500)).toBeCloseTo(46.51, 2)
  })

  it('agrees with the EV calculation about where break-even is', () => {
    const call = 10_000
    const pot = 21_500
    const required = requiredEquityPct(call, pot)
    expect(callEvChips(required, pot, call)).toBeCloseTo(0, 6)
    expect(callEvChips(required + 1, pot, call)).toBeGreaterThan(0)
    expect(callEvChips(required - 1, pot, call)).toBeLessThan(0)
  })

  it('drops as the pot grows and rises as the call does', () => {
    expect(requiredEquityPct(8000, 40_000)).toBeLessThan(requiredEquityPct(8000, 16_000))
    expect(requiredEquityPct(12_000, 16_000)).toBeGreaterThan(requiredEquityPct(8000, 16_000))
  })

  it('lets a collectable bounty lower the bar', () => {
    const without = requiredEquityPct(8000, 16_000)
    const withBounty = requiredEquityPct(8000, 16_000, 8000)
    expect(withBounty).toBeLessThan(without)
    // Risking 8,000 to win 16,000 plus an 8,000 bounty is one in three.
    expect(withBounty).toBeCloseTo(33.33, 2)
  })

  it('never claims you need more than everything, or less than nothing', () => {
    expect(requiredEquityPct(50_000, 10_000)).toBe(100)
    expect(requiredEquityPct(0, 10_000)).toBe(0)
    expect(requiredEquityPct(-5, 10_000)).toBe(0)
    expect(requiredEquityPct(8000, 0)).toBe(0)
  })

  it('divides the win probability back out of the average bounty', () => {
    // 400 chips banked across all runs at a 40% win rate is 1,000 per win.
    expect(bountyChipsPerWin(400, 40)).toBeCloseTo(1000, 9)
    expect(bountyChipsPerWin(0, 40)).toBe(0)
    expect(bountyChipsPerWin(400, 0)).toBe(0)
  })

  it('counts the win probability once, not twice', () => {
    // Feeding the raw average in would understate the discount.
    const perWin = bountyChipsPerWin(400, 40)
    expect(requiredEquityPct(8000, 16_000, perWin)).toBeLessThan(
      requiredEquityPct(8000, 16_000, 400),
    )
  })
})
