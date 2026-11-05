import { describe, expect, it } from 'vitest'
import { buildDemoLog, DEMO_PREFIX, isDemo } from './demoData'
import { SITES } from './sites'
import { amountFor, siteRolls, underwater } from './siteBankrolls'
import { entryCost, entryProfit } from './tracker'

const log = (over: Partial<Parameters<typeof buildDemoLog>[0]> = {}) =>
  buildDemoLog({ seed: 7, today: '2026-11-05', ...over })

describe('a log that never happened', () => {
  it('marks every invented row, so removing them is exact', () => {
    // The whole safety of the demo button rests on this: rows it wrote are
    // identifiable without guessing at which results look made up.
    const { entries } = log()
    expect(entries.every(isDemo)).toBe(true)
    expect(entries.every((entry) => entry.id.startsWith(DEMO_PREFIX))).toBe(true)
  })

  it('gives every row its own id', () => {
    const { entries } = log()
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(entries.length)
  })

  it('repeats exactly for one seed and differs for another', () => {
    expect(log()).toEqual(log())
    expect(log({ seed: 8 }).entries[0].id).not.toBe(log({ seed: 7 }).entries[0].id)
  })

  it('builds the number of tournaments it was asked for', () => {
    expect(log().entries).toHaveLength(140)
    expect(log({ count: 12 }).entries).toHaveLength(12)
  })

  it('stays inside the window, ending today', () => {
    const { entries } = log({ days: 180 })
    for (const entry of entries) {
      expect(entry.date <= '2026-11-05').toBe(true)
      expect(entry.date >= '2026-05-09').toBe(true)
    }
  })

  it('comes out in date order', () => {
    const dates = log().entries.map((entry) => entry.date)
    expect([...dates].sort()).toEqual(dates)
  })

  it('uses only rooms the app knows', () => {
    const rooms = new Set(log().entries.map((entry) => entry.site))
    expect([...rooms].every((room) => (SITES as readonly string[]).includes(room))).toBe(true)
    expect(rooms.size).toBe(SITES.length)
  })

  it('plays one room far more than the rest, the way anybody does', () => {
    const { entries } = log()
    const main = entries.filter((entry) => entry.site === SITES[0]).length
    expect(main / entries.length).toBeGreaterThan(0.35)
  })

  it('keeps every amount a real amount', () => {
    for (const entry of log().entries) {
      expect(entry.buyIn).toBeGreaterThan(0)
      expect(entry.fee).toBe(0)
      expect(entry.cashed).toBeGreaterThanOrEqual(0)
      expect(entry.bounties).toBeGreaterThanOrEqual(0)
      expect(Number.isFinite(entryCost(entry))).toBe(true)
      if (entry.position !== undefined) expect(entry.position).toBeGreaterThan(0)
    }
  })

  it('cashes rarely, which is what the game does', () => {
    const { entries } = log({ count: 600 })
    const itm = entries.filter((entry) => entry.cashed > 0).length / entries.length
    expect(itm).toBeGreaterThan(0.05)
    expect(itm).toBeLessThan(0.25)
  })

  it('leaves most finishing places unrecorded, as people do', () => {
    const { entries } = log({ count: 600 })
    const recorded = entries.filter((entry) => entry.position !== undefined).length
    expect(recorded).toBeGreaterThan(0)
    expect(recorded / entries.length).toBeLessThan(0.5)
  })

  it('puts round numbers on every room as starting money', () => {
    const { bankrolls } = log()
    expect(bankrolls.map((roll) => roll.id)).toEqual([...SITES])
    for (const roll of bankrolls) {
      expect(roll.amount).toBeGreaterThan(0)
      expect(roll.amount % 25).toBe(0)
    }
  })

  it('funds every room past its own worst stretch, so no account goes under', () => {
    // A demo that trips the "money came from somewhere this log does not know
    // about" warning on load teaches you to ignore the one time it matters.
    for (const seed of [1, 7, 99, 12345, 2147483646]) {
      const { entries, bankrolls } = log({ seed })
      expect(underwater(siteRolls(entries, bankrolls))).toEqual([])
    }
  })

  it('keeps every room solvent the whole way down the log, not just at the end', () => {
    const { entries, bankrolls } = log()
    const running = new Map<string, number>()
    for (const entry of entries) {
      const balance =
        (running.get(entry.site) ?? amountFor(bankrolls, entry.site)) + entryProfit(entry)
      running.set(entry.site, balance)
      expect(balance).toBeGreaterThan(0)
    }
  })

  it('knows a real row when it sees one', () => {
    expect(isDemo({ id: 'e-abc-123' })).toBe(false)
  })
})
