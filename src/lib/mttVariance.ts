/**
 * MTT variance simulator.
 *
 * Model
 * -----
 * 1. **Payouts.** The top `itmPct` of the field is paid. Prize for place `i`
 *    is proportional to `1/i`, normalised over the prize pool. That harmonic
 *    curve is a close fit to real MTT structures across field sizes: it gives
 *    the winner ~30% of the pool in a 100-runner event, ~18% at 1,000 and
 *    ~13% at 10,000, with a min-cash around 1-1.5 buy-ins.
 *
 * 2. **Finish position.** Draw `u ~ U(0,1)` and take the finishing quantile as
 *    `q = u^(1+s)`, so position = ceil(q * fieldSize). At `s = 0` the finish is
 *    uniform — a break-even player before rake. `s > 0` skews toward the top of
 *    the field, `s < 0` toward the bottom. Because
 *
 *        P(place = i) = (i/N)^(1/(1+s)) - ((i-1)/N)^(1/(1+s))
 *
 *    expected payout has a closed form and rises monotonically in `s`, so the
 *    skill that produces a given ROI is found by bisection.
 *
 * Everything is seeded, so the same inputs always produce the same chart.
 */

export interface VarianceConfig {
  buyIn: number
  fee: number
  fieldSize: number
  itmPct: number
  roiPct: number
  tournaments: number
  samples: number
  bankroll?: number
  seed?: number
}

export interface VarianceStats {
  skill: number
  paidPlaces: number
  prizePool: number
  costPerTournament: number
  itmProbability: number
  expectedProfit: number
  expectedProfitPerTournament: number
  observedRoiPct: number
  stdDevFinal: number
  percentiles: { p5: number; p25: number; p50: number; p75: number; p95: number }
  probLoss: number
  avgMaxDrawdown: number
  worstMaxDrawdown: number
  riskOfRuin: number | null
}

export interface VarianceBand {
  ev: number[]
  p5: number[]
  p25: number[]
  p50: number[]
  p75: number[]
  p95: number[]
}

export interface HistogramBin {
  start: number
  end: number
  count: number
}

export interface VarianceResult {
  stats: VarianceStats
  checkpoints: number[]
  samplePaths: number[][]
  band: VarianceBand
  finals: number[]
  histogram: HistogramBin[]
}

export const MAX_TOURNAMENTS = 20_000
export const MAX_SAMPLES = 5_000
const CHART_PATHS = 20
const CHART_CHECKPOINTS = 120
const HISTOGRAM_BINS = 32

/** Deterministic PRNG so a given seed always redraws the same simulation. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Prize for each paid place, in currency, using the 1/i harmonic curve. */
export function buildPayouts(fieldSize: number, itmPct: number, prizePool: number): number[] {
  const paidPlaces = Math.max(1, Math.min(fieldSize, Math.round((fieldSize * itmPct) / 100)))
  let harmonic = 0
  for (let i = 1; i <= paidPlaces; i++) harmonic += 1 / i

  const payouts = new Array<number>(paidPlaces)
  for (let i = 1; i <= paidPlaces; i++) {
    payouts[i - 1] = (prizePool * (1 / i)) / harmonic
  }
  return payouts
}

/** Closed-form expected payout for a player with skill `s`. */
export function expectedPayout(payouts: readonly number[], fieldSize: number, skill: number): number {
  const exponent = 1 / (1 + skill)
  let total = 0
  let prevCdf = 0
  for (let i = 1; i <= payouts.length; i++) {
    const cdf = Math.pow(i / fieldSize, exponent)
    total += payouts[i - 1] * (cdf - prevCdf)
    prevCdf = cdf
  }
  return total
}

/**
 * Find the skill parameter that produces `targetRoiPct`. Expected payout is
 * monotonic in skill, so plain bisection converges.
 */
export function solveSkill(
  payouts: readonly number[],
  fieldSize: number,
  costPerTournament: number,
  targetRoiPct: number,
): number {
  const targetPayout = costPerTournament * (1 + targetRoiPct / 100)

  let lo = -0.999
  let hi = 1
  // Expand the upper bound until it brackets the target (very high ROIs).
  while (expectedPayout(payouts, fieldSize, hi) < targetPayout && hi < 1e6) hi *= 2

  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    if (expectedPayout(payouts, fieldSize, mid) < targetPayout) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0
  const index = (sorted.length - 1) * p
  const low = Math.floor(index)
  const high = Math.ceil(index)
  if (low === high) return sorted[low]
  return sorted[low] + (sorted[high] - sorted[low]) * (index - low)
}

function buildHistogram(finals: readonly number[]): HistogramBin[] {
  if (finals.length === 0) return []
  let min = Infinity
  let max = -Infinity
  for (const value of finals) {
    if (value < min) min = value
    if (value > max) max = value
  }
  if (min === max) return [{ start: min, end: max, count: finals.length }]

  const width = (max - min) / HISTOGRAM_BINS
  const bins: HistogramBin[] = Array.from({ length: HISTOGRAM_BINS }, (_, i) => ({
    start: min + i * width,
    end: min + (i + 1) * width,
    count: 0,
  }))
  for (const value of finals) {
    const index = Math.min(HISTOGRAM_BINS - 1, Math.floor((value - min) / width))
    bins[index].count++
  }
  return bins
}

export function simulateVariance(config: VarianceConfig): VarianceResult {
  const tournaments = Math.max(1, Math.min(MAX_TOURNAMENTS, Math.floor(config.tournaments)))
  const samples = Math.max(1, Math.min(MAX_SAMPLES, Math.floor(config.samples)))
  const fieldSize = Math.max(2, Math.floor(config.fieldSize))

  const prizePool = fieldSize * config.buyIn
  const costPerTournament = config.buyIn + config.fee
  const payouts = buildPayouts(fieldSize, config.itmPct, prizePool)
  const paidPlaces = payouts.length
  const skill = solveSkill(payouts, fieldSize, costPerTournament, config.roiPct)

  const exponent = 1 / (1 + skill)
  // A player only cashes when u^(1+s) * N <= paidPlaces, i.e. u <= this
  // threshold — so the pow is only paid for on the ~15% of runs that cash.
  const cashThreshold = Math.pow(paidPlaces / fieldSize, exponent)

  const expectedPerTournament = expectedPayout(payouts, fieldSize, skill) - costPerTournament
  const itmProbability = cashThreshold

  // Evenly spaced checkpoints, always including the final tournament.
  const checkpointCount = Math.min(CHART_CHECKPOINTS, tournaments)
  const checkpoints = new Array<number>(checkpointCount)
  for (let i = 0; i < checkpointCount; i++) {
    checkpoints[i] = Math.max(1, Math.round(((i + 1) * tournaments) / checkpointCount))
  }

  const random = mulberry32(config.seed ?? 1)
  const finals = new Array<number>(samples)
  const drawdowns = new Array<number>(samples)
  const pathCount = Math.min(CHART_PATHS, samples)
  const samplePaths: number[][] = []
  // checkpointValues[c][sample] — filled per sample, then sorted per checkpoint.
  const checkpointValues: Float64Array[] = checkpoints.map(() => new Float64Array(samples))

  const bankroll = config.bankroll && config.bankroll > 0 ? config.bankroll : null
  let ruinCount = 0
  let lossCount = 0
  let drawdownTotal = 0
  let worstDrawdown = 0

  for (let sample = 0; sample < samples; sample++) {
    let profit = 0
    let peak = 0
    let maxDrawdown = 0
    let ruined = false
    let checkpointIndex = 0
    const path = sample < pathCount ? new Array<number>(checkpointCount) : null

    for (let t = 1; t <= tournaments; t++) {
      const u = random()
      if (u <= cashThreshold) {
        const place = Math.min(paidPlaces, Math.max(1, Math.ceil(Math.pow(u, 1 + skill) * fieldSize)))
        profit += payouts[place - 1]
      }
      profit -= costPerTournament

      if (profit > peak) peak = profit
      const drawdown = peak - profit
      if (drawdown > maxDrawdown) maxDrawdown = drawdown
      if (bankroll !== null && !ruined && profit <= -bankroll) ruined = true

      while (checkpointIndex < checkpointCount && checkpoints[checkpointIndex] === t) {
        checkpointValues[checkpointIndex][sample] = profit
        if (path) path[checkpointIndex] = profit
        checkpointIndex++
      }
    }

    finals[sample] = profit
    drawdowns[sample] = maxDrawdown
    drawdownTotal += maxDrawdown
    if (maxDrawdown > worstDrawdown) worstDrawdown = maxDrawdown
    if (profit < 0) lossCount++
    if (ruined) ruinCount++
    if (path) samplePaths.push(path)
  }

  const band: VarianceBand = { ev: [], p5: [], p25: [], p50: [], p75: [], p95: [] }
  for (let c = 0; c < checkpointCount; c++) {
    const sorted = Array.from(checkpointValues[c]).sort((a, b) => a - b)
    band.ev.push(expectedPerTournament * checkpoints[c])
    band.p5.push(percentile(sorted, 0.05))
    band.p25.push(percentile(sorted, 0.25))
    band.p50.push(percentile(sorted, 0.5))
    band.p75.push(percentile(sorted, 0.75))
    band.p95.push(percentile(sorted, 0.95))
  }

  const sortedFinals = [...finals].sort((a, b) => a - b)
  const mean = finals.reduce((sum, value) => sum + value, 0) / samples
  const variance =
    finals.reduce((sum, value) => sum + (value - mean) * (value - mean), 0) / Math.max(1, samples - 1)
  const totalStaked = costPerTournament * tournaments

  return {
    stats: {
      skill,
      paidPlaces,
      prizePool,
      costPerTournament,
      itmProbability,
      expectedProfit: expectedPerTournament * tournaments,
      expectedProfitPerTournament: expectedPerTournament,
      observedRoiPct: totalStaked > 0 ? (mean / totalStaked) * 100 : 0,
      stdDevFinal: Math.sqrt(variance),
      percentiles: {
        p5: percentile(sortedFinals, 0.05),
        p25: percentile(sortedFinals, 0.25),
        p50: percentile(sortedFinals, 0.5),
        p75: percentile(sortedFinals, 0.75),
        p95: percentile(sortedFinals, 0.95),
      },
      probLoss: lossCount / samples,
      avgMaxDrawdown: drawdownTotal / samples,
      worstMaxDrawdown: worstDrawdown,
      riskOfRuin: bankroll !== null ? ruinCount / samples : null,
    },
    checkpoints,
    samplePaths,
    band,
    finals,
    histogram: buildHistogram(finals),
  }
}
