/**
 * Recurring schedules you can drop in with one click.
 *
 * The Schedule tool has no feed behind it, so a weekly card that barely moves —
 * GG's Friday evening, say — is pure retyping every week. A template is that
 * card written down once: times of day and names, stamped onto whichever date
 * you load it for.
 *
 * It is a snapshot, not a live lobby. Buy-ins and guarantees drift, events get
 * added and pulled, and every row stays editable after it lands.
 */

import ggFriday from '../content/ggFriday.json'
import { newTournamentId, type Tournament } from './schedule'

export interface TemplateEvent {
  /** Local start time of day, "HH:MM". */
  time: string
  name: string
  buyIn: number
  guarantee?: number
  notes?: string
}

export interface ScheduleTemplate {
  id: string
  label: string
  site: string
  /** Day of the week it runs on, JavaScript's numbering: 0 is Sunday. */
  weekday: number
  /** When the card was read off the lobby, so you can see how stale it is. */
  capturedOn: string
  events: TemplateEvent[]
}

const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE

/**
 * How long late registration stays open, guessed from the format in the name.
 *
 * The lobby grid these came from does not show the late-reg window at all, and
 * inventing a precise number per event would be dressing a guess up as data.
 * What the name does tell you is the speed, and speed is most of it: a hyper
 * closes in half an hour, a turbo in an hour, everything else runs about two.
 * Wrong for some rows by design — edit the one you actually registered for.
 */
export function lateRegGuess(name: string): number {
  if (/\bspeed racer\b/i.test(name)) return 25
  if (/\bhyper\b/i.test(name)) return 30
  if (/\bturbo\b/i.test(name)) return 60
  return 120
}

/** Midnight on the coming `weekday`, or today if today is already it. */
export function nextWeekday(weekday: number, from: Date = new Date()): Date {
  const date = new Date(from)
  date.setHours(0, 0, 0, 0)
  const ahead = (weekday - date.getDay() + 7) % 7
  return new Date(date.getTime() + ahead * DAY)
}

function minutesOfDay(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

/**
 * Stamp a template onto a date.
 *
 * Events are listed in running order, so a time that goes backwards is the card
 * crossing midnight: GG's Friday finishes on Saturday morning, and those rows
 * belong on the next day rather than twelve hours into the past.
 */
export function buildFromTemplate(template: ScheduleTemplate, day: Date): Tournament[] {
  const midnight = new Date(day)
  midnight.setHours(0, 0, 0, 0)

  const out: Tournament[] = []
  let dayOffset = 0
  let previous = -1

  template.events.forEach((event, index) => {
    const minutes = minutesOfDay(event.time)
    if (minutes === null) return
    if (minutes < previous) dayOffset += 1
    previous = minutes

    // Built off midnight rather than by adding milliseconds, so a card that
    // crosses a daylight-saving change still starts at the time it says.
    const startsAt = new Date(midnight)
    startsAt.setDate(startsAt.getDate() + dayOffset)
    startsAt.setMinutes(minutes)

    out.push({
      id: `${newTournamentId()}-${index}`,
      name: event.name,
      site: template.site,
      startsAt: startsAt.toISOString(),
      buyIn: event.buyIn,
      lateRegMinutes: lateRegGuess(event.name),
      guarantee: event.guarantee,
      // Loading a card is reading the lobby, not registering for 97 events.
      registered: false,
      alarmMinutes: 10,
      notes: event.notes,
    })
  })

  return out
}

export const SCHEDULE_TEMPLATES: ScheduleTemplate[] = [
  {
    id: 'gg-friday',
    label: ggFriday.label,
    site: ggFriday.site,
    weekday: 5,
    capturedOn: ggFriday.capturedOn,
    events: ggFriday.events,
  },
]
