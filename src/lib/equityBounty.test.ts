import { describe, expect, it } from 'vitest'
import {
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
