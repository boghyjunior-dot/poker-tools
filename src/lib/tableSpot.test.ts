import { describe, expect, it } from 'vitest'
import { defaultBounty, deriveSpot, formatAmount, newSeat, seatsForTable, type Blinds, type Seat } from './tableSpot'

const BLINDS: Blinds = { smallBlind: 500, bigBlind: 1000, ante: 0, bigBlindAnte: 1000 }

/** An 8-max table where everyone folds, so a test only states what it changes. */
function table(overrides: Partial<Record<string, Partial<Seat>>> = {}): Seat[] {
  return seatsForTable(8).map((position) => ({
    ...newSeat(position, 25_000),
    ...(overrides[position] ?? {}),
  }))
}

describe('what is in the middle', () => {
  it('counts the blinds and the big-blind ante', () => {
    const spot = deriveSpot(table({ BB: { isHero: true } }), BLINDS, 100, 25_000)
    // SB 500 + BB 1,000 + BB ante 1,000, everyone else folded for nothing.
    expect(spot.potBeforeCall).toBe(2500)
  })

  it('charges every seat when the ante is per player', () => {
    const spot = deriveSpot(table({ BB: { isHero: true } }), { ...BLINDS, ante: 100, bigBlindAnte: 0 }, 100, 25_000)
    // 8 antes of 100, plus the blinds.
    expect(spot.potBeforeCall).toBe(800 + 500 + 1000)
  })

  it('keeps the blinds of seats that folded', () => {
    const spot = deriveSpot(
      table({ SB: { action: 'fold' }, BB: { isHero: true }, CO: { action: 'raise', raiseTo: 2200 } }),
      BLINDS,
      100,
      25_000,
    )
    expect(spot.deadChips).toBe(500) // the small blind, abandoned
    expect(spot.potBeforeCall).toBe(500 + 2000 + 2200)
  })
})

describe('the price hero is being offered', () => {
  it('prices a call from the big blind against a raise', () => {
    const spot = deriveSpot(
      table({ CO: { action: 'raise', raiseTo: 2200 }, BB: { isHero: true } }),
      BLINDS,
      100,
      25_000,
    )
    // Hero posted 1,000 blind + 1,000 ante; matching 2,200 costs 1,200 more.
    expect(spot.heroCallAmount).toBe(1200)
    // 500 SB + 2,000 hero posted + 2,200 raise = 4,700, plus hero's 1,200.
    expect(spot.potBeforeCall).toBe(4700)
    expect(spot.finalPot).toBe(5900)
    expect(spot.requiredEquityPct).toBeCloseTo((1200 / 5900) * 100, 4)
  })

  it('states the odds the way they get said out loud', () => {
    const spot = deriveSpot(
      table({ CO: { action: 'raise', raiseTo: 2200 }, BB: { isHero: true } }),
      BLINDS,
      100,
      25_000,
    )
    // 4,700 to win for 1,200 risked.
    expect(spot.potOdds).toBe('3.9 : 1')
  })

  it('caps the call at hero’s stack when the shove is bigger', () => {
    const spot = deriveSpot(
      table({ BTN: { action: 'shove', stack: 40_000 }, BB: { isHero: true, stack: 9000 } }),
      BLINDS,
      100,
      25_000,
    )
    // Hero cannot call more than the 9,000 they have, 2,000 of it already in.
    expect(spot.heroCallAmount).toBe(7000)
  })

  it('takes the largest bet when two seats came in', () => {
    const spot = deriveSpot(
      table({
        CO: { action: 'raise', raiseTo: 2200 },
        BTN: { action: 'raise', raiseTo: 6800 },
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
        CO: { action: 'raise', raiseTo: 2200 },
        BTN: { action: 'call' },
        BB: { isHero: true },
      }),
      BLINDS,
      100,
      25_000,
    )
    const button = spot.seats.find((seat) => seat.position === 'BTN')!
    expect(button.contribution).toBe(2200)
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
  it('converts face value through the starting stack, then halves it', () => {
    const spot = deriveSpot(
      table({
        BTN: { action: 'shove', stack: 12_000, bountyAmount: 50 },
        BB: { isHero: true, stack: 30_000 },
      }),
      BLINDS,
      100,
      25_000,
    )
    // $50 × (25,000 ÷ 100) = 12,500 chips; half of it is paid on the knockout.
    expect(spot.capturableBountyChips).toBe(6250)
    // 6,250 chips at a 1,000 big blind.
    expect(spot.capturableBountyBB).toBe(6.25)
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
    // (20 + 50) × 250 ÷ 2 = 8,750 chips = 8.75 BB.
    expect(spot.capturableBountyBB).toBe(8.75)
  })
})
