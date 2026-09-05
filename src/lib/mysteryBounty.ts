/**
 * Mystery bounty maths.
 *
 * Every entrant funds the bounty pool, but envelopes are only drawn for
 * eliminations during the bounty phase — so the average bounty is a large
 * multiple of the amount each entry contributed. That multiple is the whole
 * point of the format:
 *
 *     pool            = entrants x bountyPerEntry
 *     draws           = bountyStartPlayers - 1     (everyone but the winner busts)
 *     average bounty  = pool / draws
 *
 * Chips are converted to currency through the *prize-pool* share of the
 * buy-in, not the total. Every chip in play is eventually paid out of the
 * prize pool, so `startingStack` chips correspond to `prizePoolPerEntry`:
 *
 *     chips per unit  = startingStack / prizePoolPerEntry
 *
 * Using the total buy-in here would understate the bounty's chip value by
 * roughly the bounty split.
 */

export interface MysteryBountyConfig {
  entrants: number
  prizePoolPerEntry: number
  bountyPerEntry: number
  feePerEntry: number
  bountyStartPlayers: number
  startingStack: number
  bigBlind: number
  /** Value of each top envelope, if the structure announces one. */
  topPrize?: number
  /** How many envelopes are worth {@link topPrize}. Defaults to 1. */
  topPrizeCount?: number
}

export interface BountyAtLevel {
  bigBlind: number
  bountyBb: number
}

export interface MysteryBountyResult {
  buyIn: number
  bountyPool: number
  prizePool: number
  draws: number
  averageBounty: number
  /** Average of every envelope outside the top tier — the realistic draw. */
  typicalBounty: number | null
  /** Top envelopes actually applied, after clamping to the envelopes available. */
  topPrizeCount: number
  /** Combined value of the top tier. */
  topPrizeTotal: number
  /** Odds of a single knockout drawing one of the top envelopes. */
  topPrizeChance: number | null
  multipleOfEntryBounty: number
  multipleOfBuyIn: number
  chipsPerUnit: number
  averageBountyChips: number
  averageBountyBb: number
  typicalBountyBb: number | null
  levels: BountyAtLevel[]
}

/** Blind levels shown in the "as blinds grow" table, as multiples of the current BB. */
const LEVEL_MULTIPLES = [1, 1.5, 2, 3, 5, 8]

export function calculateMysteryBounty(config: MysteryBountyConfig): MysteryBountyResult {
  const entrants = Math.max(1, Math.floor(config.entrants))
  const bountyStartPlayers = Math.max(2, Math.min(entrants, Math.floor(config.bountyStartPlayers)))

  const buyIn = config.prizePoolPerEntry + config.bountyPerEntry + config.feePerEntry
  const bountyPool = entrants * config.bountyPerEntry
  const prizePool = entrants * config.prizePoolPerEntry
  const draws = bountyStartPlayers - 1

  const averageBounty = bountyPool / draws

  // Strip the top tier to show what a normal knockout actually pays. At least
  // one regular envelope has to remain, so the tier can never fill the draw.
  const topPrize = config.topPrize && config.topPrize > 0 ? config.topPrize : null
  const topPrizeCount =
    topPrize === null
      ? 0
      : Math.max(1, Math.min(draws - 1, Math.floor(config.topPrizeCount ?? 1)))
  const topPrizeTotal = topPrize === null ? 0 : topPrize * topPrizeCount

  const topTierFits = topPrize !== null && topPrizeCount >= 1 && topPrizeTotal < bountyPool
  const typicalBounty = topTierFits ? (bountyPool - topPrizeTotal) / (draws - topPrizeCount) : null
  const topPrizeChance = topTierFits ? topPrizeCount / draws : null

  const chipsPerUnit = config.prizePoolPerEntry > 0 ? config.startingStack / config.prizePoolPerEntry : 0
  const averageBountyChips = averageBounty * chipsPerUnit
  const bbValue = (amount: number, bigBlind: number) =>
    bigBlind > 0 ? (amount * chipsPerUnit) / bigBlind : 0

  return {
    buyIn,
    bountyPool,
    prizePool,
    draws,
    averageBounty,
    typicalBounty,
    topPrizeCount: topTierFits ? topPrizeCount : 0,
    topPrizeTotal: topTierFits ? topPrizeTotal : 0,
    topPrizeChance,
    multipleOfEntryBounty: config.bountyPerEntry > 0 ? averageBounty / config.bountyPerEntry : 0,
    multipleOfBuyIn: buyIn > 0 ? averageBounty / buyIn : 0,
    chipsPerUnit,
    averageBountyChips,
    averageBountyBb: bbValue(averageBounty, config.bigBlind),
    typicalBountyBb: typicalBounty === null ? null : bbValue(typicalBounty, config.bigBlind),
    levels: LEVEL_MULTIPLES.map((multiple) => {
      const bigBlind = config.bigBlind * multiple
      return { bigBlind, bountyBb: bbValue(averageBounty, bigBlind) }
    }),
  }
}


/**
 * One rung of a published bounty ladder: N envelopes worth V each.
 */
export interface BountyTier {
  value: number
  count: number
}

export interface ResolvedTier extends BountyTier {
  /** Chance a single knockout draws from this tier. */
  chance: number
  /** This tier's share of the money still in the pool. */
  share: number
}

export interface RemainingBountiesResult {
  envelopes: number
  pool: number
  averageBounty: number
  /** The envelope you are most likely to actually draw — the biggest tier by count. */
  mostLikely: ResolvedTier | null
  /** Middle envelope by count, which beats the mean on a skewed ladder. */
  medianBounty: number
  tiers: ResolvedTier[]
  averageBountyChips: number
  averageBountyBb: number
  levels: BountyAtLevel[]
  /**
   * Remaining average against the average over the whole original pool.
   * Above 1 means the big envelopes are still live and a knockout is worth
   * more than the structure sheet suggests; below 1 means the pool is
   * picked over.
   */
  richnessVsStart: number | null
}

export interface RemainingBountiesConfig {
  tiers: BountyTier[]
  /** Chips that correspond to one currency unit — from the full calculation. */
  chipsPerUnit: number
  bigBlind: number
  /** Average over the untouched pool, for the richness comparison. */
  startingAverage?: number
  /** Keep fractional envelope counts, for an expected rather than known drum. */
  fractionalCounts?: boolean
}

/**
 * Drop rungs that carry nothing.
 *
 * Counts are floored to whole envelopes, because a drum cannot hold 3.9 of
 * them — except when the caller is handing us an expectation, where the
 * fraction is the whole point.
 */
export function cleanTiers(tiers: BountyTier[], fractional = false): BountyTier[] {
  return tiers
    .map((tier) => ({ value: tier.value, count: fractional ? tier.count : Math.floor(tier.count) }))
    .filter((tier) => Number.isFinite(tier.value) && tier.value > 0 && tier.count > 0)
    .sort((a, b) => b.value - a.value)
}

/**
 * What a knockout is worth right now, given the envelopes still in the drum.
 *
 * The start-of-phase average assumes an untouched pool. Once the big
 * envelopes are gone that number is a fiction, and once they are still live
 * with few envelopes left it badly understates the spot — which is exactly
 * when the money decisions happen.
 */
export function calculateRemainingBounties(
  config: RemainingBountiesConfig,
): RemainingBountiesResult | null {
  const tiers = cleanTiers(config.tiers, config.fractionalCounts)
  const envelopes = tiers.reduce((sum, tier) => sum + tier.count, 0)
  if (envelopes === 0) return null

  const pool = tiers.reduce((sum, tier) => sum + tier.value * tier.count, 0)
  const averageBounty = pool / envelopes

  const resolved: ResolvedTier[] = tiers.map((tier) => ({
    ...tier,
    chance: tier.count / envelopes,
    share: pool > 0 ? (tier.value * tier.count) / pool : 0,
  }))

  const mostLikely = resolved.reduce<ResolvedTier | null>(
    (best, tier) => (best === null || tier.count > best.count ? tier : best),
    null,
  )

  // Walk the ladder from the top until half the envelopes are behind us.
  const half = envelopes / 2
  let seen = 0
  let medianBounty = resolved[resolved.length - 1].value
  for (const tier of resolved) {
    seen += tier.count
    if (seen >= half) {
      medianBounty = tier.value
      break
    }
  }

  const bbValue = (amount: number, bigBlind: number) =>
    bigBlind > 0 ? (amount * config.chipsPerUnit) / bigBlind : 0

  return {
    envelopes,
    pool,
    averageBounty,
    mostLikely,
    medianBounty,
    tiers: resolved,
    averageBountyChips: averageBounty * config.chipsPerUnit,
    averageBountyBb: bbValue(averageBounty, config.bigBlind),
    levels: LEVEL_MULTIPLES.map((multiple) => {
      const bigBlind = config.bigBlind * multiple
      return { bigBlind, bountyBb: bbValue(averageBounty, bigBlind) }
    }),
    richnessVsStart:
      config.startingAverage && config.startingAverage > 0
        ? averageBounty / config.startingAverage
        : null,
  }
}


/**
 * Chance a tier still has at least one envelope in the drum after `drawn`
 * envelopes have gone, when you have no information about which ones.
 *
 *     P(all c of them drawn) = product over j of (drawn - j) / (total - j)
 *
 * which is the hypergeometric probability of sweeping the whole tier.
 */
export function tierSurvival(count: number, total: number, drawn: number): number {
  if (count <= 0 || total <= 0) return 0
  if (drawn <= 0) return 1
  if (drawn >= total) return 0
  if (drawn < count) return 1

  let allGone = 1
  for (let j = 0; j < count; j++) {
    allGone *= (drawn - j) / (total - j)
  }
  return 1 - allGone
}

export interface DepletionRow {
  /** Players still in the tournament at this point. */
  playersLeft: number
  /** Envelopes drawn from here, not from the start of the phase. */
  envelopesDrawn: number
  /** Chance the richest rung still has an envelope in it. */
  survival: number
}

/**
 * How long the top of the drum is likely to stay live from here.
 *
 * Every bust draws one envelope, so players left and envelopes left run down
 * together. This answers whether the big envelope is worth playing for or
 * whether it will realistically be gone by the time you get there.
 *
 * Worth knowing while reading it: drawing anonymous envelopes does not make
 * the drum poorer on average, because every rung shrinks by the same expected
 * fraction. What it changes is the chance the big ones are still in there,
 * which is what this table tracks.
 */
export function depletionOutlook(drum: BountyTier[], steps = 6): DepletionRow[] {
  const tiers = cleanTiers(drum)
  if (tiers.length === 0) return []

  const left = tiers.reduce((sum, tier) => sum + tier.count, 0)
  if (left === 0) return []
  const topCount = tiers[0].count

  const rows: DepletionRow[] = []
  for (let i = 0; i <= steps; i++) {
    const drawn = Math.round((left * i) / steps)
    rows.push({
      // One envelope per bust, so the field and the drum empty together.
      playersLeft: left - drawn + 1,
      envelopesDrawn: drawn,
      survival: tierSurvival(topCount, left, drawn),
    })
  }
  return rows
}

export interface CallOpponent {
  /** Their stack in big blinds — what they are jamming. */
  stackBb: number
  /** Bounty you collect for knocking them out, in big blinds. */
  bountyBb: number
}

export interface CallSpot {
  yourStackBb: number
  opponents: CallOpponent[]
  deadBb: number
  /**
   * ICM pressure: dollars lost per chip risked over dollars won per chip won.
   * 1 is pure chip EV; 1.3 is a normal bubble; 2+ is a brutal pay jump.
   */
  bubbleFactor?: number
}

export interface CallEvaluation {
  /** What you actually put at risk. */
  callBb: number
  /** Total pot if you call, your call included. */
  potBb: number
  /** Bounties you can actually collect — zero for anyone who covers you. */
  bountyInPlayBb: number
  coveredCount: number
  uncoveredCount: number
  /** Bounty money you cannot win because they have you covered. */
  unreachableBountyBb: number
  bubbleFactor: number
  /** Break-even equity ignoring bounties. */
  without: number
  /** Break-even equity with the collectable bounties. */
  with: number
  /** Percentage points the bounty saves you. */
  saved: number
}

/**
 * Break-even equity for calling an all-in, with coverage and ICM handled.
 *
 * You only win a bounty by eliminating someone, and you cannot eliminate a
 * player who has you covered — winning against them leaves them with chips.
 * A short stack calling for "the bounty" against a bigger stack is calling for
 * nothing, so those bounties are stripped out rather than quietly counted.
 *
 * The bubble factor scales the risk side only. The bounty is cash that pays
 * whatever happens to the tournament afterwards, so it is not discounted by
 * ICM — which is precisely why bounties push against bubble pressure.
 */
export function evaluateCall(spot: CallSpot): CallEvaluation {
  const bubbleFactor = spot.bubbleFactor && spot.bubbleFactor > 0 ? spot.bubbleFactor : 1
  const yourStack = Math.max(0, spot.yourStackBb)
  const opponents = spot.opponents.filter((o) => o.stackBb > 0)
  const dead = Math.max(0, spot.deadBb)

  if (yourStack <= 0 || opponents.length === 0) {
    return {
      callBb: 0,
      potBb: 0,
      bountyInPlayBb: 0,
      coveredCount: 0,
      uncoveredCount: 0,
      unreachableBountyBb: 0,
      bubbleFactor,
      without: 0,
      with: 0,
      saved: 0,
    }
  }

  // You match the biggest jam you can afford; each opponent is in for the
  // smaller of their stack and yours.
  const biggestJam = Math.max(...opponents.map((o) => o.stackBb))
  const callBb = Math.min(yourStack, biggestJam)
  const contributions = opponents.reduce((sum, o) => sum + Math.min(o.stackBb, yourStack), 0)
  const potBb = dead + callBb + contributions

  let bountyInPlayBb = 0
  let unreachableBountyBb = 0
  let coveredCount = 0
  for (const opponent of opponents) {
    if (yourStack >= opponent.stackBb) {
      bountyInPlayBb += Math.max(0, opponent.bountyBb)
      coveredCount += 1
    } else {
      unreachableBountyBb += Math.max(0, opponent.bountyBb)
    }
  }

  const win = potBb - callBb
  const riskSide = bubbleFactor * callBb
  const without = riskSide + win > 0 ? riskSide / (riskSide + win) : 0
  const withBounty =
    riskSide + win + bountyInPlayBb > 0 ? riskSide / (riskSide + win + bountyInPlayBb) : 0

  return {
    callBb,
    potBb,
    bountyInPlayBb,
    coveredCount,
    uncoveredCount: opponents.length - coveredCount,
    unreachableBountyBb,
    bubbleFactor,
    without,
    with: withBounty,
    saved: without - withBounty,
  }
}

/**
 * Equity needed to call an all-in, with and without a bounty in play.
 *
 * Villain shoves `shoveBb`, you cover, and `deadBb` (blinds + antes) is already
 * in the middle. Calling risks `shoveBb` to win `deadBb + shoveBb`, plus the
 * bounty when you win:
 *
 *     without bounty: q = shove / (dead + 2 x shove)
 *     with bounty:    q = shove / (dead + 2 x shove + bounty)
 */
export function callingRequirement(
  shoveBb: number,
  deadBb: number,
  bountyBb: number,
): { without: number; with: number } {
  const base = deadBb + 2 * shoveBb
  if (base <= 0) return { without: 0, with: 0 }
  return {
    without: shoveBb / base,
    with: shoveBb / (base + Math.max(0, bountyBb)),
  }
}
