import { describe, expect, it } from 'vitest'
import {
  DAILY_MAIN,
  FORMATS,
  MIN_CONTESTED,
  PRIZE_SHARES,
  SEASON,
  STAKE_CEILING,
  STAKE_EXPONENT,
  STAKE_FLOOR,
  bountyPoints,
  cashByPlayer,
  countedFor,
  finishPoints,
  inMonth,
  inYear,
  eligible,
  history,
  isEligible,
  isLastLonger,
  ineligible,
  lastLongerRounds,
  lastLongerStandings,
  monthlyQualifiers,
  monthsIn,
  pot,
  openingMonth,
  prizes,
  score,
  seasonMonths,
  seasonYears,
  stakeFactor,
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
  site: 'GGPoker',
  entrants: 1000,
  place: 500,
  buyIn: STAKE_FLOOR,
  bounties: 0,
  cashed: 0,
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
    const s = score(result({ entrants: 1000, place: 10, buyIn: 5, bounties: 10 }))
    expect(s).toBeCloseTo(1000 + 50, 6)
  })

  it('multiplies the lot by the stake', () => {
    const cheap = score(result({ entrants: 1000, place: 10, buyIn: STAKE_FLOOR }))
    const dear = score(result({ entrants: 1000, place: 10, buyIn: STAKE_CEILING }))
    expect(dear).toBeCloseTo(cheap * stakeFactor(STAKE_CEILING), 6)
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
      [result({ player: 'Ana', entrants: 1000, place: 10, buyIn: 5, bounties: 10 })],
      FORMATS.monthly,
    )
    expect(row.fromBounties).toBeCloseTo(50, 6)
    expect(row.points).toBeCloseTo(1050, 6)
  })

  it('counts the share over the scores that are counting, not every one', () => {
    const format = { ...FORMATS.monthly, best: 1 }
    const [row] = standings(
      [
        result({ player: 'Ana', entrants: 1000, place: 10, buyIn: 5, bounties: 10 }),
        result({ player: 'Ana', entrants: 1000, place: 900, buyIn: 5, bounties: 100 }),
      ],
      format,
    )
    expect(row.counted).toBe(1)
    expect(row.fromBounties).toBeCloseTo(50, 6)
  })

  it('has no table without results', () => {
    expect(standings([], FORMATS.yearly)).toEqual([])
  })
})

describe('the stake', () => {
  it('counts for nothing at the bottom of the band', () => {
    expect(stakeFactor(STAKE_FLOOR)).toBeCloseTo(1, 10)
  })

  it('is a shallow root, so the whole band is under two to one', () => {
    // Finishing points go as the square root of the field, so a factor of f
    // is worth finishing f² deeper. Anything steeper than this and the stake
    // stops being a nudge and starts being the competition.
    const spread = stakeFactor(STAKE_CEILING)
    expect(STAKE_EXPONENT).toBe(0.25)
    expect(spread).toBeGreaterThan(1.5)
    expect(spread).toBeLessThan(2)
    expect(spread ** 2).toBeLessThan(4)
  })

  it('rises with the buy-in, all the way up the band', () => {
    const steps = [5, 11, 22, 33, 54, 60].map(stakeFactor)
    for (let i = 1; i < steps.length; i += 1) expect(steps[i]).toBeGreaterThan(steps[i - 1])
  })

  it('goes no further than the band, in either direction', () => {
    // A stray row from outside should be dull rather than spectacular.
    expect(stakeFactor(500)).toBeCloseTo(stakeFactor(STAKE_CEILING), 10)
    expect(stakeFactor(1)).toBeCloseTo(stakeFactor(STAKE_FLOOR), 10)
  })

  it('does not fall over on a buy-in that is not one', () => {
    expect(stakeFactor(0)).toBe(1)
    expect(stakeFactor(-20)).toBe(1)
    expect(stakeFactor(Number.NaN)).toBe(1)
  })
})

describe('what is in the challenge', () => {
  it('takes the band, ends included', () => {
    expect(isEligible(result({ buyIn: STAKE_FLOOR }))).toBe(true)
    expect(isEligible(result({ buyIn: STAKE_CEILING }))).toBe(true)
    expect(isEligible(result({ buyIn: 22 }))).toBe(true)
  })

  it('leaves out anything cheaper or dearer', () => {
    expect(isEligible(result({ buyIn: 4.99 }))).toBe(false)
    expect(isEligible(result({ buyIn: 109 }))).toBe(false)
    expect(isEligible(result({ buyIn: 0 }))).toBe(false)
  })

  it('splits a log into what counts and what does not', () => {
    const log = [
      result({ player: 'Ana', buyIn: 22 }),
      result({ player: 'Bogdan', buyIn: 215 }),
      result({ player: 'Cristi', buyIn: 2.2 }),
    ]
    expect(eligible(log).map((row) => row.player)).toEqual(['Ana'])
    expect(ineligible(log).map((row) => row.player)).toEqual(['Bogdan', 'Cristi'])
  })

  it('keeps the two halves adding up to the whole', () => {
    const log = [result({ buyIn: 22 }), result({ buyIn: 215 }), result({ buyIn: 5 })]
    expect(eligible(log).length + ineligible(log).length).toBe(log.length)
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

describe('the last longer', () => {
  const main = (over: Partial<ChallengeResult> = {}) =>
    result({ event: 'Daily Main', site: 'GGPoker', buyIn: 54, ...over })

  it('knows the one event it is run in', () => {
    expect(DAILY_MAIN).toEqual({ event: 'Daily Main', site: 'GGPoker', buyIn: 54 })
    expect(isLastLonger(main(), DAILY_MAIN)).toBe(true)
  })

  it('is not the same name in another lobby, or at another buy-in', () => {
    // A Mini Main and a satellite into the Main are not the Main.
    expect(isLastLonger(main({ site: 'PokerStars' }), DAILY_MAIN)).toBe(false)
    expect(isLastLonger(main({ buyIn: 5.5 }), DAILY_MAIN)).toBe(false)
    expect(isLastLonger(main({ event: 'Mini Main' }), DAILY_MAIN)).toBe(false)
  })

  it('gives the night to whoever busted last', () => {
    const [round] = lastLongerRounds([
      main({ player: 'Ana', place: 80 }),
      main({ player: 'Bogdan', place: 12 }),
      main({ player: 'Cristi', place: 340 }),
    ])
    expect(round.winners).toEqual(['Bogdan'])
    expect(round.place).toBe(12)
    expect(round.contested).toBe(3)
  })

  it('reports what the winner cashed, not what they scored', () => {
    // The last longer is a tournament everybody entered, so the answer to
    // "what did lasting longest get you" is in money.
    const [round] = lastLongerRounds([
      main({ player: 'Ana', entrants: 1000, place: 10, cashed: 420, bounties: 99 }),
      main({ player: 'Bogdan', entrants: 1000, place: 500, cashed: 0 }),
    ])
    expect(round.cash).toBe(420)
  })

  it('counts the prize only, with the buy-in left on and the heads left out', () => {
    const [round] = lastLongerRounds([
      main({ player: 'Ana', place: 10, buyIn: 54, cashed: 200, bounties: 150 }),
      main({ player: 'Bogdan', place: 900 }),
    ])
    expect(round.cash).toBe(200)
  })

  it('does not record a walkover as a win', () => {
    // One entrant is not a contest, and counting it would reward being the
    // only one awake.
    expect(lastLongerRounds([main({ player: 'Ana', date: '2026-07-04' })])).toEqual([])
    expect(MIN_CONTESTED).toBe(2)
  })

  it('keeps the nights apart', () => {
    const rounds = lastLongerRounds([
      main({ date: '2026-07-04', player: 'Ana', place: 5 }),
      main({ date: '2026-07-04', player: 'Bogdan', place: 50 }),
      main({ date: '2026-07-05', player: 'Ana', place: 90 }),
      main({ date: '2026-07-05', player: 'Bogdan', place: 9 }),
    ])
    expect(rounds).toHaveLength(2)
    expect(rounds.map((round) => round.date)).toEqual(['2026-07-05', '2026-07-04'])
    expect(rounds.map((round) => round.winners[0])).toEqual(['Bogdan', 'Ana'])
  })

  it('shows both names rather than picking one, when the data says they tied', () => {
    // Two people cannot finish 40th in the same tournament, so this is a typo
    // somewhere — and quietly choosing a winner would hide it.
    const [round] = lastLongerRounds([
      main({ player: 'Ana', place: 40 }),
      main({ player: 'Bogdan', place: 40 }),
    ])
    expect(round.winners).toEqual(['Ana', 'Bogdan'])
  })

  it('ignores everything that is not the Main', () => {
    expect(
      lastLongerRounds([
        result({ player: 'Ana', event: 'Sunday Major', place: 1 }),
        main({ player: 'Bogdan', place: 70 }),
        main({ player: 'Cristi', place: 90 }),
      ])[0].winners,
    ).toEqual(['Bogdan'])
  })
})

describe('the last longer table', () => {
  const night = (date: string, places: Record<string, number>) =>
    Object.entries(places).map(([player, place]) =>
      result({ event: 'Daily Main', site: 'GGPoker', buyIn: 54, date, player, place }),
    )

  const log = [
    ...night('2026-07-01', { Ana: 10, Bogdan: 200, Cristi: 400 }),
    ...night('2026-07-02', { Ana: 300, Bogdan: 20 }),
    ...night('2026-07-03', { Ana: 5, Bogdan: 600, Cristi: 60 }),
  ]

  it('counts the nights each player took', () => {
    const table = lastLongerStandings(log)
    expect(table.map((row) => [row.player, row.won])).toEqual([
      ['Ana', 2],
      ['Bogdan', 1],
      ['Cristi', 0],
    ])
  })

  it('counts the nights they turned up for', () => {
    const table = new Map(lastLongerStandings(log).map((row) => [row.player, row]))
    expect(table.get('Ana')?.played).toBe(3)
    expect(table.get('Cristi')?.played).toBe(2)
    expect(table.get('Cristi')?.winPct).toBe(0)
    expect(table.get('Ana')?.winPct).toBeCloseTo(66.67, 1)
  })

  it('remembers the deepest anybody got, win or not', () => {
    const table = new Map(lastLongerStandings(log).map((row) => [row.player, row]))
    expect(table.get('Bogdan')?.bestPlace).toBe(20)
    expect(table.get('Cristi')?.bestPlace).toBe(60)
  })

  it('adds up what the winning nights paid', () => {
    const table = new Map(lastLongerStandings(log).map((row) => [row.player, row]))
    const rounds = lastLongerRounds(log).filter((round) => round.winners.includes('Ana'))
    expect(table.get('Ana')?.cashFromWins).toBeCloseTo(
      rounds.reduce((sum, round) => sum + round.cash, 0),
      6,
    )
  })

  it('lets a tie on wins share a rank', () => {
    const table = lastLongerStandings([
      ...night('2026-07-01', { Ana: 10, Bogdan: 200 }),
      ...night('2026-07-02', { Ana: 300, Bogdan: 20 }),
    ])
    expect(table.map((row) => row.rank)).toEqual([1, 1])
  })

  it('leaves out a player whose only nights were walkovers', () => {
    const table = lastLongerStandings([
      ...night('2026-07-01', { Ana: 10, Bogdan: 200 }),
      ...night('2026-07-09', { Cristi: 3 }),
    ])
    expect(table.map((row) => row.player)).toEqual(['Ana', 'Bogdan'])
  })

  it('has no table without a contest', () => {
    expect(lastLongerStandings([])).toEqual([])
  })
})

describe('the season', () => {
  const log = [
    result({ date: '2027-03-04' }),
    result({ date: '2027-03-19' }),
    result({ date: '2026-11-02' }),
  ]

  it('is a year the page knows without being told by the results', () => {
    // A leaderboard that only exists once somebody has played is one nobody
    // can sign up to.
    expect(SEASON).toMatch(/^\d{4}$/)
    expect(seasonYears([])).toEqual([SEASON])
  })

  it('offers every month of it, played or not', () => {
    const months = seasonMonths([], '2027')
    expect(months).toHaveLength(12)
    expect(months[0]).toBe('2027-12')
    expect(months[11]).toBe('2027-01')
  })

  it('keeps a month from outside the season when something was played in it', () => {
    expect(seasonMonths(log, '2027')).toContain('2026-11')
    expect(seasonMonths(log, '2027')).toHaveLength(13)
  })

  it('does not list a month twice when the season has results in it', () => {
    const months = seasonMonths(log, '2027')
    expect(new Set(months).size).toBe(months.length)
  })

  it('lists the years newest first, with the season among them', () => {
    expect(seasonYears(log, '2027')).toEqual(['2027', '2026'])
  })

  it('opens on the newest month anybody has played', () => {
    expect(openingMonth(log, '2027')).toBe('2027-03')
  })

  it('opens on January when nobody has played yet', () => {
    expect(openingMonth([], '2027')).toBe('2027-01')
  })
})

describe('the prize money', () => {
  const table = (points: number[]) =>
    standings(
      points.flatMap((value, index) =>
        Array.from({ length: value }, () =>
          result({ player: `P${index}`, entrants: 1000, place: 10 }),
        ),
      ),
      { ...FORMATS.monthly, best: 1000 },
    )

  it('splits half, a third and a fifth', () => {
    expect(PRIZE_SHARES).toEqual([0.5, 0.3, 0.2])
  })

  it('pays the top three out of the pot the entrants made', () => {
    const rows = table([5, 4, 3, 2, 1])
    const paid = prizes(rows, FORMATS.monthly)
    const total = pot(rows.length, FORMATS.monthly)
    expect(total).toBe(125)
    expect(paid.get('P0')).toBeCloseTo(62.5, 6)
    expect(paid.get('P1')).toBeCloseTo(37.5, 6)
    expect(paid.get('P2')).toBeCloseTo(25, 6)
  })

  it('pays nobody below third', () => {
    const paid = prizes(table([5, 4, 3, 2, 1]), FORMATS.monthly)
    expect(paid.has('P3')).toBe(false)
    expect(paid.has('P4')).toBe(false)
  })

  it('pays out the whole pot and not a penny more', () => {
    const rows = table([5, 4, 3, 2, 1])
    const paid = prizes(rows, FORMATS.monthly)
    const handed = [...paid.values()].reduce((sum, value) => sum + value, 0)
    expect(handed).toBeCloseTo(pot(rows.length, FORMATS.monthly), 6)
  })

  it('makes a tie share the places it occupies, not the better one', () => {
    // Level at the top takes first and second between them; the next player
    // is third, which is how every prize pool in poker has worked.
    const rows = table([4, 4, 2, 1])
    const paid = prizes(rows, FORMATS.monthly)
    expect(rows.map((row) => row.rank)).toEqual([1, 1, 3, 4])
    expect(paid.get('P0')).toBeCloseTo(40, 6)
    expect(paid.get('P1')).toBeCloseTo(40, 6)
    expect(paid.get('P2')).toBeCloseTo(20, 6)
  })

  it('still pays out everything when a tie spans the bubble', () => {
    const rows = table([5, 3, 3, 3])
    const paid = prizes(rows, FORMATS.monthly)
    const handed = [...paid.values()].reduce((sum, value) => sum + value, 0)
    expect(handed).toBeCloseTo(pot(rows.length, FORMATS.monthly), 6)
  })

  it('scales back up when the field is smaller than the places paid', () => {
    // Three places out of two entrants would leave a fifth of the pot
    // belonging to nobody.
    const rows = table([5, 3])
    const paid = prizes(rows, FORMATS.monthly)
    expect([...paid.values()].reduce((sum, value) => sum + value, 0)).toBeCloseTo(50, 6)
    expect(paid.get('P0')).toBeCloseTo(31.25, 6)
    expect(paid.get('P1')).toBeCloseTo(18.75, 6)
  })

  it('gives one entrant the lot', () => {
    const rows = table([3])
    expect(prizes(rows, FORMATS.monthly).get('P0')).toBeCloseTo(25, 6)
  })

  it('has nothing to pay out of an empty table', () => {
    expect(prizes([], FORMATS.yearly).size).toBe(0)
  })

  it('pays more out of the yearly pot than the monthly one', () => {
    const rows = table([5, 4, 3])
    const monthly = prizes(rows, FORMATS.monthly).get('P0') ?? 0
    const yearly = prizes(rows, FORMATS.yearly).get('P0') ?? 0
    expect(yearly).toBeCloseTo(monthly * (FORMATS.yearly.fee / FORMATS.monthly.fee), 6)
  })
})

describe('qualifying for the year', () => {
  const night = (player: string, date: string, place: number) =>
    result({ player, date, place, entrants: 1000, buyIn: 5 })

  it('keeps each player a month at a time', () => {
    const log = [
      ...Array.from({ length: 5 }, (_, i) => night('Ana', '2027-01-0' + (i + 1), 10 + i)),
      ...Array.from({ length: 5 }, (_, i) => night('Ana', '2027-02-0' + (i + 1), 10 + i)),
    ]
    expect(monthlyQualifiers(log, 3)).toHaveLength(6)
  })

  it('takes the best of a month and leaves the rest out', () => {
    const log = [night('Ana', '2027-01-01', 1), night('Ana', '2027-01-02', 900), night('Ana', '2027-01-03', 5)]
    const kept = monthlyQualifiers(log, 2).map((row) => row.place).sort((a, b) => a - b)
    expect(kept).toEqual([1, 5])
  })

  it('does not let one player eat another player\'s places', () => {
    const log = [
      night('Ana', '2027-01-01', 1),
      night('Ana', '2027-01-02', 2),
      night('Bogdan', '2027-01-03', 800),
    ]
    const kept = monthlyQualifiers(log, 2)
    expect(kept.filter((row) => row.player === 'Bogdan')).toHaveLength(1)
  })

  it('keeps everything when nobody fills their ten', () => {
    const log = [night('Ana', '2027-01-01', 4), night('Ana', '2027-02-01', 9)]
    expect(monthlyQualifiers(log, 10)).toHaveLength(2)
  })

  it('means a score outside a monthly ten can never reach the year', () => {
    // The whole point of the rule: a result has to earn its place twice.
    const strong = Array.from({ length: 10 }, (_, i) => night('Ana', '2027-01-0' + ((i % 9) + 1), i + 1))
    const extra = night('Ana', '2027-01-15', 400)
    const kept = monthlyQualifiers([...strong, extra], 10)
    expect(kept).toHaveLength(10)
    expect(kept.some((row) => row.id === extra.id)).toBe(false)
  })

  it('has nothing to qualify out of an empty log', () => {
    expect(monthlyQualifiers([], 10)).toEqual([])
  })
})

describe('what has been entered', () => {
  it('puts the newest entry first, whenever it was played', () => {
    const rows = history([
      result({ id: 'a', date: '2027-03-01', added: '2027-03-02' }),
      result({ id: 'b', date: '2027-01-01', added: '2027-05-09' }),
    ])
    expect(rows.map((row) => row.result.id)).toEqual(['b', 'a'])
  })

  it('sends a row with no entry date to the bottom rather than the top', () => {
    const rows = history([
      result({ id: 'old' }),
      result({ id: 'new', added: '2027-02-02' }),
    ])
    expect(rows.map((row) => row.result.id)).toEqual(['new', 'old'])
  })

  it('falls back to the night played when two went in together', () => {
    const rows = history([
      result({ id: 'a', date: '2027-01-01', added: '2027-05-01' }),
      result({ id: 'b', date: '2027-04-01', added: '2027-05-01' }),
    ])
    expect(rows.map((row) => row.result.id)).toEqual(['b', 'a'])
  })

  it('keeps a result the band throws out, and marks it', () => {
    const rows = history([result({ buyIn: 215 }), result({ buyIn: 22 })])
    expect(rows.map((row) => row.counts)).toContain(false)
    expect(rows.map((row) => row.counts)).toContain(true)
    expect(rows).toHaveLength(2)
  })

  it('carries the score each row produced', () => {
    const [row] = history([result({ entrants: 1000, place: 10, buyIn: 5 })])
    expect(row.score).toBeCloseTo(1000, 6)
  })
})

describe('prize money per player', () => {
  it('adds up what each of them cashed', () => {
    const paid = cashByPlayer([
      result({ player: 'Ana', cashed: 120 }),
      result({ player: 'Ana', cashed: 40 }),
      result({ player: 'Bogdan', cashed: 500 }),
    ])
    expect(paid.get('Ana')).toBe(160)
    expect(paid.get('Bogdan')).toBe(500)
  })

  it('counts a result that scored nothing, because the money is still money', () => {
    // Out of the band, so no points — but they did win it.
    const paid = cashByPlayer([result({ player: 'Ana', buyIn: 215, cashed: 900 })])
    expect(paid.get('Ana')).toBe(900)
  })

  it('leaves bounties out and the buy-in on', () => {
    const paid = cashByPlayer([result({ player: 'Ana', buyIn: 54, cashed: 200, bounties: 300 })])
    expect(paid.get('Ana')).toBe(200)
  })

  it('gives a player who never cashed a nought rather than nothing', () => {
    const paid = cashByPlayer([result({ player: 'Ana', cashed: 0 })])
    expect(paid.get('Ana')).toBe(0)
  })

  it('ignores a negative, which is not a cash', () => {
    expect(cashByPlayer([result({ player: 'Ana', cashed: -50 })]).get('Ana')).toBe(0)
  })
})
