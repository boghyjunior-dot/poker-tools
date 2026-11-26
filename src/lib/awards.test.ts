import { describe, expect, it } from 'vitest'
import { AWARD_LABELS, awards, awardsFor, spread, type Award } from './awards'
import { FORMATS, STAKE_FLOOR, standings, type ChallengeResult } from './leaderboard'

let seq = 0
const result = (over: Partial<ChallengeResult> = {}): ChallengeResult => ({
  id: `a${(seq += 1)}`,
  player: 'Ana',
  date: '2026-12-04',
  event: 'Daily Main',
  site: 'GGPoker',
  entrants: 1000,
  place: 500,
  buyIn: STAKE_FLOOR,
  bounties: 0,
  cashed: 0,
  ...over,
})

/** The three-best format, so a quota fills without forty fixtures. */
const BEST_3 = { ...FORMATS.monthly, best: 3 }

const held = (all: readonly Award[], id: string) => all.find((award) => award.id === id)

describe('how uneven a set of scores is', () => {
  it('is nought when every score is the same', () => {
    expect(spread([500, 500, 500])).toBe(0)
  })

  it('grows as the scores pull apart', () => {
    expect(spread([400, 500, 600])).toBeGreaterThan(spread([480, 500, 520]))
  })

  it('is measured against the average, not in points', () => {
    // The whole reason it is a ratio: ten scores around 150 are closer
    // together in points than ten around 1,500 and no steadier for it.
    expect(spread([100, 200])).toBeCloseTo(spread([1000, 2000]), 12)
  })

  it('has nothing to say about a single score', () => {
    expect(spread([900])).toBe(0)
    expect(spread([])).toBe(0)
  })

  it('refuses to divide by a mean of nothing', () => {
    expect(spread([0, 0])).toBe(0)
  })
})

describe('the titles the standings do not hand out', () => {
  describe('Giant Killer', () => {
    it('goes to the best finish in the biggest field anybody played', () => {
      const log = [
        // The biggest field, contested. Bogdan went deeper.
        result({ player: 'Ana', entrants: 9000, place: 80 }),
        result({ player: 'Bogdan', entrants: 9000, place: 12 }),
        // A win, but in a field a tenth the size.
        result({ player: 'Cristi', entrants: 900, place: 1 }),
      ]
      const title = held(awards(log, standings(log, BEST_3), BEST_3), 'giantKiller')
      expect(title?.player).toBe('Bogdan')
      expect(title?.value).toBe(12)
      expect(title?.entrants).toBe(9000)
    })

    it('does not care how a smaller field went', () => {
      const log = [
        result({ player: 'Ana', entrants: 9000, place: 400 }),
        result({ player: 'Bogdan', entrants: 8999, place: 1 }),
      ]
      expect(held(awards(log, standings(log, BEST_3), BEST_3), 'giantKiller')?.player).toBe('Ana')
    })

    it('settles a dead heat alphabetically rather than inventing a rule', () => {
      const log = [
        result({ player: 'Bogdan', entrants: 5000, place: 7 }),
        result({ player: 'Ana', entrants: 5000, place: 7 }),
      ]
      expect(held(awards(log, standings(log, BEST_3), BEST_3), 'giantKiller')?.player).toBe('Ana')
    })

    it('has no owner when nothing has been played', () => {
      expect(awards([], standings([], BEST_3), BEST_3)).toEqual([])
    })
  })

  describe('Bounty Hunter', () => {
    it('goes to the largest share of a total, not the largest haul', () => {
      const log = [
        // A big haul, but it is a small part of a big total.
        result({ player: 'Ana', entrants: 10000, place: 5, buyIn: 54, bounties: 540 }),
        // A smaller haul carrying almost all of a modest total.
        result({ player: 'Bogdan', entrants: 1000, place: 900, buyIn: 54, bounties: 540 }),
      ]
      const title = held(awards(log, standings(log, BEST_3), BEST_3), 'bountyHunter')
      expect(title?.player).toBe('Bogdan')
      expect(title?.value).toBeGreaterThan(0.5)
    })

    it('has no owner in a month nobody collected a head in', () => {
      const log = [result({ player: 'Ana', bounties: 0 })]
      expect(held(awards(log, standings(log, BEST_3), BEST_3), 'bountyHunter')).toBeUndefined()
    })
  })

  describe('Mr. Consistent', () => {
    it('goes to the tightest spread across a full quota', () => {
      const log = [
        // Three near-identical nights.
        result({ player: 'Ana', entrants: 1000, place: 100 }),
        result({ player: 'Ana', entrants: 1000, place: 105 }),
        result({ player: 'Ana', entrants: 1000, place: 110 }),
        // One huge night and two poor ones.
        result({ player: 'Bogdan', entrants: 1000, place: 2 }),
        result({ player: 'Bogdan', entrants: 1000, place: 800 }),
        result({ player: 'Bogdan', entrants: 1000, place: 900 }),
      ]
      const title = held(awards(log, standings(log, BEST_3), BEST_3), 'consistent')
      expect(title?.player).toBe('Ana')
      expect(title?.value).toBeLessThan(0.1)
    })

    it('will not hand it to a short sample', () => {
      const log = [
        // One perfect night and nothing else is not a consistent month.
        result({ player: 'Ana', entrants: 1000, place: 500 }),
        result({ player: 'Bogdan', entrants: 1000, place: 100 }),
        result({ player: 'Bogdan', entrants: 1000, place: 140 }),
        result({ player: 'Bogdan', entrants: 1000, place: 180 }),
      ]
      expect(held(awards(log, standings(log, BEST_3), BEST_3), 'consistent')?.player).toBe('Bogdan')
    })

    it('has no owner before anybody has filled a quota', () => {
      const log = [
        result({ player: 'Ana', entrants: 1000, place: 100 }),
        result({ player: 'Ana', entrants: 1000, place: 110 }),
      ]
      expect(held(awards(log, standings(log, BEST_3), BEST_3), 'consistent')).toBeUndefined()
    })

    it('is measured over the scores that count, not every result', () => {
      // The 900th is dropped by the quota, so it cannot make Ana look
      // erratic — the title is about the month the table credited her with.
      const log = [
        result({ player: 'Ana', entrants: 1000, place: 100 }),
        result({ player: 'Ana', entrants: 1000, place: 105 }),
        result({ player: 'Ana', entrants: 1000, place: 110 }),
        result({ player: 'Ana', entrants: 1000, place: 900 }),
      ]
      const title = held(awards(log, standings(log, BEST_3), BEST_3), 'consistent')
      expect(title?.player).toBe('Ana')
      expect(title?.value).toBeLessThan(0.1)
    })
  })

  describe('wearing them', () => {
    const log = [
      result({ player: 'Ana', entrants: 9000, place: 3, buyIn: 54, bounties: 2700 }),
      result({ player: 'Ana', entrants: 1000, place: 100 }),
      result({ player: 'Ana', entrants: 1000, place: 500 }),
      result({ player: 'Bogdan', entrants: 1000, place: 200 }),
      result({ player: 'Bogdan', entrants: 1000, place: 210 }),
      result({ player: 'Bogdan', entrants: 1000, place: 220 }),
    ]
    const all = awards(log, standings(log, BEST_3), BEST_3)

    it('gives one player more than one title when they earned it', () => {
      expect(awardsFor(all, 'Ana').map((award) => award.id)).toEqual([
        'giantKiller',
        'bountyHunter',
      ])
    })

    it('gives a player with none an empty list rather than a hole', () => {
      expect(awardsFor(all, 'Nobody')).toEqual([])
    })

    it('shows them in one order whatever order they were won in', () => {
      expect(awardsFor(all, 'Bogdan').map((award) => award.id)).toEqual(['consistent'])
      expect(AWARD_LABELS.consistent).toBe('Mr. Consistent')
    })
  })
})
