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
