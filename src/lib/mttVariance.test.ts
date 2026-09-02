import { describe, expect, it } from 'vitest'
import {
  buildPayouts,
  expectedPayout,
  mulberry32,
  simulateVariance,
  solveSkill,
  type VarianceConfig,
} from './mttVariance'

const baseConfig: VarianceConfig = {
  buyIn: 100,
  fee: 10,
  fieldSize: 1000,
  itmPct: 15,
  roiPct: 20,
  tournaments: 500,
  samples: 300,
  seed: 42,
}

describe('buildPayouts', () => {
  it('pays the top itmPct of the field and distributes the whole pool', () => {
    const payouts = buildPayouts(1000, 15, 100_000)
    expect(payouts).toHaveLength(150)
    expect(payouts.reduce((a, b) => a + b, 0)).toBeCloseTo(100_000, 6)
  })

  it('is monotonically decreasing from first place down', () => {
    const payouts = buildPayouts(500, 15, 50_000)
    for (let i = 1; i < payouts.length; i++) {
      expect(payouts[i]).toBeLessThan(payouts[i - 1])
    }
  })

  it('gives a realistic winner share across field sizes', () => {
    const share = (field: number) => buildPayouts(field, 15, 1) [0]
    // Winner takes a smaller slice as the field grows.
    expect(share(100)).toBeGreaterThan(0.25)
    expect(share(100)).toBeLessThan(0.35)
    expect(share(1000)).toBeGreaterThan(0.15)
    expect(share(1000)).toBeLessThan(0.21)
    expect(share(10_000)).toBeGreaterThan(0.1)
    expect(share(10_000)).toBeLessThan(0.16)
    expect(share(10_000)).toBeLessThan(share(1000))
  })

  it('always pays at least one place, even for tiny fields or itm', () => {
    expect(buildPayouts(6, 1, 600)).toHaveLength(1)
    expect(buildPayouts(6, 1, 600)[0]).toBeCloseTo(600)
  })
})

describe('expectedPayout', () => {
  it('returns the average prize per entrant at zero skill', () => {
    const fieldSize = 500
    const pool = fieldSize * 100
    const payouts = buildPayouts(fieldSize, 15, pool)
    // A uniformly-finishing player wins pool / fieldSize on average.
    expect(expectedPayout(payouts, fieldSize, 0)).toBeCloseTo(pool / fieldSize, 6)
  })

  it('increases monotonically with skill', () => {
    const payouts = buildPayouts(1000, 15, 100_000)
    let previous = -Infinity
    for (const skill of [-0.5, -0.2, 0, 0.2, 0.5, 1, 2]) {
      const value = expectedPayout(payouts, 1000, skill)
      expect(value).toBeGreaterThan(previous)
      previous = value
    }
  })
})

describe('solveSkill', () => {
  it('recovers a skill that hits the requested ROI', () => {
    const fieldSize = 1000
    const payouts = buildPayouts(fieldSize, 15, fieldSize * 100)
    for (const roi of [-30, -10, 0, 15, 50, 200]) {
      const skill = solveSkill(payouts, fieldSize, 110, roi)
      const realised = (expectedPayout(payouts, fieldSize, skill) - 110) / 110
      expect(realised * 100).toBeCloseTo(roi, 4)
    }
  })

  it('returns zero skill when the target ROI is exactly the rake drag', () => {
    const fieldSize = 1000
    const payouts = buildPayouts(fieldSize, 15, fieldSize * 100)
    // At skill 0 a player wins buyIn on average, so ROI = -fee / (buyIn + fee).
    const rakeRoi = (-10 / 110) * 100
    expect(solveSkill(payouts, fieldSize, 110, rakeRoi)).toBeCloseTo(0, 6)
  })
})

describe('mulberry32', () => {
  it('is deterministic for a given seed and stays in [0, 1)', () => {
    const a = mulberry32(7)
    const b = mulberry32(7)
    for (let i = 0; i < 100; i++) {
      const value = a()
      expect(value).toBe(b())
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('gives different streams for different seeds', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)())
  })
})

describe('simulateVariance', () => {
  it('lands close to the requested ROI over many samples', () => {
    const result = simulateVariance({ ...baseConfig, samples: 2000, tournaments: 2000 })
    expect(result.stats.observedRoiPct).toBeGreaterThan(18)
    expect(result.stats.observedRoiPct).toBeLessThan(22)
  })

  it('matches expected profit to cost x tournaments x ROI', () => {
    const result = simulateVariance(baseConfig)
    const expected = 110 * 500 * 0.2
    expect(result.stats.expectedProfit).toBeCloseTo(expected, 6)
  })

  it('reports an ITM probability near the paid fraction for a break-even player', () => {
    const result = simulateVariance({ ...baseConfig, roiPct: (-10 / 110) * 100 })
    // Zero skill means a uniform finish, so ITM% equals the paid fraction.
    expect(result.stats.itmProbability).toBeCloseTo(0.15, 6)
  })

  it('gives a winning player a higher ITM% than a losing one', () => {
    const winner = simulateVariance({ ...baseConfig, roiPct: 50 })
    const loser = simulateVariance({ ...baseConfig, roiPct: -50 })
    expect(winner.stats.itmProbability).toBeGreaterThan(loser.stats.itmProbability)
    expect(winner.stats.skill).toBeGreaterThan(loser.stats.skill)
  })

  it('is reproducible for a seed and varies across seeds', () => {
    const a = simulateVariance({ ...baseConfig, seed: 5 })
    const b = simulateVariance({ ...baseConfig, seed: 5 })
    const c = simulateVariance({ ...baseConfig, seed: 6 })
    expect(a.finals).toEqual(b.finals)
    expect(a.finals).not.toEqual(c.finals)
  })

  it('produces ordered percentile bands at every checkpoint', () => {
    const { band, checkpoints } = simulateVariance(baseConfig)
    expect(band.p50).toHaveLength(checkpoints.length)
    for (let i = 0; i < checkpoints.length; i++) {
      expect(band.p5[i]).toBeLessThanOrEqual(band.p25[i])
      expect(band.p25[i]).toBeLessThanOrEqual(band.p50[i])
      expect(band.p50[i]).toBeLessThanOrEqual(band.p75[i])
      expect(band.p75[i]).toBeLessThanOrEqual(band.p95[i])
    }
  })

  it('ends its checkpoints on the final tournament', () => {
    const { checkpoints } = simulateVariance(baseConfig)
    expect(checkpoints[checkpoints.length - 1]).toBe(500)
    for (let i = 1; i < checkpoints.length; i++) {
      expect(checkpoints[i]).toBeGreaterThan(checkpoints[i - 1])
    }
  })

  it('draws sample paths that end on their sample final profit', () => {
    const result = simulateVariance(baseConfig)
    expect(result.samplePaths).toHaveLength(20)
    result.samplePaths.forEach((path, index) => {
      expect(path).toHaveLength(result.checkpoints.length)
      expect(path[path.length - 1]).toBeCloseTo(result.finals[index], 6)
    })
  })

  it('bins every sample into the histogram', () => {
    const result = simulateVariance(baseConfig)
    const total = result.histogram.reduce((sum, bin) => sum + bin.count, 0)
    expect(total).toBe(result.finals.length)
  })

  it('reports risk of ruin only when a bankroll is given', () => {
    expect(simulateVariance(baseConfig).stats.riskOfRuin).toBeNull()
    const withBankroll = simulateVariance({ ...baseConfig, bankroll: 1000 })
    expect(withBankroll.stats.riskOfRuin).toBeGreaterThan(0)
    expect(withBankroll.stats.riskOfRuin).toBeLessThanOrEqual(1)
  })

  it('makes ruin less likely as the bankroll grows', () => {
    const small = simulateVariance({ ...baseConfig, bankroll: 500 }).stats.riskOfRuin!
    const large = simulateVariance({ ...baseConfig, bankroll: 50_000 }).stats.riskOfRuin!
    expect(large).toBeLessThan(small)
  })

  it('gives a losing player a high probability of finishing down', () => {
    const result = simulateVariance({ ...baseConfig, roiPct: -40, tournaments: 1000 })
    expect(result.stats.probLoss).toBeGreaterThan(0.9)
  })

  it('keeps drawdowns non-negative, with the worst at least the average', () => {
    const { stats } = simulateVariance(baseConfig)
    expect(stats.avgMaxDrawdown).toBeGreaterThanOrEqual(0)
    expect(stats.worstMaxDrawdown).toBeGreaterThanOrEqual(stats.avgMaxDrawdown)
  })

  it('clamps absurd inputs instead of hanging', () => {
    const result = simulateVariance({ ...baseConfig, tournaments: 1e9, samples: 1e9 })
    expect(Number.isFinite(result.stats.expectedProfit)).toBe(true)
    expect(result.finals.length).toBeLessThanOrEqual(5000)
    expect(result.checkpoints[result.checkpoints.length - 1]).toBeLessThanOrEqual(20_000)
  })
})
