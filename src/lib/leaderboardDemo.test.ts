import { describe, expect, it } from 'vitest'
import {
  DAILY_MAIN,
  FORMATS,
  ineligible,
  inYear,
  isLastLonger,
  lastLongerRounds,
  standings,
} from './leaderboard'
import { DEMO_PROFILES, PLAYERS, buildChallengeLog } from './leaderboardDemo'

const log = (over: Partial<Parameters<typeof buildChallengeLog>[0]> = {}) =>
  buildChallengeLog({ seed: 2026, from: '2026-01-01', days: 319, ...over })

describe('a field that never played', () => {
  it('repeats exactly for one seed and differs for another', () => {
    expect(log()).toEqual(log())
    expect(log({ seed: 7 })[0]).not.toEqual(log()[0])
  })

  it('plays everybody the number of tournaments their own schedule says', () => {
    // The Daily Main is on top of that: it is one shared tournament rather
    // than part of anybody's private schedule.
    const own = log().filter((row) => !isLastLonger(row, DAILY_MAIN))
    for (const profile of PLAYERS) {
      expect(own.filter((row) => row.player === profile.name)).toHaveLength(profile.volume)
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
    for (const row of log().filter((entry) => !isLastLonger(entry, DAILY_MAIN))) {
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

  it('runs the Daily Main as one tournament, not ten private ones', () => {
    // The whole point of a last longer: the same field on the same night, so
    // the finishing places can be compared at all.
    const nights = new Map<string, Set<number>>()
    for (const row of log().filter((entry) => isLastLonger(entry, DAILY_MAIN))) {
      const seen = nights.get(row.date) ?? new Set<number>()
      seen.add(row.entrants)
      nights.set(row.date, seen)
    }
    expect(nights.size).toBeGreaterThan(100)
    for (const sizes of nights.values()) expect(sizes.size).toBe(1)
  })

  it('never finishes two players in the same place on the same night', () => {
    const nights = new Map<string, number[]>()
    for (const row of log().filter((entry) => isLastLonger(entry, DAILY_MAIN))) {
      nights.set(row.date, [...(nights.get(row.date) ?? []), row.place])
    }
    for (const places of nights.values()) {
      expect(new Set(places).size).toBe(places.length)
    }
  })

  it('gives the last longer a contest most nights, and a winner each time', () => {
    const rounds = lastLongerRounds(log(), DAILY_MAIN)
    expect(rounds.length).toBeGreaterThan(100)
    for (const round of rounds) {
      expect(round.contested).toBeGreaterThanOrEqual(2)
      expect(round.winners).toHaveLength(1)
      expect(round.score).toBeGreaterThan(0)
    }
  })

  it('produces a field nobody runs away with', () => {
    // If the mock handed one profile a runaway win it would be measuring the
    // mock rather than the formula, which is the whole point of having it.
    const table = standings(inYear(log(), '2026'), FORMATS.yearly)
    expect(table).toHaveLength(PLAYERS.length)
    expect(table[0].points).toBeLessThan(table[table.length - 1].points * 6)
  })
})

describe('Snapper', () => {
  const snapper = () => PLAYERS.find((profile) => profile.name === 'Snapper')

  it('is in the field, with a face and a line of his own', () => {
    expect(snapper()).toBeDefined()
    expect(snapper()?.avatar).toBe('./players/snapper.webp')
    expect(snapper()?.blurb).toBe('I snap call ya')
  })

  it('has a profile card built from the same blurb the generator uses', () => {
    const card = DEMO_PROFILES.find((profile) => profile.name === 'Snapper')
    expect(card).toEqual({
      name: 'Snapper',
      description: 'I snap call ya',
      avatar: './players/snapper.webp',
    })
  })

  it('gives every player in the field a card', () => {
    expect(DEMO_PROFILES.map((card) => card.name).sort()).toEqual(
      PLAYERS.map((profile) => profile.name).sort(),
    )
    expect(DEMO_PROFILES.every((card) => card.description.length > 0)).toBe(true)
  })

  it('finishes worse than the field average, which is the joke', () => {
    // A calling station should not quietly out-run the regulars in the mock.
    expect(snapper()?.skill).toBeLessThan(1)
  })

  it('turns up for the Main more than anybody', () => {
    const most = Math.max(...PLAYERS.map((profile) => profile.dailyMain))
    expect(snapper()?.dailyMain).toBe(most)
  })

  it('actually plays, so the table has something to show', () => {
    const results = log().filter((row) => row.player === 'Snapper')
    expect(results.length).toBeGreaterThan(200)
  })
})

describe('the mock field plays inside the band', () => {
  it('fires nothing the challenge would throw out', () => {
    // A demo full of ineligible results would be showing a competition
    // nobody is actually in.
    expect(ineligible(log())).toEqual([])
  })

  it('uses the width of the band, not one corner of it', () => {
    const stakes = [...new Set(log().map((row) => row.buyIn))].sort((a, b) => a - b)
    expect(stakes[0]).toBeLessThanOrEqual(11)
    expect(stakes[stakes.length - 1]).toBeGreaterThanOrEqual(54)
    expect(stakes.length).toBeGreaterThan(4)
  })

  it('still has somebody at each end of it', () => {
    const byName = new Map(PLAYERS.map((p) => [p.name, p]))
    const cheapest = Math.min(...PLAYERS.map((p) => Math.min(...p.buyIns)))
    const dearest = Math.max(...PLAYERS.map((p) => Math.max(...p.buyIns)))
    expect(cheapest).toBeLessThanOrEqual(5.5)
    expect(dearest).toBeGreaterThanOrEqual(55)
    expect(byName.get('Dana M.')?.buyIns.some((b) => b >= 55)).toBe(true)
  })
})
