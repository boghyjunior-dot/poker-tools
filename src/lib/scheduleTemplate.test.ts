import { describe, expect, it } from 'vitest'
import {
  buildFromTemplate,
  defaultSchedule,
  lateRegGuess,
  nextWeekday,
  SCHEDULE_TEMPLATES,
  type ScheduleTemplate,
} from './scheduleTemplate'

const friday = SCHEDULE_TEMPLATES.find((item) => item.id === 'gg-friday') as ScheduleTemplate

describe('lateRegGuess', () => {
  it('reads the speed off the name', () => {
    expect(lateRegGuess('Daily Hyper $20')).toBe(30)
    expect(lateRegGuess('Daily Turbo $3')).toBe(60)
    expect(lateRegGuess('Daily Classic $15')).toBe(120)
  })

  it('treats a 10BB Speed Racer as the fastest thing on the card', () => {
    expect(lateRegGuess('Speed Racer Bounty $21.60 [10 BB]')).toBe(25)
  })

  it('prefers the speed over the name it is attached to', () => {
    // "Bounty Hunters" alone is a two-hour event; the turbo version is not.
    expect(lateRegGuess('Bounty Hunters $21.60')).toBe(120)
    expect(lateRegGuess('Bounty Hunters Deepstack Turbo $21.60')).toBe(60)
    expect(lateRegGuess('Bounty Hunters Hyper Special $2.50')).toBe(30)
  })
})

describe('nextWeekday', () => {
  it('returns today when today is already the day', () => {
    const aFriday = new Date(2026, 9, 2, 14, 30)
    const next = nextWeekday(5, aFriday)
    expect(next.getDay()).toBe(5)
    expect(next.getDate()).toBe(2)
    expect(next.getHours()).toBe(0)
  })

  it('looks forward, never back', () => {
    // Saturday 3 October: the next Friday is the 9th, not yesterday.
    const next = nextWeekday(5, new Date(2026, 9, 3, 9, 0))
    expect(next.getDate()).toBe(9)
    expect(next.getDay()).toBe(5)
  })
})

describe('buildFromTemplate', () => {
  const day = new Date(2026, 9, 2)
  const built = buildFromTemplate(friday, day)

  it('stamps every event onto the day', () => {
    expect(built).toHaveLength(friday.events.length)
    expect(new Set(built.map((item) => item.id)).size).toBe(built.length)
    expect(built.every((item) => item.site === 'GGPoker')).toBe(true)
  })

  it('does not register you for anything', () => {
    expect(built.some((item) => item.registered)).toBe(false)
  })

  it('keeps the card in running order', () => {
    const times = built.map((item) => new Date(item.startsAt).getTime())
    const sorted = [...times].sort((a, b) => a - b)
    expect(times).toEqual(sorted)
  })

  it('rolls the small hours onto the next day rather than the morning past', () => {
    const closer = built.find((item) => item.name === 'GGMasters Bounty Turbo $25')
    expect(closer).toBeDefined()
    const start = new Date(closer!.startsAt)
    expect(start.getDate()).toBe(3)
    expect(start.getHours()).toBe(0)
    expect(start.getMinutes()).toBe(0)
  })

  it('puts the first event where the lobby had it', () => {
    const start = new Date(built[0].startsAt)
    expect(start.getDate()).toBe(2)
    expect(start.getHours()).toBe(17)
    expect(start.getMinutes()).toBe(0)
  })

  it('carries guarantees across', () => {
    const warmUp = built.find((item) => item.name === 'GGMasters Bounty Warm-Up $25')
    expect(warmUp?.guarantee).toBe(100_000)
    expect(warmUp?.buyIn).toBe(25)
  })

  it('leaves the yuan events out of the dollar totals', () => {
    const zodiac = built.filter((item) => item.name.startsWith('Zodiac'))
    expect(zodiac).toHaveLength(2)
    expect(zodiac.every((item) => item.buyIn === 0)).toBe(true)
    expect(zodiac.every((item) => (item.notes ?? '').includes('¥'))).toBe(true)
  })

  it('skips an unreadable time instead of dropping it in at midnight', () => {
    const broken: ScheduleTemplate = {
      ...friday,
      events: [
        { time: '19:00', name: 'Real', buyIn: 5 },
        { time: 'half past', name: 'Nonsense', buyIn: 5 },
        { time: '25:00', name: 'Also nonsense', buyIn: 5 },
      ],
    }
    const out = buildFromTemplate(broken, day)
    expect(out.map((item) => item.name)).toEqual(['Real'])
  })
})

describe('defaultSchedule', () => {
  it('puts every template on its next occurrence', () => {
    // A Wednesday: the Friday card belongs two days out, not four days back.
    const built = defaultSchedule(new Date(2026, 8, 30, 12, 0))
    expect(built).toHaveLength(friday.events.length)
    const first = new Date(built[0].startsAt)
    expect(first.getDay()).toBe(5)
    expect(first.getDate()).toBe(2)
  })

  it('never lands in the past when today is the day itself', () => {
    const built = defaultSchedule(new Date(2026, 9, 2, 23, 0))
    expect(new Date(built[0].startsAt).getDate()).toBe(2)
  })
})
