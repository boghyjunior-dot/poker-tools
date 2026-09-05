import { describe, expect, it } from 'vitest'
import {
  calculateMysteryBounty,
  calculateRemainingBounties,
  callingRequirement,
  cleanTiers,
  type MysteryBountyConfig,
} from './mysteryBounty'

// A $1,000 mystery bounty: $500 prize pool, $450 bounties, $50 fee.
// 1,000 entries, bounties drawn from Day 2 with 150 players left, 20k stacks.
const base: MysteryBountyConfig = {
  entrants: 1000,
  prizePoolPerEntry: 500,
  bountyPerEntry: 450,
  feePerEntry: 50,
  bountyStartPlayers: 150,
  startingStack: 20_000,
  bigBlind: 5_000,
}

describe('calculateMysteryBounty', () => {
  it('splits the buy-in and pools correctly', () => {
    const result = calculateMysteryBounty(base)
    expect(result.buyIn).toBe(1000)
    expect(result.bountyPool).toBe(450_000)
    expect(result.prizePool).toBe(500_000)
  })

  it('draws one envelope for every player but the winner', () => {
    expect(calculateMysteryBounty(base).draws).toBe(149)
  })

  it('averages the pool over the bounty-phase eliminations', () => {
    const result = calculateMysteryBounty(base)
    expect(result.averageBounty).toBeCloseTo(450_000 / 149, 6)
    expect(result.averageBounty).toBeGreaterThan(3000)
    expect(result.averageBounty).toBeLessThan(3050)
  })

  it('shows the average as a large multiple of each entry contribution', () => {
    const result = calculateMysteryBounty(base)
    // 1,000 entries fund the pool but only 149 envelopes are drawn.
    expect(result.multipleOfEntryBounty).toBeCloseTo(1000 / 149, 6)
    expect(result.multipleOfEntryBounty).toBeGreaterThan(6)
    expect(result.multipleOfBuyIn).toBeCloseTo(result.averageBounty / 1000, 6)
  })

  it('converts chips through the prize-pool share, not the total buy-in', () => {
    const result = calculateMysteryBounty(base)
    // 20,000 chips are bought by the $500 that reaches the prize pool.
    expect(result.chipsPerUnit).toBe(40)
    expect(result.averageBountyChips).toBeCloseTo(result.averageBounty * 40, 6)
  })

  it('expresses the average bounty in big blinds at the current level', () => {
    const result = calculateMysteryBounty(base)
    expect(result.averageBountyBb).toBeCloseTo((450_000 / 149) * 40 / 5000, 6)
    expect(result.averageBountyBb).toBeGreaterThan(24)
    expect(result.averageBountyBb).toBeLessThan(24.5)
  })

  it('strips the headline envelope to give a typical draw', () => {
    const result = calculateMysteryBounty({ ...base, topPrize: 100_000 })
    expect(result.typicalBounty).toBeCloseTo((450_000 - 100_000) / 148, 6)
    expect(result.typicalBounty!).toBeLessThan(result.averageBounty)
    expect(result.typicalBountyBb!).toBeLessThan(result.averageBountyBb)
  })

  it('defaults to a single top envelope when no count is given', () => {
    const result = calculateMysteryBounty({ ...base, topPrize: 100_000 })
    expect(result.topPrizeCount).toBe(1)
    expect(result.topPrizeTotal).toBe(100_000)
  })

  it('strips a whole tier of top envelopes', () => {
    const result = calculateMysteryBounty({ ...base, topPrize: 50_000, topPrizeCount: 4 })
    expect(result.topPrizeCount).toBe(4)
    expect(result.topPrizeTotal).toBe(200_000)
    // 149 envelopes, 4 of them big, so 145 regular ones share what is left.
    expect(result.typicalBounty).toBeCloseTo((450_000 - 200_000) / 145, 6)
  })

  it('leaves the average untouched however the tier is split', () => {
    const one = calculateMysteryBounty({ ...base, topPrize: 100_000, topPrizeCount: 1 })
    const many = calculateMysteryBounty({ ...base, topPrize: 20_000, topPrizeCount: 5 })
    expect(many.averageBounty).toBeCloseTo(one.averageBounty, 9)
  })

  it('lowers the typical draw as more of the pool is locked in the top tier', () => {
    const few = calculateMysteryBounty({ ...base, topPrize: 20_000, topPrizeCount: 2 })
    const many = calculateMysteryBounty({ ...base, topPrize: 20_000, topPrizeCount: 8 })
    expect(many.typicalBounty!).toBeLessThan(few.typicalBounty!)
  })

  it('reports the odds of drawing one of the top envelopes', () => {
    const result = calculateMysteryBounty({ ...base, topPrize: 50_000, topPrizeCount: 3 })
    expect(result.topPrizeChance).toBeCloseTo(3 / 149, 9)
    expect(calculateMysteryBounty(base).topPrizeChance).toBeNull()
  })

  it('keeps at least one regular envelope when the tier is too big to fit', () => {
    const result = calculateMysteryBounty({ ...base, topPrize: 100, topPrizeCount: 999 })
    expect(result.topPrizeCount).toBe(148)
    expect(result.typicalBounty).toBeCloseTo((450_000 - 14_800) / 1, 6)
  })

  it('treats a count below one as a single envelope', () => {
    expect(calculateMysteryBounty({ ...base, topPrize: 100_000, topPrizeCount: 0 }).topPrizeCount).toBe(1)
  })

  it('leaves the typical draw unset without a top prize', () => {
    const result = calculateMysteryBounty(base)
    expect(result.typicalBounty).toBeNull()
    expect(result.typicalBountyBb).toBeNull()
    expect(result.topPrizeCount).toBe(0)
    expect(result.topPrizeTotal).toBe(0)
  })

  it('ignores a top prize that would swallow the whole pool', () => {
    expect(calculateMysteryBounty({ ...base, topPrize: 999_999 }).typicalBounty).toBeNull()
  })

  it('ignores a top tier whose combined value exceeds the pool', () => {
    const result = calculateMysteryBounty({ ...base, topPrize: 100_000, topPrizeCount: 6 })
    expect(result.typicalBounty).toBeNull()
    expect(result.topPrizeChance).toBeNull()
    expect(result.topPrizeCount).toBe(0)
  })

  it('handles the every-elimination variant when the phase starts at the full field', () => {
    const result = calculateMysteryBounty({ ...base, bountyStartPlayers: 1000 })
    expect(result.draws).toBe(999)
    // With a draw for nearly every entry, the average collapses to the contribution.
    expect(result.averageBounty).toBeCloseTo(450_000 / 999, 6)
    expect(result.multipleOfEntryBounty).toBeCloseTo(1000 / 999, 6)
  })

  it('makes the average bounty larger the later the bounty phase starts', () => {
    const late = calculateMysteryBounty({ ...base, bountyStartPlayers: 50 })
    const early = calculateMysteryBounty({ ...base, bountyStartPlayers: 500 })
    expect(late.averageBounty).toBeGreaterThan(early.averageBounty)
  })

  it('shrinks the bounty in big blinds as blinds grow', () => {
    const { levels, averageBountyBb } = calculateMysteryBounty(base)
    expect(levels[0].bigBlind).toBe(5000)
    expect(levels[0].bountyBb).toBeCloseTo(averageBountyBb, 6)
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i].bigBlind).toBeGreaterThan(levels[i - 1].bigBlind)
      expect(levels[i].bountyBb).toBeLessThan(levels[i - 1].bountyBb)
    }
    // Doubling the blind halves the bounty in big blinds.
    expect(levels[2].bountyBb).toBeCloseTo(levels[0].bountyBb / 2, 6)
  })

  it('clamps a bounty phase that starts beyond the field or below two players', () => {
    expect(calculateMysteryBounty({ ...base, bountyStartPlayers: 99_999 }).draws).toBe(999)
    expect(calculateMysteryBounty({ ...base, bountyStartPlayers: 0 }).draws).toBe(1)
  })

  it('does not divide by zero when there is no prize-pool share', () => {
    const result = calculateMysteryBounty({ ...base, prizePoolPerEntry: 0 })
    expect(result.chipsPerUnit).toBe(0)
    expect(result.averageBountyBb).toBe(0)
  })
})

describe('callingRequirement', () => {
  it('matches the standard all-in call formula with no bounty', () => {
    // 10bb shove into 1.5bb dead: 10 / (1.5 + 20).
    expect(callingRequirement(10, 1.5, 0).without).toBeCloseTo(10 / 21.5, 9)
    expect(callingRequirement(10, 1.5, 0).with).toBeCloseTo(10 / 21.5, 9)
  })

  it('lowers the equity needed once a bounty is in play', () => {
    const { without, with: withBounty } = callingRequirement(10, 1.5, 24)
    expect(withBounty).toBeLessThan(without)
    expect(withBounty).toBeCloseTo(10 / (21.5 + 24), 9)
  })

  it('needs less equity the bigger the bounty', () => {
    const small = callingRequirement(10, 1.5, 5).with
    const large = callingRequirement(10, 1.5, 40).with
    expect(large).toBeLessThan(small)
  })

  it('returns zero rather than dividing by zero on an empty pot', () => {
    expect(callingRequirement(0, 0, 10)).toEqual({ without: 0, with: 0 })
  })
})

describe('calculateRemainingBounties', () => {
  // A picked-over drum: the big envelopes are gone, 40 small ones remain.
  const ladder = [
    { value: 100_000, count: 1 },
    { value: 20_000, count: 2 },
    { value: 5_000, count: 7 },
    { value: 1_000, count: 40 },
  ]

  const opts = { chipsPerUnit: 40, bigBlind: 5_000 }

  it('averages over what is actually left in the drum', () => {
    const result = calculateRemainingBounties({ tiers: ladder, ...opts })!
    expect(result.envelopes).toBe(50)
    expect(result.pool).toBe(100_000 + 40_000 + 35_000 + 40_000)
    expect(result.averageBounty).toBeCloseTo(215_000 / 50, 6)
  })

  it('names the envelope you are most likely to draw', () => {
    const result = calculateRemainingBounties({ tiers: ladder, ...opts })!
    expect(result.mostLikely?.value).toBe(1_000)
    expect(result.mostLikely?.chance).toBeCloseTo(40 / 50, 9)
    // The mean is dragged four times above it by a single big envelope.
    expect(result.averageBounty).toBeGreaterThan(result.mostLikely!.value * 4)
  })

  it('reports the median, which a skewed ladder makes the honest number', () => {
    const result = calculateRemainingBounties({ tiers: ladder, ...opts })!
    expect(result.medianBounty).toBe(1_000)
  })

  it('gives each tier its draw chance and its share of the money', () => {
    const result = calculateRemainingBounties({ tiers: ladder, ...opts })!
    const top = result.tiers[0]
    expect(top.value).toBe(100_000)
    expect(top.chance).toBeCloseTo(1 / 50, 9)
    // One envelope in fifty holds nearly half the money left.
    expect(top.share).toBeCloseTo(100_000 / 215_000, 9)
    expect(result.tiers.reduce((sum, t) => sum + t.chance, 0)).toBeCloseTo(1, 9)
    expect(result.tiers.reduce((sum, t) => sum + t.share, 0)).toBeCloseTo(1, 9)
  })

  it('sorts the ladder from richest to poorest whatever order it was typed in', () => {
    const jumbled = [
      { value: 1_000, count: 40 },
      { value: 100_000, count: 1 },
      { value: 5_000, count: 7 },
    ]
    const result = calculateRemainingBounties({ tiers: jumbled, ...opts })!
    expect(result.tiers.map((t) => t.value)).toEqual([100_000, 5_000, 1_000])
  })

  it('converts to chips and big blinds the same way the full pool does', () => {
    const result = calculateRemainingBounties({ tiers: ladder, ...opts })!
    expect(result.averageBountyChips).toBeCloseTo(result.averageBounty * 40, 6)
    expect(result.averageBountyBb).toBeCloseTo((result.averageBounty * 40) / 5_000, 6)
  })

  it('is worth fewer big blinds as the blinds climb', () => {
    const result = calculateRemainingBounties({ tiers: ladder, ...opts })!
    const bbs = result.levels.map((level) => level.bountyBb)
    for (let i = 1; i < bbs.length; i++) expect(bbs[i]).toBeLessThan(bbs[i - 1])
  })

  it('says whether the drum is still rich or has been picked over', () => {
    const rich = calculateRemainingBounties({
      tiers: [{ value: 100_000, count: 1 }, { value: 1_000, count: 4 }],
      ...opts,
      startingAverage: 5_000,
    })!
    expect(rich.richnessVsStart).toBeGreaterThan(1)

    const pickedOver = calculateRemainingBounties({
      tiers: [{ value: 1_000, count: 40 }],
      ...opts,
      startingAverage: 5_000,
    })!
    expect(pickedOver.richnessVsStart).toBeLessThan(1)
  })

  it('has no opinion on richness without a starting average', () => {
    expect(calculateRemainingBounties({ tiers: ladder, ...opts })!.richnessVsStart).toBeNull()
  })

  it('ignores empty, zero and negative rungs', () => {
    expect(cleanTiers([
      { value: 5_000, count: 2 },
      { value: 0, count: 9 },
      { value: 1_000, count: 0 },
      { value: -100, count: 3 },
    ])).toEqual([{ value: 5_000, count: 2 }])
  })

  it('rounds a fractional envelope count down to whole envelopes', () => {
    const result = calculateRemainingBounties({ tiers: [{ value: 1_000, count: 3.9 }], ...opts })!
    expect(result.envelopes).toBe(3)
  })

  it('returns null when nothing is left to draw', () => {
    expect(calculateRemainingBounties({ tiers: [], ...opts })).toBeNull()
    expect(calculateRemainingBounties({ tiers: [{ value: 0, count: 0 }], ...opts })).toBeNull()
  })

  it('handles a flat drum where every envelope is the same', () => {
    const result = calculateRemainingBounties({ tiers: [{ value: 2_000, count: 12 }], ...opts })!
    expect(result.averageBounty).toBe(2_000)
    expect(result.medianBounty).toBe(2_000)
    expect(result.mostLikely?.chance).toBe(1)
  })

  it('feeds the calling requirement like any other bounty figure', () => {
    const result = calculateRemainingBounties({ tiers: ladder, ...opts })!
    const { without, with: withBounty } = callingRequirement(12, 1.5, result.averageBountyBb)
    expect(withBounty).toBeLessThan(without)
  })
})
