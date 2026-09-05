import { describe, expect, it } from 'vitest'
import {
  analyzeBankroll,
  classifyBuyIns,
  requiredBuyInsFor,
  ruinRiskAt,
  RANGE_FLOOR_DIVISOR,
  RISK_TIERS,
  shotAt,
  TIER_DEFINITIONS,
  type BankrollConfig,
} from './bankroll'

// A 5% winner in 1,000-runner fields over a 500-tournament stretch.
const base: BankrollConfig = {
  bankroll: 5_000,
  roiPct: 5,
  fieldSize: 1_000,
  itmPct: 15,
  feePct: 10,
  tournaments: 500,
  samples: 1_500,
  seed: 7,
}

describe('reading the loss distribution', () => {
  const losses = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

  it('takes the quantile that leaves only the tolerated fraction beyond it', () => {
    // 10% of runs may bust, so the roll must cover the 90th percentile.
    expect(requiredBuyInsFor(losses, 0.1)).toBe(9)
    expect(requiredBuyInsFor(losses, 0.5)).toBe(5)
  })

  it('demands more of a tighter tolerance', () => {
    expect(requiredBuyInsFor(losses, 0.01)).toBeGreaterThanOrEqual(requiredBuyInsFor(losses, 0.2))
  })

  it('reads risk back out consistently', () => {
    expect(ruinRiskAt(losses, 9)).toBeCloseTo(0.1, 9)
    expect(ruinRiskAt(losses, 5)).toBeCloseTo(0.5, 9)
    // Nothing ever lost more than 9, so a bigger roll is never busted.
    expect(ruinRiskAt(losses, 20)).toBe(0)
  })

  it('treats no bankroll as certain ruin', () => {
    expect(ruinRiskAt(losses, 0)).toBe(1)
    expect(ruinRiskAt(losses, -5)).toBe(1)
  })

  it('survives an empty distribution', () => {
    expect(requiredBuyInsFor([], 0.05)).toBe(0)
    expect(ruinRiskAt([], 10)).toBe(0)
  })
})

describe('analyzeBankroll', () => {
  const result = analyzeBankroll(base)

  it('returns all three tiers, loosest first', () => {
    expect(result.tiers.map((t) => t.id)).toEqual([...RISK_TIERS])
    expect(result.tiers[0].label).toBe('Aggressive')
  })

  it('asks for more buy-ins the safer the tier', () => {
    const [aggressive, normal, conservative] = result.tiers
    expect(aggressive.requiredBuyIns).toBeLessThan(normal.requiredBuyIns)
    expect(normal.requiredBuyIns).toBeLessThan(conservative.requiredBuyIns)
  })

  it('lets you play bigger the more risk you accept', () => {
    const [aggressive, normal, conservative] = result.tiers
    expect(aggressive.maxBuyIn).toBeGreaterThan(normal.maxBuyIn)
    expect(normal.maxBuyIn).toBeGreaterThan(conservative.maxBuyIn)
  })

  it('never quotes a buy-in the tier cannot actually support', () => {
    for (const tier of result.tiers) {
      // Rounded down, so the quoted buy-in always sits inside the tolerance.
      expect(tier.maxBuyIn * tier.requiredBuyIns).toBeLessThanOrEqual(base.bankroll + 1e-9)
      const risk = ruinRiskAt(result.lossDistribution, base.bankroll / tier.maxBuyIn)
      expect(risk).toBeLessThanOrEqual(tier.ruinTolerance + 1e-9)
    }
  })

  it('floors the range at a tenth of the ceiling', () => {
    for (const tier of result.tiers) {
      expect(tier.minBuyIn).toBeCloseTo(tier.maxBuyIn / RANGE_FLOOR_DIVISOR, 2)
      expect(tier.minBuyIn).toBeLessThan(tier.maxBuyIn)
    }
  })

  it('moves the floor with the ceiling, tier by tier', () => {
    const [aggressive, normal, conservative] = result.tiers
    expect(aggressive.minBuyIn).toBeGreaterThan(normal.minBuyIn)
    expect(normal.minBuyIn).toBeGreaterThan(conservative.minBuyIn)
  })

  it('adds the fee on top of the buy-in it quotes', () => {
    for (const tier of result.tiers) {
      expect(tier.maxEntryCost).toBeCloseTo(tier.maxBuyIn * 1.1, 6)
      expect(tier.minEntryCost).toBeCloseTo(tier.minBuyIn * 1.1, 6)
    }
  })

  it('holds each tier to its own promise about ruin', () => {
    for (const tier of result.tiers) {
      const risk = ruinRiskAt(result.lossDistribution, tier.requiredBuyIns)
      expect(risk).toBeLessThanOrEqual(tier.ruinTolerance + 1e-9)
    }
  })

  it('needs a deeper roll in bigger, higher-variance fields', () => {
    const small = analyzeBankroll({ ...base, fieldSize: 180 })
    const huge = analyzeBankroll({ ...base, fieldSize: 5_000 })
    const normalOf = (r: ReturnType<typeof analyzeBankroll>) =>
      r.tiers.find((t) => t.id === 'normal')!.requiredBuyIns
    expect(normalOf(huge)).toBeGreaterThan(normalOf(small))
  })

  it('needs a deeper roll the thinner the edge', () => {
    const thin = analyzeBankroll({ ...base, roiPct: 2 })
    const fat = analyzeBankroll({ ...base, roiPct: 30 })
    const normalOf = (r: ReturnType<typeof analyzeBankroll>) =>
      r.tiers.find((t) => t.id === 'normal')!.requiredBuyIns
    expect(normalOf(thin)).toBeGreaterThan(normalOf(fat))
  })

  it('needs a deeper roll over a longer stretch, since downswings get more chances', () => {
    const short = analyzeBankroll({ ...base, tournaments: 200 })
    const long = analyzeBankroll({ ...base, tournaments: 2_000 })
    const normalOf = (r: ReturnType<typeof analyzeBankroll>) =>
      r.tiers.find((t) => t.id === 'normal')!.requiredBuyIns
    expect(normalOf(long)).toBeGreaterThan(normalOf(short))
  })

  it('turns a losing player into a demand no bankroll can meet', () => {
    const losing = analyzeBankroll({ ...base, roiPct: -10 })
    expect(losing.evPerTournament).toBeLessThan(0)
    // A losing player always finds the bottom, so the requirement runs away.
    const winner = result.tiers.find((t) => t.id === 'normal')!.requiredBuyIns
    expect(losing.tiers.find((t) => t.id === 'normal')!.requiredBuyIns).toBeGreaterThan(winner)
  })

  it('is reproducible for a given seed and moves with a different one', () => {
    const again = analyzeBankroll(base)
    expect(again.tiers[1].requiredBuyIns).toBe(result.tiers[1].requiredBuyIns)
    const other = analyzeBankroll({ ...base, seed: 99 })
    expect(other.lossDistribution).not.toEqual(result.lossDistribution)
  })

  it('reports a sane model underneath', () => {
    expect(result.paidPlaces).toBe(150)
    expect(result.itmProbability).toBeGreaterThan(0.15)
    expect(result.evPerTournament).toBeGreaterThan(0)
    expect(Number.isFinite(result.skill)).toBe(true)
  })
})

describe('classifyBuyIns', () => {
  const result = analyzeBankroll(base)
  const verdicts = classifyBuyIns(result, base.bankroll, base.feePct)

  it('covers every listed buy-in', () => {
    expect(verdicts.length).toBeGreaterThan(10)
    expect(verdicts[0].buyIn).toBeLessThan(verdicts[verdicts.length - 1].buyIn)
  })

  it('gets riskier as the buy-in climbs', () => {
    for (let i = 1; i < verdicts.length; i++) {
      expect(verdicts[i].ruinRisk).toBeGreaterThanOrEqual(verdicts[i - 1].ruinRisk)
      expect(verdicts[i].buyInsDeep).toBeLessThan(verdicts[i - 1].buyInsDeep)
    }
  })

  it('labels a buy-in with the safest tier that allows it', () => {
    for (const verdict of verdicts) {
      if (verdict.tier === null) {
        expect(verdict.ruinRisk).toBeGreaterThan(TIER_DEFINITIONS.aggressive.ruinTolerance)
        expect(verdict.playable).toBe(false)
      } else {
        expect(verdict.ruinRisk).toBeLessThanOrEqual(TIER_DEFINITIONS[verdict.tier].ruinTolerance)
      }
    }
  })

  it('never calls a buy-in safe that a looser tier already rejects', () => {
    const order = { conservative: 0, normal: 1, aggressive: 2 }
    let seen = -1
    for (const verdict of verdicts) {
      if (verdict.tier === null) continue
      // Tiers may only loosen as buy-ins grow, never tighten again.
      expect(order[verdict.tier]).toBeGreaterThanOrEqual(seen)
      seen = order[verdict.tier]
    }
  })

  it('quotes the entry cost with the fee included', () => {
    const eleven = verdicts.find((v) => v.buyIn === 11)!
    expect(eleven.entryCost).toBeCloseTo(12.1, 6)
  })

  it('accepts a custom list of buy-ins', () => {
    const custom = classifyBuyIns(result, base.bankroll, 0, [10, 100])
    expect(custom.map((v) => v.buyIn)).toEqual([10, 100])
    expect(custom[0].entryCost).toBe(10)
  })
})

describe('shotAt', () => {
  const result = analyzeBankroll(base)

  it('works out what is missing and how long it takes to earn', () => {
    const shot = shotAt(result, base.bankroll, 109, 'normal')
    expect(shot.needed).toBeGreaterThan(base.bankroll)
    expect(shot.shortfall).toBeCloseTo(shot.needed - base.bankroll, 6)
    expect(shot.tournaments).toBeGreaterThan(0)
  })

  it('says nothing is missing once the roll is already there', () => {
    const shot = shotAt(result, 1_000_000, 11, 'normal')
    expect(shot.shortfall).toBe(0)
    expect(shot.tournaments).toBeNull()
  })

  it('refuses to promise a losing player will ever get there', () => {
    const losing = analyzeBankroll({ ...base, roiPct: -10 })
    const shot = shotAt(losing, 500, 109, 'normal')
    expect(shot.shortfall).toBeGreaterThan(0)
    expect(shot.tournaments).toBeNull()
  })
})
