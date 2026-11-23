import { describe, expect, it } from 'vitest'
import { FORMATS, standings, type ChallengeResult } from './leaderboard'
import { csvField, csvName, csvRows, lastLongerCsv, standingsCsv } from './leaderboardCsv'
import { lastLongerStandings } from './leaderboard'

let seq = 0
const played = (player: string, place: number, over: Partial<ChallengeResult> = {}): ChallengeResult => ({
  id: `r${(seq += 1)}`,
  player,
  date: '2026-12-04',
  event: 'Daily Main',
  site: 'GGPoker',
  entrants: 1000,
  place,
  buyIn: 54,
  bounties: 0,
  cashed: 0,
  ...over,
})

describe('a CSV field', () => {
  it('leaves an ordinary value alone', () => {
    expect(csvField('Ferdi')).toBe('Ferdi')
    expect(csvField(1234)).toBe('1234')
  })

  it('quotes a comma, which would otherwise be a new column', () => {
    expect(csvField('Doe, John')).toBe('"Doe, John"')
  })

  it('doubles a quote and wraps the lot', () => {
    expect(csvField('He said "hi"')).toBe('"He said ""hi"""')
  })

  it('quotes a newline, which would otherwise be a new row', () => {
    // A player can put anything in a name, and a file that breaks on one of
    // these only turns out to be wrong after it is in a spreadsheet.
    expect(csvField('two\nlines')).toBe('"two\nlines"')
    expect(csvField('carriage\rreturn')).toBe('"carriage\rreturn"')
  })

  it('joins rows with CRLF, which is what spreadsheets expect', () => {
    expect(csvRows([['a', 'b'], ['c', 'd']])).toBe('a,b\r\nc,d')
  })
})

describe('the standings as a file', () => {
  const table = standings(
    [played('Ferdi', 3), played('Snapper', 400), played('Snapper', 20)],
    FORMATS.monthly,
    ['Ferdi', 'Snapper', 'Simion'],
  )
  const csv = standingsCsv(
    table,
    FORMATS.monthly,
    (player) => (player === 'Ferdi' ? 1450 : 0),
    (player) => (player === 'Ferdi' ? 100 : undefined),
  )
  const lines = csv.split('\r\n')

  it('starts with a header naming every column the table shows', () => {
    expect(lines[0]).toBe('Rank,Player,Points,Counting,Of,Played,Best,Cutoff,Prize,Payout')
  })

  it('has a row per player, including those who have not played', () => {
    expect(lines).toHaveLength(table.length + 1)
    expect(csv).toContain('Simion')
  })

  it('writes the figures the page was showing, not its own', () => {
    const ferdi = lines.find((line) => line.startsWith('1,Ferdi'))
    expect(ferdi).toContain(',1450,')
    expect(ferdi?.endsWith(',100')).toBe(true)
  })

  it('leaves a cutoff and a payout blank rather than writing a nought', () => {
    // Nobody has filled a quota of ten, so no cutoff exists to write down.
    const simion = lines.find((line) => line.includes('Simion'))
    expect(simion?.endsWith(',0,')).toBe(true)
  })

  it('says how many scores count, so a column of 3 is readable later', () => {
    expect(lines[1].split(',')[4]).toBe(String(FORMATS.monthly.best))
  })
})

describe('the last longer as a file', () => {
  const nights = [
    played('Ferdi', 10, { date: '2026-12-01', event: 'Daily Main', cashed: 500 }),
    played('Snapper', 90, { date: '2026-12-01', event: 'Daily Main' }),
  ]
  const csv = lastLongerCsv(lastLongerStandings(nights))

  it('has its own columns, which are not the points ones', () => {
    expect(csv.split('\r\n')[0]).toBe('Rank,Player,Won,Played,Win rate %,Deepest,Cashed')
  })

  it('writes the money the winner took', () => {
    expect(csv).toContain('500')
  })
})

describe('the filename', () => {
  it('says what it is and which period it covers', () => {
    expect(csvName('standings', '2026-12')).toBe('mtt-challenge-standings-2026-12.csv')
  })
})
