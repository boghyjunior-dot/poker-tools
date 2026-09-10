import { describe, expect, it } from 'vitest'
import {
  buildViews,
  confidenceFromCount,
  entryCost,
  entryProfit,
  parseStored,
  sortByDate,
  summarise,
  toCsv,
  type Entry,
} from './tracker'

const make = (over: Partial<Entry> = {}): Entry => ({
  id: 'e1',
  date: '2026-09-01',
  name: 'Nightly',
  site: 'Example',
  buyIn: 20,
  fee: 2,
  cashed: 0,
  bounties: 0,
  ...over,
})

describe('one result', () => {
  it('counts the fee as part of what a shot costs', () => {
    expect(entryCost(make())).toBe(22)
    expect(entryProfit(make())).toBe(-22)
  })

  it('adds bounties to the cash rather than hiding them in it', () => {
    expect(entryProfit(make({ cashed: 50, bounties: 30 }))).toBe(58)
  })

  it('ignores negative figures rather than letting them invert a result', () => {
    expect(entryCost(make({ buyIn: -20, fee: -2 }))).toBe(0)
    expect(entryProfit(make({ cashed: -100 }))).toBe(-22)
  })
})

describe('the running balance', () => {
  const entries = [
    make({ id: 'b', date: '2026-09-02', cashed: 100 }),
    make({ id: 'a', date: '2026-09-01' }),
    make({ id: 'c', date: '2026-09-03', bounties: 44 }),
  ]

  it('reads oldest first whatever order they went in', () => {
    expect(sortByDate(entries).map((e) => e.id)).toEqual(['a', 'b', 'c'])
  })

  it('starts from the bankroll you began with, not from zero', () => {
    const views = buildViews(entries, 1000)
    expect(views.map((v) => v.balance)).toEqual([978, 1056, 1078])
  })

  it('marks a cash as in the money, including a bounty-only result', () => {
    const views = buildViews(entries)
    expect(views.map((v) => v.itm)).toEqual([false, true, true])
  })

  it('keeps entries on the same day in a stable order', () => {
    const sameDay = [make({ id: 'z', date: '2026-09-01' }), make({ id: 'a', date: '2026-09-01' })]
    expect(sortByDate(sameDay).map((e) => e.id)).toEqual(['a', 'z'])
  })
})

describe('the summary', () => {
  const entries = [
    make({ id: '1', date: '2026-09-01' }),
    make({ id: '2', date: '2026-09-02' }),
    make({ id: '3', date: '2026-09-03', cashed: 220 }),
    make({ id: '4', date: '2026-09-04' }),
  ]
  const totals = summarise(buildViews(entries, 500))

  it('reports ROI on total cost, which is what the other tools expect', () => {
    // Four entries at 22 = 88 staked, 220 back.
    expect(totals.staked).toBe(88)
    expect(totals.returned).toBe(220)
    expect(totals.profit).toBe(132)
    expect(totals.roiPct).toBeCloseTo(150, 6)
  })

  it('counts how often you got paid', () => {
    expect(totals.itmCount).toBe(1)
    expect(totals.itmPct).toBeCloseTo(25, 6)
  })

  it('finds the worst peak-to-trough fall, not just the final position', () => {
    // Balance runs 478, 456, 654, 632: it dips 44 before the win, then 22 after.
    expect(totals.worstDrawdown).toBe(44)
  })

  it('remembers the best single result', () => {
    expect(totals.bestResult).toBe(198)
  })

  it('returns zeros for an empty log rather than dividing by nothing', () => {
    const empty = summarise([])
    expect(empty.count).toBe(0)
    expect(empty.roiPct).toBe(0)
    expect(empty.itmPct).toBe(0)
    expect(Number.isFinite(empty.worstDrawdown)).toBe(true)
    expect(Number.isFinite(empty.bestResult)).toBe(true)
  })

  it('does not divide by zero when everything was a freeroll', () => {
    const free = summarise(buildViews([make({ buyIn: 0, fee: 0, cashed: 5 })]))
    expect(free.roiPct).toBe(0)
    expect(free.profit).toBe(5)
  })
})

describe('how much the ROI is worth trusting', () => {
  it('calls a short sample what it is', () => {
    expect(confidenceFromCount(0)).toBe('noise')
    expect(confidenceFromCount(499)).toBe('noise')
    expect(confidenceFromCount(500)).toBe('thin')
    expect(confidenceFromCount(2_000)).toBe('fair')
    expect(confidenceFromCount(10_000)).toBe('solid')
  })

  it('never calls a few hundred tournaments meaningful', () => {
    // The whole point: this is the number people size a bankroll from.
    expect(confidenceFromCount(300)).toBe('noise')
  })
})

describe('stored results', () => {
  it('round-trips an entry', () => {
    expect(parseStored([make({ cashed: 50 })])[0]).toMatchObject({ id: 'e1', cashed: 50 })
  })

  it('drops rows without a usable id or date', () => {
    expect(parseStored([{ id: 'x' }, { date: '2026-09-01' }, null, 7])).toEqual([])
    expect(parseStored([{ id: 'x', date: 'nonsense' }])).toEqual([])
  })

  it('clamps negative money to zero instead of trusting it', () => {
    const [e] = parseStored([{ ...make(), buyIn: -5, cashed: 'abc' }])
    expect(e.buyIn).toBe(0)
    expect(e.cashed).toBe(0)
  })

  it('survives junk instead of throwing', () => {
    expect(parseStored('not an array')).toEqual([])
    expect(parseStored(null)).toEqual([])
  })
})

describe('csv export', () => {
  it('writes a header and a row per entry', () => {
    const csv = toCsv(buildViews([make({ cashed: 60 })], 100))
    const lines = csv.split('\n')
    expect(lines[0]).toBe('date,name,site,buyIn,fee,cashed,bounties,profit,balance')
    expect(lines[1]).toContain('2026-09-01')
    expect(lines[1]).toContain('38') // profit
  })

  it('quotes names so a comma cannot break the file', () => {
    const csv = toCsv(buildViews([make({ name: 'Big One, Day 1' })]))
    expect(csv).toContain('"Big One, Day 1"')
  })

  it('escapes quotes inside a name', () => {
    const csv = toCsv(buildViews([make({ name: 'The "Big" One' })]))
    expect(csv).toContain('"The ""Big"" One"')
  })
})
