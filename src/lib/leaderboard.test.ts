import { describe, expect, it } from 'vitest'
import {
  FORMATS,
  bountyPoints,
  countedFor,
  finishPoints,
  inMonth,
  inYear,
  monthsIn,
  pot,
  score,
  standings,
  yearsIn,
  type ChallengeResult,
} from './leaderboard'

let seq = 0
const result = (over: Partial<ChallengeResult> = {}): ChallengeResult => ({
  id: `c${(seq += 1)}`,
  player: 'Ana',
  date: '2026-07-04',
  event: 'Bounty Hunters',
  entrants: 1000,
  place: 500,
  buyIn: 22,
  bounties: 0,
  ...over,
})

describe('the finish half of a score', () => {
  it('is 100 root N over R', () => {
    expect(finishPoints(1000, 10)).toBeCloseTo(1000, 6)
    expect(finishPoints(100, 1)).toBeCloseTo(1000, 6)
    expect(finishPoints(10_000, 1)).toBeCloseTo(10_000, 6)
  })

  it('pays a hundred for turning up and busting last', () => {
    expect(finishPoints(500, 500)).toBeCloseTo(100, 6)
  })

  it('treats a place below the field size as bad data, not a worse result', () => {
    // Nobody finishes 600th in a 500-runner. Floor the ratio rather than
    // paying out less than the player who finished last.
    expect(finishPoints(500, 600)).toBeCloseTo(100, 6)
  })

  it('refuses to divide by a field or a place that is not there', () => {
    expect(Number.isFinite(finishPoints(0, 10))).toBe(true)
    expect(Number.isFinite(finishPoints(1000, 0))).toBe(true)
    expect(Number.isFinite(finishPoints(Number.NaN, Number.NaN))).toBe(true)
  })
})

describe('the bounty half of a score', () => {
  it('is 25 times what you collected, per buy-in', () => {
    expect(bountyPoints(22, 22)).toBeCloseTo(25, 6)
    expect(bountyPoints(220, 22)).toBeCloseTo(250, 6)
  })

  it('is a ratio, so the same effort scores the same at any stake', () => {
    expect(bountyPoints(11, 5.5)).toBeCloseTo(bountyPoints(1100, 550), 6)
  })

  it('has nothing to measure against in a freeroll', () => {
    expect(bountyPoints(50, 0)).toBe(0)
  })

  it('does not pay for a negative or missing bounty', () => {
    expect(bountyPoints(-10, 22)).toBe(0)
    expect(bountyPoints(Number.NaN, 22)).toBe(0)
  })
})

describe('a score', () => {
  it('adds the two halves', () => {
    const s = score(result({ entrants: 1000, place: 10, buyIn: 22, bounties: 44 }))
    expect(s).toBeCloseTo(1000 + 50, 6)
  })

  it('is worth more for the same finish in a bigger field', () => {
    const small = score(result({ entrants: 500, place: 10 }))
    const big = score(result({ entrants: 5000, place: 10 }))
    expect(big).toBeGreaterThan(small)
  })
})

describe('the table', () => {
  const field = (player: string, scores: { entrants: number; place: number }[]) =>
    scores.map((spot) => result({ player, ...spot }))

  it('counts only a player\'s best, up to the format limit', () => {
    const format = { ...FORMATS.monthly, best: 2 }
    const [row] = standings(
      field('Ana', [
        { entrants: 1000, place: 10 }, // 1000
        { entrants: 1000, place: 1000 }, // 100
        { entrants: 1000, place: 40 }, // 500
      ]),
      format,
    )
    expect(row.points).toBeCloseTo(1500, 6)
    expect(row.counted).toBe(2)
    expect(row.played).toBe(3)
  })

  it('names the bar a new result has to beat, once the quota is full', () => {
    const format = { ...FORMATS.monthly, best: 2 }
    const [row] = standings(
      field('Ana', [
        { entrants: 1000, place: 10 },
        { entrants: 1000, place: 40 },
      ]),
      format,
    )
    expect(row.cutoff).toBeCloseTo(500, 6)
  })

  it('has no bar while there is still room, because anything helps', () => {
    const [row] = standings(field('Ana', [{ entrants: 1000, place: 10 }]), FORMATS.monthly)
    expect(row.cutoff).toBeNull()
    expect(row.counted).toBe(1)
  })

  it('puts the most points first', () => {
    const rows = standings(
      [
        ...field('Ana', [{ entrants: 1000, place: 500 }]),
        ...field('Bogdan', [{ entrants: 1000, place: 1 }]),
      ],
      FORMATS.monthly,
    )
    expect(rows.map((row) => row.player)).toEqual(['Bogdan', 'Ana'])
    expect(rows.map((row) => row.rank)).toEqual([1, 2])
  })

  it('lets a tie share a rank and pushes the next player down', () => {
    // There is no tiebreak in the rules, and inventing one here would quietly
    // decide who gets paid.
    const rows = standings(
      [
        ...field('Ana', [{ entrants: 1000, place: 10 }]),
        ...field('Bogdan', [{ entrants: 1000, place: 10 }]),
        ...field('Cristi', [{ entrants: 1000, place: 1000 }]),
      ],
      FORMATS.monthly,
    )
    expect(rows.map((row) => row.rank)).toEqual([1, 1, 3])
    expect(rows.map((row) => row.player)).toEqual(['Ana', 'Bogdan', 'Cristi'])
  })

  it('says how much of a total came out of bounties', () => {
    const [row] = standings(
      [result({ player: 'Ana', entrants: 1000, place: 10, buyIn: 22, bounties: 44 })],
      FORMATS.monthly,
    )
    expect(row.fromBounties).toBeCloseTo(50, 6)
    expect(row.points).toBeCloseTo(1050, 6)
  })

  it('has no table without results', () => {
    expect(standings([], FORMATS.yearly)).toEqual([])
  })
})

describe('the two competitions', () => {
  it('are best ten for twenty-five, and best fifty for a hundred', () => {
    expect(FORMATS.monthly).toMatchObject({ best: 10, fee: 25 })
    expect(FORMATS.yearly).toMatchObject({ best: 50, fee: 100 })
  })

  it('pool the fee once per entrant', () => {
    expect(pot(10, FORMATS.monthly)).toBe(250)
    expect(pot(10, FORMATS.yearly)).toBe(1000)
    expect(pot(-3, FORMATS.monthly)).toBe(0)
  })
})

describe('periods', () => {
  const log = [
    result({ date: '2026-07-04' }),
    result({ date: '2026-07-30' }),
    result({ date: '2026-08-01' }),
    result({ date: '2025-12-31' }),
  ]

  it('cuts a calendar month', () => {
    expect(inMonth(log, '2026-07')).toHaveLength(2)
  })

  it('cuts a calendar year', () => {
    expect(inYear(log, '2026')).toHaveLength(3)
  })

  it('lists the periods it has, newest first', () => {
    expect(monthsIn(log)).toEqual(['2026-08', '2026-07', '2025-12'])
    expect(yearsIn(log)).toEqual(['2026', '2025'])
  })
})

describe('showing the working', () => {
  it('hands back the results a standing is made of, best first', () => {
    const format = { ...FORMATS.monthly, best: 2 }
    const counted = countedFor(
      [
        result({ player: 'Ana', entrants: 1000, place: 1000 }),
        result({ player: 'Ana', entrants: 1000, place: 10 }),
        result({ player: 'Ana', entrants: 1000, place: 40 }),
        result({ player: 'Bogdan', entrants: 1000, place: 1 }),
      ],
      'Ana',
      format,
    )
    expect(counted).toHaveLength(2)
    expect(counted.map((entry) => Math.round(entry.score))).toEqual([1000, 500])
  })
})
