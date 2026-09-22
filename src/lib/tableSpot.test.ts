import { describe, expect, it } from 'vitest'
import {
  anteOf,
  defaultBounty,
  deriveSpot,
  formatAmount,
  newSeat,
  rescaleToBlind,
  seatsForTable,
  smallBlindOf,
  type Blinds,
  type Seat,
} from './tableSpot'

// A 1,000 big blind: 500 small, 100 of ante from each of the eight seats.
const BLINDS: Blinds = { bigBlind: 1000, antePct: 0.1 }

/** An 8-max table where everyone folds, so a test only states what it changes. */
function table(overrides: Partial<Record<string, Partial<Seat>>> = {}): Seat[] {
  return seatsForTable(8).map((position) => ({
    ...newSeat(position, 25_000),
    ...(overrides[position] ?? {}),
  }))
}

describe('one number describes the level', () => {
  it('halves the big blind for the small', () => {
    expect(smallBlindOf(1000)).toBe(500)
    expect(smallBlindOf(150)).toBe(75)
    // A structure pays whole chips, so an odd blind rounds rather than splits.
    expect(smallBlindOf(75)).toBe(38)
    expect(smallBlindOf(0)).toBe(0)
  })

  it('takes the ante as a share of the big blind', () => {
    expect(anteOf({ bigBlind: 1000, antePct: 0.1 })).toBe(100)
    expect(anteOf({ bigBlind: 1000, antePct: 0.125 })).toBe(125)
    expect(anteOf({ bigBlind: 0, antePct: 0.1 })).toBe(0)
  })

  it('puts one big blind of antes in the middle at 12.5% eight-handed', () => {
    // Which is the whole reason that option is worth having.
    expect(anteOf({ bigBlind: 1000, antePct: 0.125 }) * 8).toBe(1000)
  })
})

describe('what is in the middle', () => {
  it('counts every seat’s ante and both blinds', () => {
    const spot = deriveSpot(table({ BB: { isHero: true } }), BLINDS, 100, 25_000)
    // 8 antes of 100, plus SB 500 and BB 1,000.
    expect(spot.potBeforeCall).toBe(800 + 500 + 1000)
  })

  it('charges more when the structure asks 12.5%', () => {
    const spot = deriveSpot(
      table({ BB: { isHero: true } }),
      { ...BLINDS, antePct: 0.125 },
      100,
      25_000,
    )
    expect(spot.potBeforeCall).toBe(1000 + 500 + 1000)
  })

  it('keeps the antes and blinds of seats that folded', () => {
    const spot = deriveSpot(
      table({ SB: { action: 'fold' }, BB: { isHero: true }, CO: { action: 'raise', committed: 2200 } }),
      BLINDS,
      100,
      25_000,
    )
    // Five seats folded for their ante alone; the small blind left 100 + 500.
    expect(spot.deadChips).toBe(5 * 100 + 600)
    // Those 1,100, plus CO's 100 + 2,200 and hero's 100 + 1,000.
    expect(spot.potBeforeCall).toBe(1100 + 2300 + 1100)
  })
})

describe('the price hero is being offered', () => {
  it('prices a call from the big blind against a raise', () => {
    const spot = deriveSpot(
      table({ CO: { action: 'raise', committed: 2200 }, BB: { isHero: true } }),
      BLINDS,
      100,
      25_000,
    )
    // Hero posted a 1,000 blind and a 100 ante; only the blind counts toward
    // the 2,200, so calling costs 1,200 more.
    expect(spot.heroCallAmount).toBe(1200)
    // 800 of antes + 500 SB + 1,000 BB + 2,200 raise.
    expect(spot.potBeforeCall).toBe(4500)
    expect(spot.finalPot).toBe(5700)
    expect(spot.requiredEquityPct).toBeCloseTo((1200 / 5700) * 100, 4)
  })

  it('states the odds the way they get said out loud', () => {
    const spot = deriveSpot(
      table({ CO: { action: 'raise', committed: 2200 }, BB: { isHero: true } }),
      BLINDS,
      100,
      25_000,
    )
    // 4,500 to win for 1,200 risked.
    expect(spot.potOdds).toBe('3.8 : 1')
  })

  it('caps the call at hero’s stack when the shove is bigger', () => {
    const spot = deriveSpot(
      table({ BTN: { action: 'shove', stack: 40_000 }, BB: { isHero: true, stack: 9000 } }),
      BLINDS,
      100,
      25_000,
    )
    // Hero has 9,000, of which 100 went to the ante and 1,000 is already in.
    expect(spot.heroCallAmount).toBe(7900)
  })

  it('takes the largest bet when two seats came in', () => {
    const spot = deriveSpot(
      table({
        CO: { action: 'raise', committed: 2200 },
        BTN: { action: 'raise', committed: 6800 },
        BB: { isHero: true },
      }),
      BLINDS,
      100,
      25_000,
    )
    expect(spot.currentBet).toBe(6800)
    // Hero has 1,000 of blind in that counts; the ante does not.
    expect(spot.heroCallAmount).toBe(5800)
  })

  it('lets a caller match the raise rather than the blind', () => {
    const spot = deriveSpot(
      table({
        CO: { action: 'raise', committed: 2200 },
        BTN: { action: 'call' },
        BB: { isHero: true },
      }),
      BLINDS,
      100,
      25_000,
    )
    const button = spot.seats.find((seat) => seat.position === 'BTN')!
    // The raise matched, plus the ante that was never part of it.
    expect(button.contribution).toBe(2300)
  })
})

describe('bounties change the bar', () => {
  it('lowers the required equity when hero covers the shover', () => {
    const spot = deriveSpot(
      table({
        BTN: { action: 'shove', stack: 12_000, bountyAmount: 50 },
        BB: { isHero: true, stack: 30_000 },
      }),
      BLINDS,
      100,
      25_000,
    )
    expect(spot.capturableBountyChips).toBeGreaterThan(0)
    expect(spot.requiredEquityWithBountyPct).toBeLessThan(spot.requiredEquityPct)
  })

  it('ignores a bounty hero cannot win because the shover has them covered', () => {
    const spot = deriveSpot(
      table({
        BTN: { action: 'shove', stack: 60_000, bountyAmount: 50 },
        BB: { isHero: true, stack: 9000 },
      }),
      BLINDS,
      100,
      25_000,
    )
    expect(spot.capturableBountyChips).toBe(0)
    expect(spot.requiredEquityWithBountyPct).toBeCloseTo(spot.requiredEquityPct, 6)
  })

  it('counts a folded seat’s bounty for nothing', () => {
    const spot = deriveSpot(
      table({
        CO: { action: 'fold', bountyAmount: 500 },
        BTN: { action: 'shove', stack: 12_000 },
        BB: { isHero: true, stack: 30_000 },
      }),
      BLINDS,
      100,
      25_000,
    )
    expect(spot.capturableBountyChips).toBe(0)
  })
})

describe('spots that cannot be worked out', () => {
  it('asks for a hero', () => {
    const spot = deriveSpot(table({ BTN: { action: 'shove' } }), BLINDS, 100, 25_000)
    expect(spot.problems[0]).toContain('which seat is yours')
  })

  it('refuses two heroes', () => {
    const spot = deriveSpot(table({ BB: { isHero: true }, SB: { isHero: true } }), BLINDS, 100, 25_000)
    expect(spot.problems.some((p) => p.includes('Only one seat'))).toBe(true)
  })

  it('says so when everyone folded to hero', () => {
    const spot = deriveSpot(table({ BB: { isHero: true } }), BLINDS, 100, 25_000)
    expect(spot.problems.some((p) => p.includes('Nobody is in the hand'))).toBe(true)
  })

  it('says so when there is nothing to call', () => {
    const spot = deriveSpot(
      table({ BTN: { action: 'call' }, BB: { isHero: true } }),
      BLINDS,
      100,
      25_000,
    )
    // A limped pot: the button matched the blind, so it is free to check.
    expect(spot.heroCallAmount).toBe(0)
    expect(spot.problems.some((p) => p.includes('nothing to call'))).toBe(true)
  })
})

describe('table sizes', () => {
  it('drops the earliest seats rather than the blinds', () => {
    expect(seatsForTable(6)).toEqual(['LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'])
    expect(seatsForTable(9)[0]).toBe('UTG')
    expect(seatsForTable(9)).toHaveLength(9)
    for (const size of [6, 8, 9] as const) {
      expect(seatsForTable(size).slice(-2)).toEqual(['SB', 'BB'])
    }
  })
})

describe('amounts in big blinds', () => {
  it('shows chips untouched and BB divided', () => {
    expect(formatAmount(23_500, 1000, 'chips')).toBe('23,500')
    expect(formatAmount(23_500, 1000, 'bb')).toBe('23.5 BB')
  })

  it('drops the pointless fraction on round and huge figures', () => {
    expect(formatAmount(25_000, 1000, 'bb')).toBe('25 BB')
    expect(formatAmount(250_000, 1000, 'bb')).toBe('250 BB')
  })

  it('keeps the half blind that changes a shove chart', () => {
    expect(formatAmount(8500, 1000, 'bb')).toBe('8.5 BB')
    expect(formatAmount(-1200, 1000, 'bb')).toBe('-1.2 BB')
  })

  it('falls back to chips when the big blind is nonsense', () => {
    expect(formatAmount(5000, 0, 'bb')).toBe('5,000')
  })
})

describe('the default bounty', () => {
  it('reads 2.50 off a 10.80 listed buy-in, because the fee sits on top', () => {
    // 10.80 = 10 + 8%. A flat 8% discount would give 2.48, which is wrong.
    expect(defaultBounty(10.8)).toBe(2.5)
  })

  it('scales with the buy-in', () => {
    expect(defaultBounty(108)).toBe(25)
    expect(defaultBounty(54)).toBe(12.5)
    expect(defaultBounty(10)).toBe(2.31)
  })

  it('offers nothing when there is no buy-in to read', () => {
    expect(defaultBounty(0)).toBe(0)
    expect(defaultBounty(-5)).toBe(0)
    expect(defaultBounty(Number.NaN)).toBe(0)
  })
})

describe('what a bounty is worth in blinds', () => {
  it('converts what the knockout pays through the starting stack', () => {
    const spot = deriveSpot(
      table({
        BTN: { action: 'shove', stack: 12_000, bountyAmount: 50 },
        BB: { isHero: true, stack: 30_000 },
      }),
      BLINDS,
      100,
      25_000,
    )
    // A $50 knockout × (25,000 ÷ 100) = 12,500 chips, all of it hero's.
    expect(spot.capturableBountyChips).toBe(12_500)
    // 12,500 chips at a 1,000 big blind.
    expect(spot.capturableBountyBB).toBe(12.5)
    expect(spot.capturableBountyAmount).toBe(50)
  })

  it('counts nothing for a bounty hero cannot reach', () => {
    const spot = deriveSpot(
      table({
        BTN: { action: 'shove', stack: 60_000, bountyAmount: 50 },
        BB: { isHero: true, stack: 9000 },
      }),
      BLINDS,
      100,
      25_000,
    )
    expect(spot.capturableBountyBB).toBe(0)
    expect(spot.capturableBountyAmount).toBe(0)
  })

  it('adds up the bounties of everyone hero covers', () => {
    const spot = deriveSpot(
      table({
        CO: { action: 'shove', stack: 8000, bountyAmount: 20 },
        BTN: { action: 'shove', stack: 12_000, bountyAmount: 50 },
        BB: { isHero: true, stack: 30_000 },
      }),
      BLINDS,
      100,
      25_000,
    )
    expect(spot.capturableBountyAmount).toBe(70)
    // (20 + 50) × 250 = 17,500 chips = 17.5 BB.
    expect(spot.capturableBountyBB).toBe(17.5)
  })
})

describe('chips a seat already put in', () => {
  it('keeps the money of a seat that raised and then folded', () => {
    // The spot this exists for: CO opens, BTN 3-bets, CO gives up. Those 2,200
    // are in the middle and hero is being paid them.
    const spot = deriveSpot(
      table({
        CO: { action: 'fold', committed: 2200 },
        BTN: { action: 'raise', committed: 6800 },
        BB: { isHero: true },
      }),
      BLINDS,
      100,
      25_000,
    )
    const co = spot.seats.find((seat) => seat.position === 'CO')!
    expect(co.inFront).toBe(2200)
    expect(co.isActive).toBe(false)
    // CO's 2,200 counts as dead, alongside the folded antes and small blind.
    expect(spot.deadChips).toBe(4 * 100 + 600 + 2300)
    // Antes 800 + SB 500 + BB 1,000 + CO 2,200 + BTN 6,800.
    expect(spot.potBeforeCall).toBe(11_300)
    expect(spot.heroCallAmount).toBe(5800)
  })

  it('lets a limp-caller stay a limper when a raise comes after', () => {
    const spot = deriveSpot(
      table({
        // Called the big blind, then folded out when BTN raised — but a call
        // left alone would have followed the raise up to 6,800.
        CO: { action: 'call', committed: 1000 },
        BTN: { action: 'raise', committed: 6800 },
        BB: { isHero: true },
      }),
      BLINDS,
      100,
      25_000,
    )
    expect(spot.seats.find((seat) => seat.position === 'CO')!.inFront).toBe(1000)
  })

  it('still drags an untyped caller up to the largest bet', () => {
    const spot = deriveSpot(
      table({
        CO: { action: 'call' },
        BTN: { action: 'raise', committed: 6800 },
        BB: { isHero: true },
      }),
      BLINDS,
      100,
      25_000,
    )
    expect(spot.seats.find((seat) => seat.position === 'CO')!.inFront).toBe(6800)
  })

  it('never lets a blind seat have less in than it was forced to post', () => {
    const spot = deriveSpot(
      table({ SB: { action: 'fold', committed: 0 }, BTN: { action: 'shove' }, BB: { isHero: true } }),
      BLINDS,
      100,
      25_000,
    )
    expect(spot.seats.find((seat) => seat.position === 'SB')!.inFront).toBe(500)
  })

  it('caps what a seat can have in at the chips behind the ante', () => {
    const spot = deriveSpot(
      table({
        CO: { action: 'raise', committed: 999_999, stack: 8000 },
        BB: { isHero: true },
      }),
      BLINDS,
      100,
      25_000,
    )
    expect(spot.seats.find((seat) => seat.position === 'CO')!.inFront).toBe(7900)
  })
})

describe('hero with chips of their own in', () => {
  it('charges hero only the difference when a 3-bet comes back', () => {
    // Hero opens the cutoff to 2,200 and the button makes it 6,800.
    const spot = deriveSpot(
      table({
        CO: { isHero: true, committed: 2200 },
        BTN: { action: 'raise', committed: 6800 },
      }),
      BLINDS,
      100,
      25_000,
    )
    expect(spot.hero!.inFront).toBe(2200)
    // 6,800 to match, 2,200 already in: the call is the gap, not the raise.
    expect(spot.heroCallAmount).toBe(4600)
    // Antes 800 + SB 500 + BB 1,000 + hero 2,200 + BTN 6,800.
    expect(spot.potBeforeCall).toBe(11_300)
    expect(spot.finalPot).toBe(15_900)
  })

  it('still asks for the whole raise when hero has only a blind in', () => {
    const spot = deriveSpot(
      table({ BB: { isHero: true }, BTN: { action: 'raise', committed: 6800 } }),
      BLINDS,
      100,
      25_000,
    )
    expect(spot.heroCallAmount).toBe(5800)
  })

  it("lets hero's open set the bar the seats behind have to match", () => {
    const spot = deriveSpot(
      table({
        CO: { isHero: true, committed: 2200 },
        BTN: { action: 'call' },
      }),
      BLINDS,
      100,
      25_000,
    )
    expect(spot.currentBet).toBe(2200)
    expect(spot.seats.find((seat) => seat.position === 'BTN')!.inFront).toBe(2200)
    // Nobody raised hero, so there is nothing for hero to call.
    expect(spot.heroCallAmount).toBe(0)
  })

  it('never lets hero have less in than the blind they posted', () => {
    const spot = deriveSpot(
      table({ BB: { isHero: true, committed: 0 }, BTN: { action: 'shove' } }),
      BLINDS,
      100,
      25_000,
    )
    expect(spot.hero!.inFront).toBe(1000)
  })

  it('caps hero’s own chips at the stack behind the ante', () => {
    const spot = deriveSpot(
      table({
        CO: { isHero: true, committed: 999_999, stack: 8000 },
        BTN: { action: 'shove', stack: 40_000 },
      }),
      BLINDS,
      100,
      25_000,
    )
    expect(spot.hero!.inFront).toBe(7900)
    // Already all-in: there is nothing left to call with.
    expect(spot.heroCallAmount).toBe(0)
  })
})

describe('stacks keep their depth when the level moves', () => {
  it('doubles the chips when the big blind doubles', () => {
    expect(rescaleToBlind(10_000, 1000, 2000)).toBe(20_000)
    expect(rescaleToBlind(2200, 1000, 2000)).toBe(4400)
  })

  it('works downward too', () => {
    expect(rescaleToBlind(10_000, 1000, 400)).toBe(4000)
  })

  it('keeps the depth it started with', () => {
    const depth = 10_000 / 1000
    expect(rescaleToBlind(10_000, 1000, 1500) / 1500).toBe(depth)
  })

  it('rounds to whole chips', () => {
    expect(rescaleToBlind(10_000, 1000, 333)).toBe(3330)
  })

  it('leaves the amount alone when a level is missing', () => {
    // What a half-typed blind looks like: scaling here would wipe the table.
    expect(rescaleToBlind(10_000, 1000, 0)).toBe(10_000)
    expect(rescaleToBlind(10_000, 0, 2000)).toBe(10_000)
  })
})
