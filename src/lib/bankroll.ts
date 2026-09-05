import { buildPayouts, mulberry32, solveSkill } from './mttVariance'

/**
 * Bankroll sizing for MTTs.
 *
 * The usual advice is a flat number of buy-ins, which cannot be right: a 180-man
 * turbo and a 5,000-runner Sunday major have wildly different variance, and a
 * 25% ROI grinder needs far less cushion than a 5% one. So rather than quote a
 * rule of thumb, this simulates the same tournament model the variance tool
 * uses and reads the answer off the loss distribution.
 *
 * The trick that makes it cheap: run the simulation once in units of one
 * buy-in. Ruin at a bankroll of B buy-ins is exactly the fraction of runs whose
 * worst point ever dipped below -B, so a single pass gives the whole
 * bankroll-to-risk curve, and every tier reads off the same numbers.
 */

export const RISK_TIERS = ['aggressive', 'normal', 'conservative'] as const
export type RiskTier = (typeof RISK_TIERS)[number]

export interface TierDefinition {
  id: RiskTier
  label: string
  /** Chance of busting the roll over the horizon that this tier accepts. */
  ruinTolerance: number
  blurb: string
}

export const TIER_DEFINITIONS: Record<RiskTier, TierDefinition> = {
  aggressive: {
    id: 'aggressive',
    label: 'Aggressive',
    ruinTolerance: 0.15,
    blurb: 'Roughly one run in seven ends in rebuilding. For players with income behind them, or who are happy to drop back down.',
  },
  normal: {
    id: 'normal',
    label: 'Normal',
    ruinTolerance: 0.05,
    blurb: 'One run in twenty. The usual working compromise between growth and safety.',
  },
  conservative: {
    id: 'conservative',
    label: 'Conservative',
    ruinTolerance: 0.01,
    blurb: 'One run in a hundred. For players whose poker money has to survive whatever happens.',
  },
}

export interface BankrollConfig {
  bankroll: number
  roiPct: number
  fieldSize: number
  itmPct: number
  /** Fee as a percentage of the buy-in, e.g. 10 for a $100 + $10. */
  feePct: number
  /** How many tournaments the risk is measured over. */
  tournaments: number
  samples: number
  seed?: number
}

export interface TierResult extends TierDefinition {
  /** Bankroll needed, in buy-ins, to keep ruin at or under the tolerance. */
  requiredBuyIns: number
  /** Bottom of the sensible range — a tenth of the ceiling. */
  minBuyIn: number
  /** Largest buy-in this bankroll supports at that tolerance. */
  maxBuyIn: number
  /** What one entry actually costs at the bottom of the range, fee included. */
  minEntryCost: number
  /** What one entry actually costs at the ceiling, fee included. */
  maxEntryCost: number
}

export interface BankrollResult {
  tiers: TierResult[]
  /** Sorted worst-point-below-zero of every run, in buy-ins. */
  lossDistribution: number[]
  /** Expected profit per tournament, in buy-ins. */
  evPerTournament: number
  skill: number
  paidPlaces: number
  itmProbability: number
  samples: number
  tournaments: number
}

const MAX_SAMPLES = 20_000
const MAX_TOURNAMENTS = 20_000

/**
 * Simulate in buy-in units and return, for every run, how far below the
 * starting point it ever went. That single distribution answers every bankroll
 * question we care about.
 */
function simulateWorstLosses(config: BankrollConfig): {
  losses: number[]
  evPerTournament: number
  skill: number
  paidPlaces: number
  itmProbability: number
} {
  const fieldSize = Math.max(2, Math.floor(config.fieldSize))
  const tournaments = Math.max(1, Math.min(MAX_TOURNAMENTS, Math.floor(config.tournaments)))
  const samples = Math.max(1, Math.min(MAX_SAMPLES, Math.floor(config.samples)))

  // One buy-in is the unit, so the prize pool is simply the field size.
  const prizePool = fieldSize
  const costPerTournament = 1 + Math.max(0, config.feePct) / 100
  const payouts = buildPayouts(fieldSize, config.itmPct, prizePool)
  const paidPlaces = payouts.length
  const skill = solveSkill(payouts, fieldSize, costPerTournament, config.roiPct)

  const exponent = 1 / (1 + skill)
  const cashThreshold = Math.pow(paidPlaces / fieldSize, exponent)

  const random = mulberry32(config.seed ?? 1)
  const losses = new Array<number>(samples)
  let profitTotal = 0

  for (let sample = 0; sample < samples; sample++) {
    let profit = 0
    let worst = 0

    for (let t = 0; t < tournaments; t++) {
      const u = random()
      if (u <= cashThreshold) {
        const place = Math.min(paidPlaces, Math.max(1, Math.ceil(Math.pow(u, 1 + skill) * fieldSize)))
        profit += payouts[place - 1]
      }
      profit -= costPerTournament
      if (profit < worst) worst = profit
    }

    losses[sample] = -worst
    profitTotal += profit
  }

  losses.sort((a, b) => a - b)

  return {
    losses,
    evPerTournament: profitTotal / samples / tournaments,
    skill,
    paidPlaces,
    itmProbability: cashThreshold,
  }
}

/**
 * The bankroll, in buy-ins, that keeps the chance of busting at or under
 * `tolerance`. Read straight off the sorted loss distribution: if only 5% of
 * runs ever dipped below X buy-ins, then X is the 95th percentile of losses.
 */
export function requiredBuyInsFor(sortedLosses: readonly number[], tolerance: number): number {
  if (sortedLosses.length === 0) return 0
  const n = sortedLosses.length
  const clamped = Math.min(Math.max(tolerance, 0), 1)
  // Leave exactly the tolerated number of runs above the cut, so the value we
  // return really does hold ruin at or under the tolerance rather than just
  // over it.
  const index = n - Math.ceil(clamped * n)
  const bounded = Math.min(n - 1, Math.max(0, index))
  return Math.max(0, sortedLosses[bounded])
}

/** Chance of busting a bankroll of `buyIns` over the simulated horizon. */
export function ruinRiskAt(sortedLosses: readonly number[], buyIns: number): number {
  if (sortedLosses.length === 0) return 0
  if (buyIns <= 0) return 1
  let low = 0
  let high = sortedLosses.length
  while (low < high) {
    const mid = (low + high) >> 1
    if (sortedLosses[mid] >= buyIns) high = mid
    else low = mid + 1
  }
  return (sortedLosses.length - low) / sortedLosses.length
}

/**
 * Round a buy-in down, never up.
 *
 * Rounding 21.74 to 22 would quote a buy-in the tier does not actually
 * support, and the buy-in table would then contradict the card above it.
 */
function floorBuyIn(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0
  if (value < 10) return Math.floor(value * 100) / 100
  return Math.floor(value)
}

export function analyzeBankroll(config: BankrollConfig): BankrollResult {
  const { losses, evPerTournament, skill, paidPlaces, itmProbability } = simulateWorstLosses(config)
  const feeMultiplier = 1 + Math.max(0, config.feePct) / 100

  const tiers = RISK_TIERS.map((id): TierResult => {
    const definition = TIER_DEFINITIONS[id]
    const requiredBuyIns = requiredBuyInsFor(losses, definition.ruinTolerance)
    const maxBuyIn = requiredBuyIns > 0 ? floorBuyIn(config.bankroll / requiredBuyIns) : 0
    const minBuyIn = floorBuyIn(maxBuyIn / RANGE_FLOOR_DIVISOR)
    return {
      ...definition,
      requiredBuyIns,
      minBuyIn,
      maxBuyIn,
      minEntryCost: minBuyIn * feeMultiplier,
      maxEntryCost: maxBuyIn * feeMultiplier,
    }
  })

  return {
    tiers,
    lossDistribution: losses,
    evPerTournament,
    skill,
    paidPlaces,
    itmProbability,
    samples: losses.length,
    tournaments: Math.max(1, Math.min(MAX_TOURNAMENTS, Math.floor(config.tournaments))),
  }
}

/**
 * How far below the ceiling the range runs.
 *
 * A tenth keeps the range wide enough to game-select across a schedule without
 * dropping so low that the roll is idle and the hourly stops being worth the
 * seat.
 */
export const RANGE_FLOOR_DIVISOR = 10

/** Buy-ins a player is likely to be choosing between. */
export const COMMON_BUY_INS = [1, 2, 3, 5, 8, 11, 16, 22, 33, 55, 109, 215, 320, 530, 1050]

export interface BuyInVerdict {
  buyIn: number
  entryCost: number
  /** How many of these your bankroll covers. */
  buyInsDeep: number
  ruinRisk: number
  /** The loosest tier that still allows this buy-in, if any. */
  tier: RiskTier | null
  playable: boolean
  /** Cash needed to play this buy-in at each tier, in the bankroll currency. */
  bankrollNeeded: Record<RiskTier, number>
  /** Cash still to find before the normal tier allows it; 0 once it does. */
  shortfallToNormal: number
}

/**
 * Which buy-ins this bankroll actually supports.
 *
 * A tier of null means even the aggressive tolerance will not have it — that is
 * a shot, not a level you can grind.
 */
export function classifyBuyIns(
  result: BankrollResult,
  bankroll: number,
  feePct: number,
  buyIns: readonly number[] = COMMON_BUY_INS,
): BuyInVerdict[] {
  const feeMultiplier = 1 + Math.max(0, feePct) / 100
  const requiredFor = {
    aggressive: requiredBuyInsFor(result.lossDistribution, TIER_DEFINITIONS.aggressive.ruinTolerance),
    normal: requiredBuyInsFor(result.lossDistribution, TIER_DEFINITIONS.normal.ruinTolerance),
    conservative: requiredBuyInsFor(result.lossDistribution, TIER_DEFINITIONS.conservative.ruinTolerance),
  }

  return buyIns.map((buyIn) => {
    const buyInsDeep = buyIn > 0 ? bankroll / buyIn : 0
    const ruinRisk = ruinRiskAt(result.lossDistribution, buyInsDeep)

    // Tightest tier first, so a buy-in is labelled with the safest one it clears.
    let tier: RiskTier | null = null
    for (const candidate of ['conservative', 'normal', 'aggressive'] as const) {
      if (ruinRisk <= TIER_DEFINITIONS[candidate].ruinTolerance) {
        tier = candidate
        break
      }
    }

    // The same requirement stated in cash, which is the number a player
    // actually checks their account against.
    const bankrollNeeded = {
      aggressive: requiredFor.aggressive * buyIn,
      normal: requiredFor.normal * buyIn,
      conservative: requiredFor.conservative * buyIn,
    }

    return {
      buyIn,
      entryCost: buyIn * feeMultiplier,
      buyInsDeep,
      ruinRisk,
      tier,
      playable: tier !== null,
      bankrollNeeded,
      shortfallToNormal: Math.max(0, bankrollNeeded.normal - bankroll),
    }
  })
}

/**
 * Bankroll needed to move up, and roughly how long that takes at this edge.
 *
 * Returns null when the player is not a winner: no amount of grinding gets you
 * there, and saying "never" is more use than a number in the millions.
 */
export function shotAt(
  result: BankrollResult,
  bankroll: number,
  buyIn: number,
  tier: RiskTier,
): { needed: number; shortfall: number; tournaments: number | null } {
  const needed = TIER_DEFINITIONS[tier].ruinTolerance
    ? requiredBuyInsFor(result.lossDistribution, TIER_DEFINITIONS[tier].ruinTolerance) * buyIn
    : 0
  const shortfall = Math.max(0, needed - bankroll)
  const perTournament = result.evPerTournament * buyIn

  return {
    needed,
    shortfall,
    tournaments: shortfall > 0 && perTournament > 0 ? Math.ceil(shortfall / perTournament) : null,
  }
}
