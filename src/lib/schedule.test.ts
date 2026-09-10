import { describe, expect, it } from 'vitest'
import {
  committed,
  dueAlarms,
  formatCountdown,
  lateRegCloseTime,
  parseScheduleText,
  parseStored,
  sortByUrgency,
  viewTournament,
  type Tournament,
} from './schedule'

const MINUTE = 60_000
const NOW = new Date('2026-09-10T20:00:00Z').getTime()

const make = (over: Partial<Tournament> = {}): Tournament => ({
  id: 't1',
  name: 'Bounty Hunter',
  site: 'Example',
  startsAt: new Date('2026-09-10T20:30:00Z').toISOString(),
  buyIn: 22,
  lateRegMinutes: 90,
  registered: true,
  alarmMinutes: 10,
  ...over,
})

describe('where a tournament is in its life', () => {
  it('counts down to the start before it begins', () => {
    const view = viewTournament(make(), NOW)
    expect(view.status).toBe('scheduled')
    expect(view.msToStart).toBe(30 * MINUTE)
    expect(view.msToLateRegClose).toBe(120 * MINUTE)
  })

  it('switches to late registration once the clock starts', () => {
    const view = viewTournament(make(), NOW + 45 * MINUTE)
    expect(view.status).toBe('lateReg')
    expect(view.msToStart).toBeLessThan(0)
    expect(view.msToLateRegClose).toBe(75 * MINUTE)
  })

  it('closes exactly when late registration runs out', () => {
    const closeAt = lateRegCloseTime(make())
    expect(viewTournament(make(), closeAt - 1).status).toBe('lateReg')
    expect(viewTournament(make(), closeAt).status).toBe('closed')
    expect(viewTournament(make(), closeAt + MINUTE).status).toBe('closed')
  })
})

describe('the late-reg alarm', () => {
  it('stays quiet until the window opens, then goes off', () => {
    const closeAt = lateRegCloseTime(make())
    // Alarm is set for 10 minutes out.
    expect(viewTournament(make(), closeAt - 11 * MINUTE).alarmDue).toBe(false)
    expect(viewTournament(make(), closeAt - 9 * MINUTE).alarmDue).toBe(true)
    expect(viewTournament(make(), closeAt - 1).alarmDue).toBe(true)
  })

  it('goes quiet again once registration has closed', () => {
    const closeAt = lateRegCloseTime(make())
    expect(viewTournament(make(), closeAt).alarmDue).toBe(false)
  })

  it('says nothing about tournaments you did not register for', () => {
    const closeAt = lateRegCloseTime(make())
    const watching = make({ registered: false })
    expect(viewTournament(watching, closeAt - 5 * MINUTE).alarmDue).toBe(false)
  })

  it('says nothing when the alarm is switched off', () => {
    const closeAt = lateRegCloseTime(make())
    const silent = make({ alarmMinutes: null })
    expect(viewTournament(silent, closeAt - 5 * MINUTE).alarmDue).toBe(false)
  })

  it('fires once rather than on every tick', () => {
    const closeAt = lateRegCloseTime(make())
    const views = [viewTournament(make(), closeAt - 5 * MINUTE)]
    expect(dueAlarms(views, new Set()).map((v) => v.id)).toEqual(['t1'])
    // Same moment, already announced.
    expect(dueAlarms(views, new Set(['t1']))).toEqual([])
  })

  it('respects a longer lead time', () => {
    const early = make({ alarmMinutes: 30 })
    const closeAt = lateRegCloseTime(early)
    expect(viewTournament(early, closeAt - 25 * MINUTE).alarmDue).toBe(true)
    expect(viewTournament(make(), closeAt - 25 * MINUTE).alarmDue).toBe(false)
  })
})

describe('ordering and totals', () => {
  const views = [
    viewTournament(make({ id: 'late', startsAt: new Date(NOW + 4 * 3600_000).toISOString() }), NOW),
    viewTournament(make({ id: 'soon', startsAt: new Date(NOW + 5 * MINUTE).toISOString() }), NOW),
    viewTournament(
      make({ id: 'done', startsAt: new Date(NOW - 5 * 3600_000).toISOString() }),
      NOW,
    ),
  ]

  it('puts the nearest deadline first and the finished ones last', () => {
    expect(sortByUrgency(views).map((v) => v.id)).toEqual(['soon', 'late', 'done'])
  })

  it('adds up only what is registered and still open', () => {
    // Two of the three are still live at 22 each; the closed one does not count.
    expect(committed(views)).toBe(44)
    const watching = views.map((v) => ({ ...v, registered: false }))
    expect(committed(watching)).toBe(0)
  })
})

describe('reading a pasted lobby', () => {
  const today = new Date('2026-09-10T00:00:00')

  it('picks out time, buy-in, late reg and name from a loose line', () => {
    const { tournaments, errors } = parseScheduleText('20:15  $22  Bounty Hunter  90m', today)
    expect(errors).toEqual([])
    expect(tournaments).toHaveLength(1)
    const [t] = tournaments
    expect(t.buyIn).toBe(22)
    expect(t.lateRegMinutes).toBe(90)
    expect(t.name).toBe('Bounty Hunter')
    expect(new Date(t.startsAt).getHours()).toBe(20)
    expect(new Date(t.startsAt).getMinutes()).toBe(15)
  })

  it('copes with separators and a written late-reg', () => {
    const { tournaments } = parseScheduleText('21:00 | $5.50 | Micro Millions | late 120', today)
    expect(tournaments[0].buyIn).toBe(5.5)
    expect(tournaments[0].lateRegMinutes).toBe(120)
    expect(tournaments[0].name).toBe('Micro Millions')
  })

  it('falls back to an hour of late reg when the line does not say', () => {
    const { tournaments } = parseScheduleText('19:30 $11 Nightly', today)
    expect(tournaments[0].lateRegMinutes).toBe(60)
  })

  it('needs a currency symbol before it calls a number a buy-in', () => {
    // "109" here is part of the name, not the price.
    const { tournaments } = parseScheduleText('19:30 Event 109 Special', today)
    expect(tournaments[0].buyIn).toBe(0)
  })

  it('reports lines it cannot read instead of inventing a tournament', () => {
    const { tournaments, errors } = parseScheduleText('Tournament schedule\n20:15 $22 Real', today)
    expect(tournaments).toHaveLength(1)
    expect(errors[0]).toContain('No start time')
  })

  it('rejects an impossible time', () => {
    expect(parseScheduleText('99:99 $5 Nope', today).errors[0]).toContain('not a time')
  })

  it('says so when there is nothing at all', () => {
    expect(parseScheduleText('   ', today).errors[0]).toContain('Nothing to read')
  })
})

describe('stored schedules', () => {
  it('round-trips a tournament', () => {
    const [restored] = parseStored([make()])
    expect(restored).toMatchObject({ id: 't1', buyIn: 22, lateRegMinutes: 90, registered: true })
  })

  it('drops anything without a usable id or date', () => {
    expect(parseStored([{ id: 'x' }, { startsAt: 'nope' }, null, 'string'])).toEqual([])
    expect(parseStored([{ id: 'x', startsAt: 'not-a-date' }])).toEqual([])
  })

  it('repairs bad numbers rather than trusting them', () => {
    const [t] = parseStored([{ ...make(), buyIn: -5, lateRegMinutes: 'abc', alarmMinutes: 'x' }])
    expect(t.buyIn).toBe(0)
    expect(t.lateRegMinutes).toBe(60)
    expect(t.alarmMinutes).toBeNull()
  })

  it('treats anything but true as not registered', () => {
    expect(parseStored([{ ...make(), registered: 'yes' }])[0].registered).toBe(false)
  })
})

describe('formatCountdown', () => {
  it('reads the way a player would say it', () => {
    expect(formatCountdown(2 * 3600_000 + 14 * MINUTE)).toBe('2h 14m')
    expect(formatCountdown(9 * MINUTE)).toBe('9m')
    expect(formatCountdown(30 * 3600_000)).toBe('1d 6h')
    expect(formatCountdown(45_000)).toBe('45s')
  })

  it('shows a dash once the moment has passed', () => {
    expect(formatCountdown(0)).toBe('—')
    expect(formatCountdown(-5000)).toBe('—')
  })
})
