import { describe, expect, it } from 'vitest'
import {
  bandFor,
  byBuyIn,
  byMonth,
  bySite,
  concentration,
  finishStats,
  groupBy,
  isReadable,
  moneySplit,
  rhythm,
  stakeSpread,
  streaks,
  UNKNOWN_SITE,
  utcDay,
  weekdayIndex,
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

describe('reading a date as a day', () => {
  it('counts days from the epoch', () => {
    expect(utcDay('2026-11-05')).toBe(20762)
    expect((utcDay('2026-11-06') ?? 0) - (utcDay('2026-11-05') ?? 0)).toBe(1)
  })

  it('says nothing rather than guessing at a date it cannot read', () => {
    expect(utcDay('whenever')).toBeNull()
    expect(weekdayIndex('')).toBeNull()
  })

  it('puts Monday at nought', () => {
    expect(weekdayIndex('2026-11-02')).toBe(0)
    expect(weekdayIndex('2026-11-05')).toBe(3)
    expect(weekdayIndex('2026-11-01')).toBe(6)
  })
})

describe('where the profit came from', () => {
  it('separates what was won from what was lost', () => {
    const c = concentration([
      entry({ buyIn: 10, cashed: 100 }),
      entry({ buyIn: 10 }),
      entry({ buyIn: 10 }),
    ])
    expect(c.won).toBe(90)
    expect(c.lost).toBe(20)
    expect(c.winners).toBe(1)
    expect(c.best).toBe(90)
  })

  it('says what the log comes to without its best night', () => {
    // The sentence that stops a good month being mistaken for a good game.
    const c = concentration([entry({ buyIn: 10, cashed: 500 }), entry({ buyIn: 10 })])
    expect(c.withoutBest).toBe(-10)
  })

  it('counts how many results it took to pay for all the losses', () => {
    const c = concentration([
      entry({ buyIn: 10, cashed: 60 }),
      entry({ buyIn: 10, cashed: 40 }),
      ...Array.from({ length: 6 }, () => entry({ buyIn: 10 })),
    ])
    // 50 and 30 against 60 of losses: the first two cover it.
    expect(c.payingResults).toBe(2)
  })

  it('has no answer for a losing log, rather than a misleading one', () => {
    expect(concentration([entry({ buyIn: 10 }), entry({ buyIn: 10, cashed: 15 })]).payingResults).toBeNull()
  })

  it('takes the best 5% of results, and never fewer than one', () => {
    expect(concentration([entry()]).topCount).toBe(1)
    expect(concentration(Array.from({ length: 100 }, () => entry())).topCount).toBe(5)
  })

  it('states how much of the winnings those few hold', () => {
    const c = concentration([
      entry({ buyIn: 10, cashed: 910 }),
      ...Array.from({ length: 19 }, () => entry({ buyIn: 10, cashed: 20 })),
    ])
    // One result of twenty, holding 900 of the 1090 won.
    expect(c.topCount).toBe(1)
    expect(c.topSharePct).toBeCloseTo((900 / 1090) * 100, 6)
  })

  it('has nothing to say about an empty log', () => {
    expect(concentration([])).toEqual({
      won: 0,
      lost: 0,
      winners: 0,
      best: 0,
      withoutBest: 0,
      topCount: 0,
      topSharePct: 0,
      payingResults: null,
    })
  })
})

describe('how the volume is spread', () => {
  it('counts the days played, not the days in the log', () => {
    const r = rhythm([
      entry({ date: '2026-11-01' }),
      entry({ date: '2026-11-01' }),
      entry({ date: '2026-11-03' }),
    ])
    expect(r.activeDays).toBe(2)
    expect(r.perActiveDay).toBeCloseTo(1.5, 6)
    expect(r.span).toBe(3)
  })

  it('finds the busiest session', () => {
    const r = rhythm([
      entry({ date: '2026-11-01' }),
      entry({ date: '2026-11-03' }),
      entry({ date: '2026-11-03' }),
    ])
    expect(r.busiest).toEqual({ date: '2026-11-03', count: 2 })
  })

  it('measures the layoff, which is the usual reason a month looks wrong', () => {
    const r = rhythm([entry({ date: '2026-09-01' }), entry({ date: '2026-09-15' })])
    expect(r.longestGap).toBe(13)
  })

  it('has no gap to report when every day was played', () => {
    expect(rhythm([entry({ date: '2026-11-01' }), entry({ date: '2026-11-02' })]).longestGap).toBe(0)
  })

  it('states a weekly rate over the span it covers', () => {
    const r = rhythm([
      entry({ date: '2026-11-01' }),
      entry({ date: '2026-11-14' }),
    ])
    expect(r.span).toBe(14)
    expect(r.perWeek).toBeCloseTo(1, 6)
  })

  it('has nothing to say about an empty log', () => {
    expect(rhythm([])).toEqual({
      activeDays: 0,
      perActiveDay: 0,
      busiest: null,
      longestGap: 0,
      span: 0,
      perWeek: 0,
    })
  })
})

describe('what you actually play', () => {
  it('gives the average and the median, which disagree when it matters', () => {
    const spread = stakeSpread([
      entry({ buyIn: 5 }),
      entry({ buyIn: 5 }),
      entry({ buyIn: 5 }),
      entry({ buyIn: 215 }),
    ])
    expect(spread.median).toBe(5)
    expect(spread.average).toBe(57.5)
    expect(spread.biggest).toBe(215)
  })

  it('counts the fee as part of what a seat cost', () => {
    expect(stakeSpread([entry({ buyIn: 10, fee: 1 })]).average).toBe(11)
  })

  it('counts the distinct stakes played', () => {
    expect(stakeSpread([entry({ buyIn: 5 }), entry({ buyIn: 5 }), entry({ buyIn: 22 })]).distinct).toBe(2)
  })

  it('names the dearest band and how little of the volume it is', () => {
    const spread = stakeSpread([
      ...Array.from({ length: 9 }, () => entry({ buyIn: 5.5 })),
      entry({ buyIn: 215 }),
    ])
    expect(spread.topBand).toBe('$200 and up')
    expect(spread.topBandPct).toBeCloseTo(10, 6)
  })

  it('has nothing to say about an empty log', () => {
    expect(stakeSpread([])).toEqual({
      average: 0,
      median: 0,
      biggest: 0,
      distinct: 0,
      topBand: '',
      topBandPct: 0,
    })
  })
})
