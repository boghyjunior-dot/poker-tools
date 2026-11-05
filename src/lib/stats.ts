/**
 * The questions a running total cannot answer.
 *
 * The Tracker already says what the log comes to: profit, ROI, ITM, the worst
 * stretch. Those are one number each for everything you have ever played,
 * which is the least interesting way to read a results log. "Am I beating
 * this stake" and "is the GG schedule worth the hours" are different
 * questions, and a single ROI hides both of them.
 *
 * So this is the same arithmetic cut several ways. Every cut carries its own
 * count, because a 40% ROI over eleven tournaments is a sentence about
 * nothing, and the page has to be able to say so.
 */

import { siteKey } from './sites'
import { entryCost, entryProfit, type Entry } from './tracker'

export interface Breakdown {
  /** What this row is: a room, a stake band, a month. */
  key: string
  count: number
  staked: number
  returned: number
  profit: number
  /** Return on total cost, the definition the rest of the tools use. */
  roiPct: number
  itmCount: number
  itmPct: number
  /** Bounties alone, which a PKO schedule makes most of. */
  bounties: number
}

function summarise(key: string, entries: readonly Entry[]): Breakdown {
  let staked = 0
  let returned = 0
  let itmCount = 0
  let bounties = 0
  for (const entry of entries) {
    staked += entryCost(entry)
    returned += Math.max(0, entry.cashed) + Math.max(0, entry.bounties)
    bounties += Math.max(0, entry.bounties)
    if (entry.cashed > 0) itmCount += 1
  }
  const profit = returned - staked
  return {
    key,
    count: entries.length,
    staked,
    returned,
    profit,
    roiPct: staked > 0 ? (profit / staked) * 100 : 0,
    itmCount,
    itmPct: entries.length > 0 ? (itmCount / entries.length) * 100 : 0,
    bounties,
  }
}

/**
 * Group, summarise, and put the biggest sample first.
 *
 * Volume order rather than profit order on purpose: the rows you have played
 * most are the ones whose numbers mean anything, and sorting by ROI puts a
 * single lucky $2 turbo at the top of the page for a year.
 */
export function groupBy(entries: readonly Entry[], keyOf: (entry: Entry) => string): Breakdown[] {
  const groups = new Map<string, Entry[]>()
  for (const entry of entries) {
    const key = keyOf(entry)
    const bucket = groups.get(key)
    if (bucket) bucket.push(entry)
    else groups.set(key, [entry])
  }
  return [...groups.entries()]
    .map(([key, group]) => summarise(key, group))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
}

export { UNKNOWN_SITE } from './sites'

export function bySite(entries: readonly Entry[]): Breakdown[] {
  return groupBy(entries, (entry) => siteKey(entry.site))
}

/**
 * Stake bands, in the shape an MTT schedule actually comes in.
 *
 * Fixed rather than derived from your own log: bands that move as you play
 * cannot be compared with last month's, which is the only thing anyone wants
 * them for. The edges are where the fields change character, not round
 * numbers for their own sake.
 */
export const BUY_IN_BANDS = [
  { label: 'Under $5', max: 5 },
  { label: '$5 to $25', max: 25 },
  { label: '$25 to $60', max: 60 },
  { label: '$60 to $200', max: 200 },
  { label: '$200 and up', max: Number.POSITIVE_INFINITY },
] as const

export function bandFor(cost: number): string {
  for (const band of BUY_IN_BANDS) {
    if (cost < band.max) return band.label
  }
  return BUY_IN_BANDS[BUY_IN_BANDS.length - 1].label
}

/** Stake bands, tightest first, so the list reads like a ladder. */
export function byBuyIn(entries: readonly Entry[]): Breakdown[] {
  const order = new Map<string, number>(BUY_IN_BANDS.map((band, index) => [band.label, index]))
  return groupBy(entries, (entry) => bandFor(entryCost(entry))).sort(
    (a, b) => (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0),
  )
}

/** Months, newest first — recent form is what anyone opens this for. */
export function byMonth(entries: readonly Entry[]): Breakdown[] {
  return groupBy(entries, (entry) => entry.date.slice(0, 7)).sort((a, b) =>
    b.key.localeCompare(a.key),
  )
}

export interface FinishStats {
  /** How many results carry a finishing place at all. */
  recorded: number
  /** Best place reached, of those recorded. */
  best: number | null
  /** Finishes at a final table, taken as ninth or better. */
  finalTables: number
  /** Median place, which a single deep run cannot drag about. */
  medianPlace: number | null
}

/**
 * What the places say, over the results that have one.
 *
 * Median rather than mean: one 3rd out of four thousand moves an average
 * enough to make it a sentence about that night rather than about the year.
 * Everything here is counted over the recorded places only, and the page
 * shows how many that was, because a place field people fill in when they go
 * deep is a biased sample and should be read as one.
 */
export function finishStats(entries: readonly Entry[]): FinishStats {
  const places = entries
    .map((entry) => entry.position)
    .filter((place): place is number => typeof place === 'number' && place > 0)
    .sort((a, b) => a - b)

  if (places.length === 0) {
    return { recorded: 0, best: null, finalTables: 0, medianPlace: null }
  }
  const middle = Math.floor(places.length / 2)
  return {
    recorded: places.length,
    best: places[0],
    finalTables: places.filter((place) => place <= 9).length,
    medianPlace:
      places.length % 2 === 1 ? places[middle] : (places[middle - 1] + places[middle]) / 2,
  }
}

export interface MoneySplit {
  cashed: number
  bounties: number
  /** Bounties as a share of everything that came back. */
  bountyPct: number
}

/**
 * Where the money came back from.
 *
 * On a bounty schedule this is the number that decides how you should be
 * playing: a roll built mostly out of heads is telling you the knockouts are
 * paying for the tournament, and that calling wider is earning its keep.
 */
export function moneySplit(entries: readonly Entry[]): MoneySplit {
  let cashed = 0
  let bounties = 0
  for (const entry of entries) {
    cashed += Math.max(0, entry.cashed)
    bounties += Math.max(0, entry.bounties)
  }
  const returned = cashed + bounties
  return { cashed, bounties, bountyPct: returned > 0 ? (bounties / returned) * 100 : 0 }
}

export interface Streaks {
  /** Longest run of tournaments without a cash. */
  withoutCash: number
  /** Longest run of losing results, a min-cash breaking it. */
  losing: number
  /** Tournaments since the last cash, as of the most recent result. */
  sinceCash: number
}

/**
 * The runs, in date order.
 *
 * Worth a line of their own because the worst drawdown is money and these are
 * patience — and it is the second one people misremember. Knowing that
 * thirty-one blanks in a row has happened before is the difference between a
 * normal stretch and evidence that something is broken.
 */
export function streaks(entries: readonly Entry[]): Streaks {
  const ordered = [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))

  let withoutCash = 0
  let losing = 0
  let runWithoutCash = 0
  let runLosing = 0
  let sinceCash = 0

  for (const entry of ordered) {
    if (entry.cashed > 0) {
      runWithoutCash = 0
      sinceCash = 0
    } else {
      runWithoutCash += 1
      sinceCash += 1
      withoutCash = Math.max(withoutCash, runWithoutCash)
    }

    if (entryProfit(entry) < 0) {
      runLosing += 1
      losing = Math.max(losing, runLosing)
    } else {
      runLosing = 0
    }
  }

  return { withoutCash, losing, sinceCash }
}

/**
 * The rooms, stakes and months with enough behind them to read.
 *
 * Not a threshold for hiding rows — every row is shown — but for deciding
 * which ones get their ROI stated as if it meant something.
 */
export const READABLE_SAMPLE = 100

export function isReadable(breakdown: Breakdown): boolean {
  return breakdown.count >= READABLE_SAMPLE
}

/**
 * The day a date falls on, counted from the epoch.
 *
 * Parsed at noon UTC so no timezone can shift a result onto the day before:
 * the dates in this log are days rather than moments, and reading them as
 * local midnight moves a good share of the year by one.
 */
export function utcDay(date: string): number | null {
  const ms = Date.parse(date + 'T12:00:00Z')
  return Number.isFinite(ms) ? Math.floor(ms / 86_400_000) : null
}

/** Weekday with Monday at 0, or null for a date that does not parse. */
export function weekdayIndex(date: string): number | null {
  const ms = Date.parse(date + 'T12:00:00Z')
  if (!Number.isFinite(ms)) return null
  return (new Date(ms).getUTCDay() + 6) % 7
}

export interface Concentration {
  /** Everything the winning results made, before the losses come off it. */
  won: number
  /** Everything the losing results cost, as a positive number. */
  lost: number
  winners: number
  /** The best single result, by profit. */
  best: number
  /** What the whole log comes to with that one result taken out. */
  withoutBest: number
  /** How many results the best 5% is, at least one. */
  topCount: number
  /** The share of all winnings those few results account for. */
  topSharePct: number
  /**
   * How many of your best results it takes to pay for every losing one.
   *
   * Null when they never do, which is simply a losing log — the question only
   * has an answer if there is a profit to explain.
   */
  payingResults: number | null
}

/**
 * How much of the profit came out of how few tournaments.
 *
 * The number that explains tournament bankroll requirements better than any
 * variance calculator: a winning MTT player's year is a large pile of losses
 * with a handful of results on top, and until you have seen your own split
 * written down it is very hard to believe how lopsided it is. It is also the
 * honest answer to "am I running good" — if one result is carrying the log,
 * the ROI underneath it is a sentence about that one night.
 */
export function concentration(entries: readonly Entry[]): Concentration {
  const profits = entries.map(entryProfit).sort((a, b) => b - a)

  let won = 0
  let lost = 0
  for (const profit of profits) {
    if (profit > 0) won += profit
    else lost -= profit
  }

  const best = profits.length > 0 ? profits[0] : 0
  const winners = profits.filter((profit) => profit > 0).length
  const topCount = profits.length > 0 ? Math.max(1, Math.ceil(profits.length * 0.05)) : 0
  const topWon = profits.slice(0, topCount).reduce((sum, profit) => sum + Math.max(0, profit), 0)

  let running = 0
  let payingResults: number | null = null
  for (let i = 0; i < profits.length; i += 1) {
    if (profits[i] <= 0) break
    running += profits[i]
    if (running >= lost) {
      payingResults = i + 1
      break
    }
  }

  return {
    won,
    lost,
    winners,
    best,
    withoutBest: won - lost - best,
    topCount,
    topSharePct: won > 0 ? (topWon / won) * 100 : 0,
    payingResults,
  }
}

export interface Rhythm {
  /** Days with at least one result on them. */
  activeDays: number
  perActiveDay: number
  busiest: { date: string; count: number } | null
  /** The longest run of empty days between two days that had something. */
  longestGap: number
  /** First result to last, both days counted. */
  span: number
  perWeek: number
}

/**
 * How the volume is spread across the calendar.
 *
 * Volume per day played is a different question from volume per week, and the
 * gap between them is the whole of how somebody plays: twelve tables one
 * evening a week is a schedule, two a night is a habit, and they do not
 * produce the same results from the same ROI. The longest gap is here because
 * a layoff you have forgotten about is the usual reason a month looks worse
 * than it was.
 */
export function rhythm(entries: readonly Entry[]): Rhythm {
  const perDay = new Map<string, number>()
  for (const entry of entries) {
    perDay.set(entry.date, (perDay.get(entry.date) ?? 0) + 1)
  }
  if (perDay.size === 0) {
    return { activeDays: 0, perActiveDay: 0, busiest: null, longestGap: 0, span: 0, perWeek: 0 }
  }

  const days = [...perDay.keys()].sort()
  let busiest = { date: days[0], count: perDay.get(days[0]) ?? 0 }
  for (const date of days) {
    const count = perDay.get(date) ?? 0
    if (count > busiest.count) busiest = { date, count }
  }

  let longestGap = 0
  const numbers = days.map(utcDay).filter((day): day is number => day !== null)
  for (let i = 1; i < numbers.length; i += 1) {
    longestGap = Math.max(longestGap, numbers[i] - numbers[i - 1] - 1)
  }

  const span =
    numbers.length > 0 ? numbers[numbers.length - 1] - numbers[0] + 1 : perDay.size

  return {
    activeDays: perDay.size,
    perActiveDay: entries.length / perDay.size,
    busiest,
    longestGap,
    span,
    perWeek: span > 0 ? (entries.length / span) * 7 : entries.length,
  }
}

export interface StakeSpread {
  average: number
  /** Median cost, which a single shot cannot drag upwards. */
  median: number
  biggest: number
  /** How many different buy-in costs appear in the log. */
  distinct: number
  /** The dearest band with anything in it, and its share of the volume. */
  topBand: string
  topBandPct: number
}

/**
 * What you actually play, as opposed to what you would say you play.
 *
 * Average and median together, because the two disagree exactly when it
 * matters: an average well above the median means a handful of shots are
 * doing the talking, and those are the entries a bankroll rule has to cover
 * even though they are a rounding error in the volume.
 */
export function stakeSpread(entries: readonly Entry[]): StakeSpread {
  if (entries.length === 0) {
    return { average: 0, median: 0, biggest: 0, distinct: 0, topBand: '', topBandPct: 0 }
  }

  const costs = entries.map(entryCost).sort((a, b) => a - b)
  const middle = Math.floor(costs.length / 2)
  const bands = byBuyIn(entries)
  const top = bands[bands.length - 1]

  return {
    average: costs.reduce((sum, cost) => sum + cost, 0) / costs.length,
    median:
      costs.length % 2 === 1 ? costs[middle] : (costs[middle - 1] + costs[middle]) / 2,
    biggest: costs[costs.length - 1],
    distinct: new Set(costs).size,
    topBand: top ? top.key : '',
    topBandPct: top ? (top.count / entries.length) * 100 : 0,
  }
}
