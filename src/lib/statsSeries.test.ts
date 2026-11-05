import { describe, expect, it } from 'vitest'
import {
  byWeekday,
  profitCurve,
  RETURN_BANDS,
  returnBand,
  returnBuckets,
  returnMultiple,
  rollingRoi,
  ROLLING_MIN,
  rollingWindow,
} from './statsSeries'
import type { Entry } from './tracker'

let seq = 0
const entry = (over: Partial<Entry> = {}): Entry => ({
  id: `e${(seq += 1)}`,
  date: '2026-10-01',
  name: 'Bounty Hunters',
  site: 'GGPoker',
  buyIn: 10,
  fee: 0,
  cashed: 0,
  bounties: 0,
  ...over,
})

describe('the running total', () => {
  it('starts on the baseline, so the line does not float', () => {
    const curve = profitCurve([entry({ cashed: 30 })])
    expect(curve).toHaveLength(2)
    expect(curve[0]).toMatchObject({ index: 0, money: 0, buyIns: 0 })
    expect(curve[0].date).toBe('2026-10-01')
  })

  it('has nothing to draw for an empty log, not even an origin', () => {
    expect(profitCurve([])).toEqual([])
  })

  it('adds up the money as it goes', () => {
    const curve = profitCurve([
      entry({ date: '2026-10-01', buyIn: 10, cashed: 25 }),
      entry({ date: '2026-10-02', buyIn: 10 }),
    ])
    expect(curve.map((point) => point.money)).toEqual([0, 15, 5])
  })

  it('measures each result against its own buy-in, which money cannot', () => {
    // The point of the second line: a log that is flat in buy-ins and down in
    // money has been losing at stakes it was winning at smaller.
    const curve = profitCurve([
      entry({ date: '2026-10-01', buyIn: 10, cashed: 20 }),
      entry({ date: '2026-10-02', buyIn: 100 }),
    ])
    expect(curve[curve.length - 1].money).toBe(-90)
    expect(curve[curve.length - 1].buyIns).toBeCloseTo(0, 10)
  })

  it('leaves the buy-in line alone for a freeroll, which has nothing to divide by', () => {
    const curve = profitCurve([entry({ buyIn: 0, cashed: 50 })])
    expect(curve[1].money).toBe(50)
    expect(curve[1].buyIns).toBe(0)
  })

  it('carries the high-water mark, so a drawdown can be shaded', () => {
    const curve = profitCurve([
      entry({ date: '2026-10-01', buyIn: 10, cashed: 110 }),
      entry({ date: '2026-10-02', buyIn: 10 }),
      entry({ date: '2026-10-03', buyIn: 10 }),
    ])
    expect(curve.map((point) => point.moneyPeak)).toEqual([0, 100, 100, 100])
    expect(curve.map((point) => point.buyInsPeak)).toEqual([0, 10, 10, 10])
    expect(curve[curve.length - 1].money).toBe(80)
  })

  it('reads in date order whatever order it was handed', () => {
    const curve = profitCurve([
      entry({ date: '2026-10-09', cashed: 100 }),
      entry({ date: '2026-10-02' }),
    ])
    expect(curve.map((point) => point.date)).toEqual(['2026-10-02', '2026-10-02', '2026-10-09'])
  })
})

describe('how wide a rolling window to use', () => {
  it('is a quarter of the log, so the line moves when the results do', () => {
    expect(rollingWindow(400)).toBe(100)
    expect(rollingWindow(800)).toBe(200)
  })

  it('never narrows to a handful, however short the log', () => {
    expect(rollingWindow(0)).toBe(25)
    expect(rollingWindow(60)).toBe(25)
  })

  it('stops widening, so a long log still shows form rather than its average', () => {
    expect(rollingWindow(100_000)).toBe(250)
  })

  it('has a floor below which there is no form to plot', () => {
    expect(ROLLING_MIN).toBeGreaterThanOrEqual(25)
  })
})

describe('rolling ROI', () => {
  const flat = (count: number, over: Partial<Entry> = {}) =>
    Array.from({ length: count }, (_, i) =>
      entry({ date: `2026-10-${String((i % 28) + 1).padStart(2, '0')}`, ...over }),
    )

  it('draws nothing until there is a full window behind it', () => {
    expect(rollingRoi(flat(3), 4)).toEqual([])
  })

  it('gives one point per position once the window fits', () => {
    expect(rollingRoi(flat(10), 4)).toHaveLength(7)
  })

  it('puts the first point at the end of its window, not the start', () => {
    expect(rollingRoi(flat(10), 4)[0].index).toBe(4)
  })

  it('only looks at the window, so old results drop out of it', () => {
    // Four losses then four doubles: the last window is all winners and the
    // whole-log ROI is zero, which is exactly the disagreement worth drawing.
    const entries = [
      ...Array.from({ length: 4 }, (_, i) => entry({ date: `2026-10-0${i + 1}`, buyIn: 10 })),
      ...Array.from({ length: 4 }, (_, i) =>
        entry({ date: `2026-10-0${i + 5}`, buyIn: 10, cashed: 20 }),
      ),
    ]
    const points = rollingRoi(entries, 4)
    expect(points[0].roiPct).toBeCloseTo(-100, 6)
    expect(points[points.length - 1].roiPct).toBeCloseTo(100, 6)
  })

  it('does not divide by a window of freerolls', () => {
    const points = rollingRoi(flat(4, { buyIn: 0 }), 2)
    expect(points.every((point) => point.roiPct === 0)).toBe(true)
  })

  it('picks its own window when not given one', () => {
    expect(rollingRoi(flat(200))).toHaveLength(200 - rollingWindow(200) + 1)
  })
})

describe('what came back, as a multiple', () => {
  it('counts bounties as money back, because they are', () => {
    expect(returnMultiple(entry({ buyIn: 10, cashed: 10, bounties: 10 }))).toBe(2)
  })

  it('includes the fee in what it cost', () => {
    expect(returnMultiple(entry({ buyIn: 10, fee: 10, cashed: 20 }))).toBe(1)
  })

  it('puts a paid freeroll off the top of the scale rather than dividing by nothing', () => {
    expect(returnMultiple(entry({ buyIn: 0, cashed: 50 }))).toBe(Number.POSITIVE_INFINITY)
    expect(returnMultiple(entry({ buyIn: 0 }))).toBe(0)
  })

  it('bands the edges where a tournament changes character', () => {
    expect(returnBand(0)).toBe('Nothing back')
    expect(returnBand(0.4)).toBe('Under 1x')
    expect(returnBand(1)).toBe('1x to 2x')
    expect(returnBand(1.9)).toBe('1x to 2x')
    expect(returnBand(2)).toBe('2x to 5x')
    expect(returnBand(24.9)).toBe('10x to 25x')
    expect(returnBand(25)).toBe('25x and up')
    expect(returnBand(Number.POSITIVE_INFINITY)).toBe('25x and up')
  })

  it('keeps every band, so a gap in the log reads as a gap', () => {
    const buckets = returnBuckets([entry()])
    expect(buckets).toHaveLength(RETURN_BANDS.length)
    expect(buckets.map((bucket) => bucket.label)).toEqual(RETURN_BANDS.map((band) => band.label))
  })

  it('counts the results and nets the money in each band', () => {
    const buckets = returnBuckets([
      entry({ buyIn: 10 }),
      entry({ buyIn: 10 }),
      entry({ buyIn: 10, cashed: 300 }),
    ])
    const byLabel = new Map(buckets.map((bucket) => [bucket.label, bucket]))
    expect(byLabel.get('Nothing back')).toMatchObject({ count: 2, profit: -20 })
    expect(byLabel.get('25x and up')).toMatchObject({ count: 1, profit: 290 })
    expect(byLabel.get('Nothing back')?.sharePct).toBeCloseTo(66.67, 1)
  })

  it('has every band at zero for an empty log rather than no bands', () => {
    const buckets = returnBuckets([])
    expect(buckets).toHaveLength(RETURN_BANDS.length)
    expect(buckets.every((bucket) => bucket.count === 0 && bucket.sharePct === 0)).toBe(true)
  })
})

describe('the week', () => {
  it('starts on Monday, because a poker week ends on the Sunday majors', () => {
    const days = byWeekday([])
    expect(days).toHaveLength(7)
    expect(days[0].label).toBe('Monday')
    expect(days[6].label).toBe('Sunday')
  })

  it('puts a result on the right day', () => {
    // 2026-11-05 is a Thursday.
    const days = byWeekday([entry({ date: '2026-11-05' })])
    expect(days[3].count).toBe(1)
    expect(days.reduce((sum, day) => sum + day.count, 0)).toBe(1)
  })

  it('does not read a date as the day before in some timezone', () => {
    // Parsed at noon UTC: midnight local would move this one by a day.
    expect(byWeekday([entry({ date: '2026-11-01' })])[6].count).toBe(1)
  })

  it('adds up volume, money and ROI per day', () => {
    const days = byWeekday([
      entry({ date: '2026-11-01', buyIn: 10, cashed: 30 }),
      entry({ date: '2026-11-08', buyIn: 10 }),
    ])
    expect(days[6]).toMatchObject({ count: 2, staked: 20, profit: 10 })
    expect(days[6].roiPct).toBeCloseTo(50, 6)
  })

  it('ignores a date it cannot read rather than inventing a Monday', () => {
    const days = byWeekday([entry({ date: 'whenever' })])
    expect(days.every((day) => day.count === 0)).toBe(true)
  })
})
