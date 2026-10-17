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

describe('the Saturday card', () => {
  const saturday = SCHEDULE_TEMPLATES.find((item) => item.id === 'gg-saturday')!
  // The 17th of October 2026 is the Saturday it was read off.
  const built = buildFromTemplate(saturday, new Date(2026, 9, 17))

  it('runs on Saturday, from GGPoker', () => {
    expect(saturday.weekday).toBe(6)
    expect(new Date(built[0].startsAt).getDay()).toBe(6)
    expect(built.every((item) => item.site === 'GGPoker')).toBe(true)
  })

  it('is the whole card, in running order', () => {
    expect(built).toHaveLength(saturday.events.length)
    const times = built.map((item) => new Date(item.startsAt).getTime())
    expect(times).toEqual([...times].sort((a, b) => a - b))
  })

  it('starts at eleven and finishes on Sunday morning', () => {
    const first = new Date(built[0].startsAt)
    expect([first.getHours(), first.getMinutes()]).toEqual([11, 0])
    const last = new Date(built[built.length - 1].startsAt)
    expect(last.getDate()).toBe(18)
    expect([last.getHours(), last.getMinutes()]).toEqual([1, 30])
  })

  it('crosses midnight exactly once', () => {
    const days = new Set(built.map((item) => new Date(item.startsAt).getDate()))
    expect([...days].sort((a, b) => a - b)).toEqual([17, 18])
  })

  it('keeps the yuan events out of the dollar totals', () => {
    const yuan = built.filter((item) => (item.notes ?? '').includes('¥'))
    expect(yuan.length).toBeGreaterThan(0)
    expect(yuan.every((item) => item.buyIn === 0)).toBe(true)
  })
})

describe('defaultSchedule', () => {
  const everyEvent = SCHEDULE_TEMPLATES.reduce((sum, item) => sum + item.events.length, 0)

  it('puts every template on its next occurrence', () => {
    // A Wednesday: the weekend cards belong ahead of it, not behind.
    const built = defaultSchedule(new Date(2026, 8, 30, 12, 0))
    expect(built).toHaveLength(everyEvent)
    for (const template of SCHEDULE_TEMPLATES) {
      const first = built.find((item) => item.name === template.events[0].name)!
      expect(first, template.label).toBeDefined()
    }
  })

  it('lands each card on its own day of the week', () => {
    const built = defaultSchedule(new Date(2026, 8, 30, 12, 0))
    // Friday the 2nd and Saturday the 3rd of October, each spilling one day.
    const days = new Set(built.map((item) => new Date(item.startsAt).getDay()))
    expect([...days].sort()).toEqual([0, 5, 6])
  })

  it('never lands in the past when today is the day itself', () => {
    const built = defaultSchedule(new Date(2026, 9, 2, 23, 0))
    expect(new Date(built[0].startsAt).getDate()).toBe(2)
  })
})
