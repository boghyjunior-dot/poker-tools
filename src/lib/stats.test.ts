import { describe, expect, it } from 'vitest'
import {
  bandFor,
  byBuyIn,
  byMonth,
  bySite,
  finishStats,
  groupBy,
  isReadable,
  moneySplit,
  streaks,
  UNKNOWN_SITE,
} from './stats'
import type { Entry } from './tracker'

let seq = 0
const entry = (over: Partial<Entry> = {}): Entry => ({
  id: `e${(seq += 1)}`,
  date: '2026-10-01',
  name: 'Bounty Hunters',
  site: 'GGPoker',
  buyIn: 22,
  fee: 0,
  cashed: 0,
  bounties: 0,
  ...over,
})

describe('cutting the log up', () => {
  it('adds up a group the way the rest of the tools do', () => {
    const [row] = groupBy(
      [entry({ buyIn: 20, fee: 2, cashed: 100 }), entry({ buyIn: 20, fee: 2 })],
      () => 'all',
    )
    expect(row.count).toBe(2)
    expect(row.staked).toBe(44)
    expect(row.returned).toBe(100)
    expect(row.profit).toBe(56)
    expect(row.roiPct).toBeCloseTo((56 / 44) * 100, 6)
    expect(row.itmCount).toBe(1)
    expect(row.itmPct).toBe(50)
  })

  it('counts a bounty as money back without calling it a cash', () => {
    // A bust that collected heads is not in the money, and a log that said it
    // was would overstate how often you get paid.
    const [row] = groupBy([entry({ bounties: 40 })], () => 'all')
    expect(row.returned).toBe(40)
    expect(row.bounties).toBe(40)
    expect(row.itmCount).toBe(0)
  })

  it('puts the biggest sample first, not the best result', () => {
    // Sorting by ROI would park one lucky $2 turbo at the top for a year.
    const rows = groupBy(
      [
        entry({ site: 'Lucky', cashed: 900 }),
        entry({ site: 'Grind' }),
        entry({ site: 'Grind' }),
        entry({ site: 'Grind' }),
      ],
      (e) => e.site,
    )
    expect(rows.map((row) => row.key)).toEqual(['Grind', 'Lucky'])
  })

  it('gives a room-less result somewhere to go', () => {
    expect(bySite([entry({ site: '   ' })])[0].key).toBe(UNKNOWN_SITE)
  })

  it('splits rooms apart', () => {
    const rows = bySite([
      entry({ site: 'GGPoker', cashed: 100 }),
      entry({ site: 'GGPoker' }),
      entry({ site: 'PokerStars' }),
    ])
    expect(rows.map((r) => [r.key, r.count])).toEqual([
      ['GGPoker', 2],
      ['PokerStars', 1],
    ])
  })
})

describe('stake bands', () => {
  it('puts each cost in the band it belongs to', () => {
    expect(bandFor(2)).toBe('Under $5')
    expect(bandFor(5)).toBe('$5 to $25')
    expect(bandFor(21.6)).toBe('$5 to $25')
    expect(bandFor(54)).toBe('$25 to $60')
    expect(bandFor(109)).toBe('$60 to $200')
    expect(bandFor(5000)).toBe('$200 and up')
  })

  it('bands on the whole cost, fee included', () => {
    // A $20 + $5 is a $25 tournament to a bankroll, whatever the label says.
    expect(byBuyIn([entry({ buyIn: 20, fee: 5 })])[0].key).toBe('$25 to $60')
  })

  it('reads as a ladder rather than by volume', () => {
    const rows = byBuyIn([
      entry({ buyIn: 109 }),
      entry({ buyIn: 2 }),
      entry({ buyIn: 2 }),
      entry({ buyIn: 2 }),
    ])
    expect(rows.map((r) => r.key)).toEqual(['Under $5', '$60 to $200'])
  })
})

describe('months', () => {
  it('groups by month and puts the newest first', () => {
    const rows = byMonth([
      entry({ date: '2026-08-14' }),
      entry({ date: '2026-10-02' }),
      entry({ date: '2026-10-31' }),
    ])
    expect(rows.map((r) => [r.key, r.count])).toEqual([
      ['2026-10', 2],
      ['2026-08', 1],
    ])
  })
})

describe('finishes', () => {
  it('says nothing at all when no place was recorded', () => {
    expect(finishStats([entry(), entry()])).toEqual({
      recorded: 0,
      best: null,
      finalTables: 0,
      medianPlace: null,
    })
  })

  it('counts only the results that carry a place', () => {
    const stats = finishStats([entry({ position: 12 }), entry(), entry({ position: 3 })])
    expect(stats.recorded).toBe(2)
    expect(stats.best).toBe(3)
  })

  it('takes a final table as ninth or better', () => {
    const stats = finishStats([
      entry({ position: 9 }),
      entry({ position: 10 }),
      entry({ position: 1 }),
    ])
    expect(stats.finalTables).toBe(2)
  })

  it('uses the median, which one deep run cannot drag about', () => {
    // A mean of these is 103; the median says what a normal night looks like.
    const stats = finishStats([
      entry({ position: 2 }),
      entry({ position: 150 }),
      entry({ position: 160 }),
    ])
    expect(stats.medianPlace).toBe(150)
  })

  it('splits the difference on an even count', () => {
    const stats = finishStats([entry({ position: 10 }), entry({ position: 20 })])
    expect(stats.medianPlace).toBe(15)
  })
})

describe('where the money came from', () => {
  it('splits cash from heads', () => {
    const split = moneySplit([entry({ cashed: 150, bounties: 50 }), entry({ bounties: 50 })])
    expect(split.cashed).toBe(150)
    expect(split.bounties).toBe(100)
    expect(split.bountyPct).toBeCloseTo(40, 6)
  })

  it('does not divide by a year with nothing in it', () => {
    expect(moneySplit([entry(), entry()])).toEqual({ cashed: 0, bounties: 0, bountyPct: 0 })
    expect(moneySplit([])).toEqual({ cashed: 0, bounties: 0, bountyPct: 0 })
  })
})

describe('streaks', () => {
  const run = (...results: { cashed?: number; bounties?: number }[]) =>
    streaks(
      results.map((result, i) =>
        entry({ date: `2026-10-${String(i + 1).padStart(2, '0')}`, ...result }),
      ),
    )

  it('finds the longest run without a cash', () => {
    const s = run({}, {}, { cashed: 50 }, {}, {}, {}, {}, { cashed: 50 })
    expect(s.withoutCash).toBe(4)
  })

  it('counts how many have passed since the last one', () => {
    const s = run({ cashed: 50 }, {}, {}, {})
    expect(s.sinceCash).toBe(3)
  })

  it('reports nothing since the last cash when the last one cashed', () => {
    expect(run({}, {}, { cashed: 50 }).sinceCash).toBe(0)
  })

  it('lets a min-cash break the losing run but not the dry one', () => {
    // Cashing 5 of a 22 buy-in is still a loss, and still a cash.
    const s = run({}, {}, { cashed: 5 }, {})
    expect(s.withoutCash).toBe(2)
    expect(s.losing).toBe(4)
  })

  it('reads in date order, not the order rows were added', () => {
    const s = streaks([
      entry({ date: '2026-10-03' }),
      entry({ date: '2026-10-01', cashed: 90 }),
      entry({ date: '2026-10-02' }),
    ])
    expect(s.withoutCash).toBe(2)
    expect(s.sinceCash).toBe(2)
  })

  it('has nothing to say about an empty log', () => {
    expect(streaks([])).toEqual({ withoutCash: 0, losing: 0, sinceCash: 0 })
  })
})

describe('whether a row is worth reading', () => {
  it('wants a real sample before an ROI is stated as a fact', () => {
    const [row] = groupBy([entry()], () => 'all')
    expect(isReadable(row)).toBe(false)
    expect(isReadable({ ...row, count: 100 })).toBe(true)
  })
})
