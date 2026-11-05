/**
 * A log that never happened, for looking at the tools with something in them.
 *
 * Every page here reads better with a year behind it, and an empty database
 * shows you an empty page — which is a fair description of nothing. This
 * builds a plausible one: the rooms in roughly the proportions somebody plays
 * them, buy-ins on a real ladder rather than a uniform spread, cashes that are
 * mostly min-cashes with a long tail behind them, and places recorded only
 * sometimes, because that is how anybody fills that field in.
 *
 * Two rules it keeps, because demo data that cannot be told apart from real
 * data is a way to lose real data:
 *
 * Every id starts with DEMO_PREFIX, so removing it later is an exact
 * operation on rows this module wrote and not a guess at which results look
 * invented.
 *
 * It is seeded. The same seed gives the same log, which means a test can
 * assert on it and a bug report can be reproduced — and a different seed each
 * time you press the button, which is what makes it worth pressing twice.
 */

import { SITES } from './sites'
import type { SiteBankroll } from './siteBankrolls'
import { entryProfit, type Entry } from './tracker'

/** Marks a row as invented. Nothing else in the app writes this. */
export const DEMO_PREFIX = 'demo-'

export function isDemo(entry: { id: string }): boolean {
  return entry.id.startsWith(DEMO_PREFIX)
}

/** mulberry32: small, fast, and good enough for pretend tournaments. */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Weighted<T> {
  value: T
  weight: number
}

function pick<T>(random: () => number, options: readonly Weighted<T>[]): T {
  const total = options.reduce((sum, option) => sum + option.weight, 0)
  let roll = random() * total
  for (const option of options) {
    roll -= option.weight
    if (roll <= 0) return option.value
  }
  return options[options.length - 1].value
}

/** Rooms in the proportions of somebody with a main room and four others. */
const ROOM_WEIGHTS: Weighted<string>[] = [
  { value: SITES[0], weight: 50 },
  { value: SITES[1], weight: 13 },
  { value: SITES[2], weight: 9 },
  { value: SITES[3], weight: 20 },
  { value: SITES[4], weight: 8 },
]

/** A real buy-in ladder: lots of small ones, a few that matter. */
const BUY_INS: Weighted<number>[] = [
  { value: 1.5, weight: 10 },
  { value: 3.0, weight: 14 },
  { value: 5.5, weight: 16 },
  { value: 11, weight: 18 },
  { value: 22, weight: 16 },
  { value: 33, weight: 10 },
  { value: 55, weight: 8 },
  { value: 109, weight: 5 },
  { value: 215, weight: 2 },
]

const NAMES: Record<string, string[]> = {
  GGPoker: ['Bounty Hunters', 'Global MILLION$', 'Daily Guarantee', 'Omaholic Bounty', 'Zodiac'],
  iPoker: ['Nightly Deepstack', 'Turbo Knockout', 'Sunday Major', 'Twister Max'],
  'Coin Poker': ['Daily Crypto KO', 'Weekend Special', 'Midnight Turbo'],
  PokerStars: ['Bounty Builder', 'The Hot', 'Sunday Storm', 'Big Antes', 'Mini Main'],
  '888 Poker': ['Mega Deep', 'Whale Bounty', 'Crocodile'],
}

function dayBefore(today: string, back: number): string {
  const date = new Date(`${today}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() - back)
  return date.toISOString().slice(0, 10)
}

const round = (value: number) => Math.round(value * 100) / 100

/**
 * What a cash pays, when one comes.
 *
 * Tiered rather than a smooth curve because tournament payouts are not smooth:
 * most of them are the min-cash you grind out, and the whole of the profit
 * lives in the few at the end of the tail. A uniform multiple would make the
 * ROI look stable in a way that would be a lie about the game.
 */
function payoutMultiple(random: () => number): number {
  const roll = random()
  if (roll < 0.55) return 1.3 + random() * 1.2
  if (roll < 0.85) return 2.5 + random() * 3.5
  if (roll < 0.96) return 6 + random() * 14
  return 20 + random() * 130
}

export interface DemoLog {
  entries: Entry[]
  bankrolls: SiteBankroll[]
}

/**
 * Build a log of invented tournaments ending on `today`.
 *
 * The starting bankrolls are deliberately not the roll the log implies: they
 * are what was on each account before any of it, which is the only thing that
 * box has ever meant.
 */
export function buildDemoLog(options: {
  seed: number
  today: string
  count?: number
  /** How far back the oldest result sits. */
  days?: number
}): DemoLog {
  const { seed, today, count = 140, days = 180 } = options
  const random = rng(seed)
  const entries: Entry[] = []

  for (let index = 0; index < count; index += 1) {
    const site = pick(random, ROOM_WEIGHTS)
    const buyIn = pick(random, BUY_INS)
    const names = NAMES[site] ?? ['Nightly']
    const name = names[Math.floor(random() * names.length)]

    // Weekends carry more of a schedule than Tuesdays do.
    let back = Math.floor(random() * days)
    const weekday = new Date(`${dayBefore(today, back)}T12:00:00Z`).getUTCDay()
    if (weekday > 0 && weekday < 5 && random() < 0.35) back = Math.max(0, back - weekday)

    const bounty = random() < 0.62
    const knockouts = bounty ? Math.max(0, Math.floor(random() * random() * 7)) : 0
    const bounties = round(knockouts * buyIn * (0.1 + random() * 0.4))

    const itm = random() < 0.13
    const multiple = itm ? payoutMultiple(random) : 0
    const cashed = itm ? round(buyIn * multiple) : 0

    // A place gets written down when the run was worth remembering, which is
    // exactly the bias the Stats page warns about.
    let position: number | undefined
    if (itm) {
      position =
        multiple > 20
          ? 1 + Math.floor(random() * 3)
          : multiple > 6
            ? 4 + Math.floor(random() * 12)
            : 16 + Math.floor(random() * 90)
    } else if (random() < 0.18) {
      position = 110 + Math.floor(random() * 900)
    }

    entries.push({
      id: `${DEMO_PREFIX}${seed.toString(36)}-${index.toString(36)}`,
      date: dayBefore(today, back),
      name,
      site,
      buyIn,
      fee: 0,
      cashed,
      bounties,
      position,
    })
  }

  entries.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))

  return { entries, bankrolls: fundRooms(entries, random) }
}

/**
 * Put enough on each account to have played what the log says was played.
 *
 * Not decoration. An account that dips below zero is the Tracker's signal that
 * money arrived from somewhere it was never told about, and a demo that trips
 * that warning on every room the moment you load it teaches you to ignore the
 * one case where it means something. So each room is funded past its own worst
 * stretch, with room to spare — which is also how anybody actually funds one.
 */
function fundRooms(entries: readonly Entry[], random: () => number): SiteBankroll[] {
  const worst = new Map<string, number>()
  const running = new Map<string, number>()

  for (const entry of entries) {
    const balance = (running.get(entry.site) ?? 0) + entryProfit(entry)
    running.set(entry.site, balance)
    worst.set(entry.site, Math.min(worst.get(entry.site) ?? 0, balance))
  }

  // Round numbers, because people deposit round numbers.
  const roundUp = (value: number) => Math.ceil(value / 25) * 25

  return SITES.map((site) => ({
    id: site,
    amount: roundUp(
      Math.max(50, -(worst.get(site) ?? 0) * (1.4 + random() * 0.6) + random() * 100),
    ),
  }))
}
