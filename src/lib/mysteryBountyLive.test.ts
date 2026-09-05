import { describe, expect, it } from 'vitest'
import {
  calculateRemainingBounties,
  depletionOutlook,
  evaluateCall,
  tierSurvival,
  type BountyTier,
} from './mysteryBounty'
import { bountyReportToMarkdown } from './mysteryBountyExport'
import { LADDER_PRESETS, parseLadderText } from './mysteryBountyLadders'
import { emptyState, parseState } from './mysteryBountyStorage'
import { calculateMysteryBounty } from './mysteryBounty'

const ladder: BountyTier[] = [
  { value: 100_000, count: 1 },
  { value: 10_000, count: 4 },
  { value: 1_000, count: 95 },
]

describe('tierSurvival', () => {
  it('is certain before anything is drawn and impossible once all are', () => {
    expect(tierSurvival(1, 100, 0)).toBe(1)
    expect(tierSurvival(1, 100, 100)).toBe(0)
  })

  it('falls linearly for a single envelope', () => {
    // One envelope in a hundred: after fifty draws it is a coin flip.
    expect(tierSurvival(1, 100, 50)).toBeCloseTo(0.5, 9)
    expect(tierSurvival(1, 100, 25)).toBeCloseTo(0.75, 9)
  })

  it('survives longer when the tier has more envelopes in it', () => {
    expect(tierSurvival(4, 100, 50)).toBeGreaterThan(tierSurvival(1, 100, 50))
    // All four gone after fifty draws is (50/100)(49/99)(48/98)(47/97).
    const allGone = (50 / 100) * (49 / 99) * (48 / 98) * (47 / 97)
    expect(tierSurvival(4, 100, 50)).toBeCloseTo(1 - allGone, 9)
  })

  it('cannot be swept before enough envelopes have been drawn', () => {
    expect(tierSurvival(5, 100, 4)).toBe(1)
  })
})

describe('depletionOutlook', () => {
  it('walks the top envelope from certain to gone as players bust', () => {
    const rows = depletionOutlook(ladder)
    expect(rows[0].survival).toBe(1)
    expect(rows[rows.length - 1].survival).toBe(0)
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].survival).toBeLessThanOrEqual(rows[i - 1].survival)
      expect(rows[i].playersLeft).toBeLessThan(rows[i - 1].playersLeft)
    }
  })

  it('ties players left to envelopes left, one bust per envelope', () => {
    const rows = depletionOutlook(ladder)
    // 100 envelopes in the drum means 101 players still in.
    expect(rows[0].playersLeft).toBe(101)
    expect(rows[0].envelopesDrawn).toBe(0)
    expect(rows[rows.length - 1].playersLeft).toBe(1)
  })

  it('returns nothing for an empty ladder', () => {
    expect(depletionOutlook([])).toEqual([])
  })
})

describe('evaluateCall', () => {
  const spot = { yourStackBb: 40, opponents: [{ stackBb: 12, bountyBb: 22 }], deadBb: 1.5 }

  it('prices a call you cover the way pot odds say', () => {
    const result = evaluateCall(spot)
    expect(result.callBb).toBe(12)
    expect(result.potBb).toBe(1.5 + 12 + 12)
    expect(result.without).toBeCloseTo(12 / 25.5, 9)
    expect(result.with).toBeCloseTo(12 / (25.5 + 22), 9)
    expect(result.bountyInPlayBb).toBe(22)
  })

  it('refuses to award a bounty you cannot win', () => {
    // They have you covered, so beating them does not knock them out.
    const short = evaluateCall({ ...spot, yourStackBb: 9 })
    expect(short.bountyInPlayBb).toBe(0)
    expect(short.unreachableBountyBb).toBe(22)
    expect(short.uncoveredCount).toBe(1)
    expect(short.with).toBeCloseTo(short.without, 9)
    expect(short.saved).toBeCloseTo(0, 9)
  })

  it('risks only the effective stack when you are the short one', () => {
    const short = evaluateCall({ ...spot, yourStackBb: 9 })
    expect(short.callBb).toBe(9)
    expect(short.potBb).toBe(1.5 + 9 + 9)
  })

  it('treats equal stacks as covering, since the winner eliminates', () => {
    const level = evaluateCall({ ...spot, yourStackBb: 12 })
    expect(level.bountyInPlayBb).toBe(22)
    expect(level.coveredCount).toBe(1)
  })

  it('adds up bounties across a multiway pot, coverage by coverage', () => {
    const multiway = evaluateCall({
      yourStackBb: 30,
      deadBb: 1.5,
      opponents: [
        { stackBb: 12, bountyBb: 22 },
        { stackBb: 40, bountyBb: 22 },
      ],
    })
    // You cover the short one only.
    expect(multiway.coveredCount).toBe(1)
    expect(multiway.bountyInPlayBb).toBe(22)
    expect(multiway.unreachableBountyBb).toBe(22)
    // You match the biggest jam you can afford, and both are in for what you cover.
    expect(multiway.callBb).toBe(30)
    expect(multiway.potBb).toBe(1.5 + 30 + 12 + 30)
  })

  it('prices a three-way pot off the extra dead money', () => {
    const heads = evaluateCall({
      yourStackBb: 50,
      deadBb: 1.5,
      opponents: [{ stackBb: 12, bountyBb: 0 }],
    })
    const three = evaluateCall({
      yourStackBb: 50,
      deadBb: 1.5,
      opponents: [
        { stackBb: 12, bountyBb: 0 },
        { stackBb: 12, bountyBb: 0 },
      ],
    })
    // The second jam is more dead money, so the price on the call improves —
    // but the threshold is now equity against two players, not one, which is
    // much harder to clear with the same hand.
    expect(three.potBb).toBeGreaterThan(heads.potBb)
    expect(three.without).toBeLessThan(heads.without)
  })

  it('demands more equity as the bubble bites', () => {
    const flat = evaluateCall({ ...spot, bubbleFactor: 1 })
    const bubble = evaluateCall({ ...spot, bubbleFactor: 1.6 })
    expect(bubble.without).toBeGreaterThan(flat.without)
    expect(bubble.with).toBeGreaterThan(flat.with)
  })

  it('lets the bounty fight the bubble, because cash is not discounted by ICM', () => {
    const bubble = 1.6
    const withBounty = evaluateCall({ ...spot, bubbleFactor: bubble })
    const noBounty = evaluateCall({
      ...spot,
      bubbleFactor: bubble,
      opponents: [{ stackBb: 12, bountyBb: 0 }],
    })
    expect(withBounty.with).toBeLessThan(noBounty.with)
    // The bounty gives back more of the bubble premium than it does at b = 1.
    const savedOnBubble = noBounty.with - withBounty.with
    const flat = evaluateCall(spot)
    const flatNoBounty = evaluateCall({ ...spot, opponents: [{ stackBb: 12, bountyBb: 0 }] })
    expect(savedOnBubble).toBeGreaterThan(flatNoBounty.with - flat.with)
  })

  it('returns zeros rather than dividing by nothing', () => {
    expect(evaluateCall({ yourStackBb: 0, opponents: [], deadBb: 0 }).without).toBe(0)
    expect(evaluateCall({ yourStackBb: 20, opponents: [], deadBb: 1 }).potBb).toBe(0)
  })
})

describe('ladder presets and pasting', () => {
  it('ships ladders whose shapes actually differ', () => {
    const spread = LADDER_PRESETS.map((preset) => {

      const pool = preset.tiers.reduce((sum, t) => sum + t.value * t.count, 0)
      return (preset.tiers[0].value * preset.tiers[0].count) / pool
    })
    // The top-heavy ladder puts far more of the pool in one envelope than the flat one.
    expect(spread[0]).toBeGreaterThan(spread[2] * 2)
  })

  it('reads a pasted table however the columns are ordered', () => {
    const valueFirst = parseLadderText('$100,000 x 1\n$10,000 x 4\n$1,000 x 95')
    expect(valueFirst.tiers).toEqual(ladder)
    const countFirst = parseLadderText('1 x $100,000\n4 x $10,000\n95 x $1,000')
    expect(countFirst.tiers).toEqual(ladder)
  })

  it('skips headers and footnotes without complaining', () => {
    const { tiers, errors } = parseLadderText(
      'Mystery bounty ladder\nPrize\tQty\n100000\t1\n1000\t95\nAll bounties paid in cash',
    )
    expect(tiers).toEqual([
      { value: 100_000, count: 1 },
      { value: 1_000, count: 95 },
    ])
    expect(errors).toEqual([])
  })

  it('says so when nothing could be read', () => {
    expect(parseLadderText('nothing here').errors[0]).toContain('No rungs found')
  })
})

describe('persistence', () => {
  it('round-trips a saved event', () => {
    const state = {
      active: {
        id: 'mb-1',
        name: 'Sunday Mystery',
        savedAt: '2026-02-01T00:00:00.000Z',
        form: { entrants: '1000', bigBlind: '5000' },
        tiers: ladder,
      },
      saved: [],
    }
    const parsed = parseState(JSON.parse(JSON.stringify(state)))
    expect(parsed.active?.name).toBe('Sunday Mystery')
    expect(parsed.active?.tiers).toEqual(ladder)
  })

  it('throws nothing at malformed storage', () => {
    expect(parseState(null)).toEqual(emptyState())
    expect(parseState({ active: { name: 'no id' } }).active).toBeNull()
    expect(parseState({ saved: [1, 'two', null] }).saved).toEqual([])
    expect(parseState({ active: { id: 'x', tiers: [{ value: -1, count: 5 }] } })!.active!.tiers).toEqual([])
  })
})

describe('markdown export', () => {
  const full = calculateMysteryBounty({
    entrants: 1000,
    prizePoolPerEntry: 500,
    bountyPerEntry: 450,
    feePerEntry: 50,
    bountyStartPlayers: 150,
    startingStack: 20_000,
    bigBlind: 5_000,
  })

  it('covers the phase, the drum and the call', () => {
    const remaining = calculateRemainingBounties({
      tiers: ladder,
      chipsPerUnit: 40,
      bigBlind: 5_000,
      startingAverage: full.averageBounty,
    })
    const md = bountyReportToMarkdown({
      name: 'Sunday Mystery',
      full,
      remaining,
      depletion: depletionOutlook(ladder),
      call: evaluateCall({ yourStackBb: 40, opponents: [{ stackBb: 12, bountyBb: 22 }], deadBb: 1.5 }),
      bigBlind: 5_000,
      savedAt: new Date('2026-02-01T00:00:00Z'),
    })

    expect(md).toContain('# Mystery bounty — Sunday Mystery')
    expect(md).toContain('## Start of the phase')
    expect(md).toContain('## What is left in the drum')
    expect(md).toContain('## How long the top rung lasts')
    expect(md).toContain('## Calling an all-in')
    expect(md).toContain('not discounted by ICM')
  })

  it('works with nothing but the start-of-phase figures', () => {
    const md = bountyReportToMarkdown({ full, bigBlind: 5_000 })
    expect(md).toContain('## Start of the phase')
    expect(md).not.toContain('## What is left in the drum')
  })

  it('calls out bounty that cannot be reached', () => {
    const md = bountyReportToMarkdown({
      full,
      call: evaluateCall({ yourStackBb: 9, opponents: [{ stackBb: 12, bountyBb: 22 }], deadBb: 1.5 }),
      bigBlind: 5_000,
    })
    expect(md).toContain('unreachable')
  })
})
