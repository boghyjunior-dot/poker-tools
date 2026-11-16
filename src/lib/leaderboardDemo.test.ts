import { describe, expect, it } from 'vitest'
import { FORMATS, inYear, standings } from './leaderboard'
import { PLAYERS, buildChallengeLog } from './leaderboardDemo'

const log = (over: Partial<Parameters<typeof buildChallengeLog>[0]> = {}) =>
  buildChallengeLog({ seed: 2026, from: '2026-01-01', days: 319, ...over })

describe('a field that never played', () => {
  it('repeats exactly for one seed and differs for another', () => {
    expect(log()).toEqual(log())
    expect(log({ seed: 7 })[0]).not.toEqual(log()[0])
  })

  it('plays everybody the number of tournaments their profile says', () => {
    const results = log()
    for (const profile of PLAYERS) {
      expect(results.filter((row) => row.player === profile.name)).toHaveLength(profile.volume)
    }
  })

  it('gives every result its own id', () => {
    const results = log()
    expect(new Set(results.map((row) => row.id)).size).toBe(results.length)
  })

  it('never finishes somebody below the size of the field they entered', () => {
    for (const row of log()) {
      expect(row.place).toBeGreaterThanOrEqual(1)
      expect(row.place).toBeLessThanOrEqual(row.entrants)
    }
  })

  it('keeps the fields inside the range the profile plays', () => {
    const byName = new Map(PLAYERS.map((profile) => [profile.name, profile]))
    for (const row of log()) {
      const profile = byName.get(row.player)
      expect(row.entrants).toBeGreaterThanOrEqual(profile?.field[0] ?? 1)
      expect(row.entrants).toBeLessThanOrEqual(profile?.field[1] ?? Infinity)
    }
  })

  it('stays inside the window it was given', () => {
    for (const row of log({ from: '2026-03-01', days: 31 })) {
      expect(row.date >= '2026-03-01').toBe(true)
      expect(row.date <= '2026-03-31').toBe(true)
    }
  })

  it('keeps every amount a real amount', () => {
    for (const row of log()) {
      expect(row.buyIn).toBeGreaterThan(0)
      expect(row.bounties).toBeGreaterThanOrEqual(0)
      expect(Number.isFinite(row.bounties)).toBe(true)
    }
  })

  it('comes out in date order', () => {
    const dates = log().map((row) => row.date)
    expect([...dates].sort()).toEqual(dates)
  })

  it('leaves the non-bounty players some tournaments without a head on them', () => {
    const results = log()
    const dry = results.filter((row) => row.bounties === 0)
    expect(dry.length).toBeGreaterThan(0)
    expect(dry.length).toBeLessThan(results.length)
  })

  it('produces a field nobody runs away with', () => {
    // If the mock handed one profile a runaway win it would be measuring the
    // mock rather than the formula, which is the whole point of having it.
    const table = standings(inYear(log(), '2026'), FORMATS.yearly)
    expect(table).toHaveLength(PLAYERS.length)
    expect(table[0].points).toBeLessThan(table[table.length - 1].points * 6)
  })
})
