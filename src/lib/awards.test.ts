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
        // One night, which is not a consistent month however tidy it looks.
        result({ player: 'Ana', entrants: 1000, place: 500 }),
        result({ player: 'Bogdan', entrants: 1000, place: 100 }),
        result({ player: 'Bogdan', entrants: 1000, place: 140 }),
        result({ player: 'Bogdan', entrants: 1000, place: 180 }),
        result({ player: 'Cristi', entrants: 1000, place: 5 }),
        result({ player: 'Cristi', entrants: 1000, place: 400 }),
        result({ player: 'Cristi', entrants: 1000, place: 900 }),
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

    it('has no owner while only one player has filled one', () => {
      // One candidate is not a contest, and handing it over anyway would
      // also make that player the One Hit Wonder in the same breath.
      const log = [
        result({ player: 'Ana', entrants: 1000, place: 100 }),
        result({ player: 'Ana', entrants: 1000, place: 105 }),
        result({ player: 'Ana', entrants: 1000, place: 110 }),
        result({ player: 'Bogdan', entrants: 1000, place: 200 }),
      ]
      const all = awards(log, standings(log, BEST_3), BEST_3)
      expect(held(all, 'consistent')).toBeUndefined()
      expect(held(all, 'oneHitWonder')).toBeUndefined()
    })

    it('is measured over the scores that count, not every result', () => {
      // The 900th is dropped by the quota, so it cannot make Ana look
      // erratic — the title is about the month the table credited her with.
      const log = [
        result({ player: 'Ana', entrants: 1000, place: 100 }),
        result({ player: 'Ana', entrants: 1000, place: 105 }),
        result({ player: 'Ana', entrants: 1000, place: 110 }),
        result({ player: 'Ana', entrants: 1000, place: 900 }),
        result({ player: 'Bogdan', entrants: 1000, place: 3 }),
        result({ player: 'Bogdan', entrants: 1000, place: 300 }),
        result({ player: 'Bogdan', entrants: 1000, place: 800 }),
      ]
      const title = held(awards(log, standings(log, BEST_3), BEST_3), 'consistent')
      expect(title?.player).toBe('Ana')
      expect(title?.value).toBeLessThan(0.1)
    })
  })

  describe('One Hit Wonder', () => {
    const log = [
      // One enormous night and two ordinary ones.
      result({ player: 'Ana', entrants: 10000, place: 1 }),
      result({ player: 'Ana', entrants: 1000, place: 600 }),
      result({ player: 'Ana', entrants: 1000, place: 700 }),
      // Three of a muchness.
      result({ player: 'Bogdan', entrants: 1000, place: 200 }),
      result({ player: 'Bogdan', entrants: 1000, place: 210 }),
      result({ player: 'Bogdan', entrants: 1000, place: 220 }),
    ]
    const all = awards(log, standings(log, BEST_3), BEST_3)

    it('goes to the total leaning hardest on one night', () => {
      const title = held(all, 'oneHitWonder')
      expect(title?.player).toBe('Ana')
      expect(title?.value).toBeGreaterThan(0.8)
    })

    it('is the other end of the question Mr. Consistent asks', () => {
      expect(held(all, 'consistent')?.player).toBe('Bogdan')
      expect(held(all, 'oneHitWonder')?.player).toBe('Ana')
    })

    it('is a share, so it does not simply follow the leader', () => {
      // Ana has far and away the biggest single score and the biggest
      // total; what wins it is the shape, not the size.
      const steady = [
        result({ player: 'Ana', entrants: 10000, place: 20 }),
        result({ player: 'Ana', entrants: 10000, place: 25 }),
        result({ player: 'Ana', entrants: 10000, place: 30 }),
        result({ player: 'Bogdan', entrants: 1000, place: 1 }),
        result({ player: 'Bogdan', entrants: 1000, place: 900 }),
        result({ player: 'Bogdan', entrants: 1000, place: 950 }),
      ]
      const table = standings(steady, BEST_3)
      expect(table[0].player).toBe('Ana')
      expect(held(awards(steady, table, BEST_3), 'oneHitWonder')?.player).toBe('Bogdan')
    })

    it('wants a full quota, like the title it mirrors', () => {
      const short = [
        result({ player: 'Ana', entrants: 10000, place: 1 }),
        result({ player: 'Bogdan', entrants: 1000, place: 200 }),
        result({ player: 'Bogdan', entrants: 1000, place: 210 }),
        result({ player: 'Bogdan', entrants: 1000, place: 220 }),
      ]
      expect(held(awards(short, standings(short, BEST_3), BEST_3), 'oneHitWonder')).toBeUndefined()
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
        'oneHitWonder',
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

  describe('changing hands as results come in', () => {
    // Nothing here is remembered between calls: a title is worked out from
    // the results it is handed, so a new score moves it the moment the
    // table sees it. These are the four ways that has to show.
    const base = [
      result({ player: 'Ana', entrants: 5000, place: 40, buyIn: 54, bounties: 54 }),
      result({ player: 'Ana', entrants: 1000, place: 300 }),
      result({ player: 'Ana', entrants: 1000, place: 320 }),
      result({ player: 'Bogdan', entrants: 1000, place: 150 }),
      result({ player: 'Bogdan', entrants: 1000, place: 400 }),
      result({ player: 'Bogdan', entrants: 1000, place: 420 }),
    ]
    const titles = (log: ChallengeResult[]) => {
      const all = awards(log, standings(log, BEST_3), BEST_3)
      return Object.fromEntries(all.map((award) => [award.id, award.player]))
    }

    it('moves the Giant Killer when somebody plays a bigger field', () => {
      expect(titles(base).giantKiller).toBe('Ana')
      const after = [...base, result({ player: 'Bogdan', entrants: 9000, place: 2000 })]
      expect(titles(after).giantKiller).toBe('Bogdan')
    })

    it('moves the Bounty Hunter when somebody collects more heads', () => {
      expect(titles(base).bountyHunter).toBe('Ana')
      const after = [
        ...base,
        result({ player: 'Bogdan', entrants: 1000, place: 100, buyIn: 54, bounties: 1080 }),
      ]
      expect(titles(after).bountyHunter).toBe('Bogdan')
    })

    it('moves Mr. Consistent when new scores even somebody out', () => {
      // Ana is carrying one big score and two small ones, so Bogdan's three
      // middling nights are the steadier month to begin with.
      expect(titles(base).consistent).toBe('Bogdan')
      // Then her big score stops being lonely and her three look alike.
      const after = [
        ...base,
        result({ player: 'Ana', entrants: 10000, place: 25 }),
        result({ player: 'Ana', entrants: 10000, place: 28 }),
      ]
      expect(titles(after).consistent).toBe('Ana')
    })

    it('hands a title back when the result it was won on stops counting', () => {
      // Ana spikes a huge score, which makes her the One Hit Wonder; then
      // two more like it, and the month is no longer one night.
      const spiked = [...base, result({ player: 'Ana', entrants: 10000, place: 1 })]
      expect(titles(spiked).oneHitWonder).toBe('Ana')

      const evened = [
        ...spiked,
        result({ player: 'Ana', entrants: 10000, place: 2 }),
        result({ player: 'Ana', entrants: 10000, place: 3 }),
      ]
      expect(titles(evened).oneHitWonder).not.toBe('Ana')
    })
  })
})
