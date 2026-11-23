import { describe, expect, it } from 'vitest'
import { FORMATS, monthlyQualifiers, type ChallengeResult } from './leaderboard'
import { everLed, racePath, runners } from './racePath'

let seq = 0
const played = (player: string, date: string, place: number): ChallengeResult => ({
  id: `r${(seq += 1)}`,
  player,
  date,
  event: 'Nightly',
  site: 'GGPoker',
  entrants: 1000,
  place,
  buyIn: 5,
  bounties: 0,
  cashed: 0,
})

describe('the table on every night of the period', () => {
  it('has a step per date anybody played, oldest first', () => {
    const steps = racePath(
      [played('Ana', '2026-12-03', 10), played('Ana', '2026-12-01', 50)],
      FORMATS.monthly,
    )
    expect(steps.map((step) => step.date)).toEqual(['2026-12-01', '2026-12-03'])
  })

  it('has nothing to draw before anybody plays', () => {
    expect(racePath([], FORMATS.monthly, ['Ana'])).toEqual([])
  })

  it('carries a player forward on a night they did not play', () => {
    const steps = racePath(
      [played('Ana', '2026-12-01', 10), played('Bogdan', '2026-12-05', 900)],
      FORMATS.monthly,
    )
    expect(steps[1].points.get('Ana')).toBe(steps[0].points.get('Ana'))
  })

  it('counts only what had happened by that date', () => {
    const steps = racePath(
      [played('Ana', '2026-12-01', 500), played('Ana', '2026-12-09', 1)],
      FORMATS.monthly,
    )
    expect(steps[1].points.get('Ana')).toBeGreaterThan(steps[0].points.get('Ana') ?? 0)
  })

  it('puts everybody on the roster in every step, at nought until they play', () => {
    const steps = racePath([played('Ana', '2026-12-01', 10)], FORMATS.monthly, ['Ana', 'Bogdan'])
    expect(steps[0].points.get('Bogdan')).toBe(0)
  })

  it('stops growing once the quota is full, as the table does', () => {
    // A best-of means points can stand still through a run of weak results,
    // which a running total would never show.
    const format = { ...FORMATS.monthly, best: 1 }
    const steps = racePath(
      [played('Ana', '2026-12-01', 1), played('Ana', '2026-12-02', 900)],
      format,
    )
    expect(steps[1].points.get('Ana')).toBe(steps[0].points.get('Ana'))
  })

  it('applies the qualifier up to each date, not to the period in hindsight', () => {
    const log = [
      played('Ana', '2026-12-01', 10),
      played('Ana', '2026-12-02', 20),
      played('Ana', '2027-01-04', 30),
    ]
    const steps = racePath(log, FORMATS.yearly, [], (rows) => monthlyQualifiers(rows, 1))
    // One score per month survives the qualifier, so the second night adds
    // nothing and the third, in a new month, does.
    expect(steps[1].points.get('Ana')).toBe(steps[0].points.get('Ana'))
    expect(steps[2].points.get('Ana')).toBeGreaterThan(steps[1].points.get('Ana') ?? 0)
  })
})

describe('who was ahead', () => {
  it('names whoever has held the lead, in the order they took it', () => {
    const steps = racePath(
      [
        played('Ana', '2026-12-01', 10),
        played('Bogdan', '2026-12-05', 1),
        played('Ana', '2026-12-09', 1),
      ],
      FORMATS.monthly,
    )
    expect(everLed(steps)).toEqual(['Ana', 'Bogdan'])
  })

  it('leaves out somebody who was never top, however close', () => {
    const steps = racePath(
      [played('Ana', '2026-12-01', 1), played('Bogdan', '2026-12-01', 2)],
      FORMATS.monthly,
    )
    expect(everLed(steps)).toEqual(['Ana'])
  })

  it('has no leader before anybody scores', () => {
    expect(everLed([])).toEqual([])
    expect(everLed(racePath([], FORMATS.monthly, ['Ana']))).toEqual([])
  })

  it('lists the runners who have scored, weakest first so leaders draw on top', () => {
    const steps = racePath(
      [played('Ana', '2026-12-01', 1), played('Bogdan', '2026-12-01', 500)],
      FORMATS.monthly,
      ['Ana', 'Bogdan', 'Cristi'],
    )
    // Cristi has not played, so there is no line to draw for him.
    expect(runners(steps)).toEqual(['Bogdan', 'Ana'])
  })
})
