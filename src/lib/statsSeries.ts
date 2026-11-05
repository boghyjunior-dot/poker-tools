/**
 * The shapes a results log makes, ready for drawing.
 *
 * The tables on the Stats page answer "how much" and the series here answer
 * "in what shape", which is the half tournament players get wrong. A log that
 * comes to +18% ROI can be a steady climb or one score sitting on top of a
 * year of losses, and those are different games with different bankroll
 * requirements — the number is identical and the picture is not.
 *
 * Everything here is derived, ordered, and free of opinion about how it gets
 * painted: a list of points and a list of buckets. The components decide what
 * a colour means.
 */

import { weekdayIndex } from './stats'
import { entryCost, entryProfit, sortByDate, type Entry } from './tracker'

export interface CurvePoint {
  /** 1-based tournament number. Volume on the x-axis, not time. */
  index: number
  date: string
  /** Cumulative profit in money. */
  money: number
  /**
   * Cumulative profit in buy-ins, each result measured against its own cost.
   *
   * The scale-free version, and the only fair way to read a log where the
   * stakes moved: $200 lost at $215 a go is a bad night, and the same $200
   * lost at $1.50 a go is sixty-odd of them.
   */
  buyIns: number
  /** The highest the money line has reached so far, for shading the drawdown. */
  moneyPeak: number
  /** The same high-water mark, in buy-ins. */
  buyInsPeak: number
}

/**
 * The running total after every result, oldest first.
 *
 * The first point is the origin — zero profit before anything was played —
 * carrying the first result's date so the line starts on the baseline rather
 * than floating above it. An empty log has no curve at all, not even that.
 */
export function profitCurve(entries: readonly Entry[]): CurvePoint[] {
  const ordered = sortByDate(entries)
  if (ordered.length === 0) return []

  const points: CurvePoint[] = [
    { index: 0, date: ordered[0].date, money: 0, buyIns: 0, moneyPeak: 0, buyInsPeak: 0 },
  ]

  let money = 0
  let buyIns = 0
  let moneyPeak = 0
  let buyInsPeak = 0
  ordered.forEach((entry, index) => {
    const cost = entryCost(entry)
    money += entryProfit(entry)
    // A freeroll has no buy-in to measure itself against, so it moves the
    // money line and leaves the buy-in line alone.
    if (cost > 0) buyIns += entryProfit(entry) / cost
    moneyPeak = Math.max(moneyPeak, money)
    buyInsPeak = Math.max(buyInsPeak, buyIns)
    points.push({ index: index + 1, date: entry.date, money, buyIns, moneyPeak, buyInsPeak })
  })

  return points
}

export interface RollingPoint {
  /** The tournament this window ends on. */
  index: number
  date: string
  roiPct: number
}

/** Below this there is no form to plot, only noise with a line through it. */
export const ROLLING_MIN = 50

/**
 * How wide a rolling window to use for a log this size.
 *
 * A quarter of the log, bounded: narrow enough that the line moves when your
 * results do, wide enough that it is not just redrawing the last big score.
 * Derived from the count rather than fixed because a fixed 100 draws nothing
 * at all for most people, and a chart nobody ever sees teaches nobody
 * anything.
 */
export function rollingWindow(count: number): number {
  return Math.min(250, Math.max(25, Math.round(count / 4)))
}

/**
 * ROI over a sliding window, so form is visible rather than inferred.
 *
 * Still ROI on total cost, the same definition as everywhere else — only the
 * sample moves. Each point sits at the end of its window: a point at
 * tournament 180 is tournaments 81 to 180, not the next hundred.
 */
export function rollingRoi(entries: readonly Entry[], window?: number): RollingPoint[] {
  const ordered = sortByDate(entries)
  const size = Math.max(1, Math.floor(window ?? rollingWindow(ordered.length)))
  if (ordered.length < size) return []

  const costs = ordered.map(entryCost)
  const profits = ordered.map(entryProfit)

  let cost = 0
  let profit = 0
  const out: RollingPoint[] = []

  for (let i = 0; i < ordered.length; i += 1) {
    cost += costs[i]
    profit += profits[i]
    if (i >= size) {
      cost -= costs[i - size]
      profit -= profits[i - size]
    }
    if (i >= size - 1) {
      out.push({
        index: i + 1,
        date: ordered[i].date,
        roiPct: cost > 0 ? (profit / cost) * 100 : 0,
      })
    }
  }

  return out
}

/**
 * What came back, as a multiple of what it cost.
 *
 * Bands rather than a smooth histogram because the interesting thing about a
 * tournament distribution is not its exact shape, it is that one band holds
 * most of the entries and a band at the far end holds most of the money. The
 * edges are where that changes character: busting, cashing for less than the
 * entry, the min-cash, the deep run, the score.
 */
export const RETURN_BANDS = [
  { label: 'Nothing back', short: '0x', max: 0 },
  { label: 'Under 1x', short: '<1x', max: 1 },
  { label: '1x to 2x', short: '1-2x', max: 2 },
  { label: '2x to 5x', short: '2-5x', max: 5 },
  { label: '5x to 10x', short: '5-10x', max: 10 },
  { label: '10x to 25x', short: '10-25x', max: 25 },
  { label: '25x and up', short: '25x+', max: Number.POSITIVE_INFINITY },
] as const

/** What a result returned per unit staked. A freeroll that paid is off the top. */
export function returnMultiple(entry: Entry): number {
  const cost = entryCost(entry)
  const back = Math.max(0, entry.cashed) + Math.max(0, entry.bounties)
  if (cost > 0) return back / cost
  return back > 0 ? Number.POSITIVE_INFINITY : 0
}

export function returnBand(multiple: number): string {
  if (!(multiple > 0)) return RETURN_BANDS[0].label
  for (const band of RETURN_BANDS) {
    if (band.max > 0 && multiple < band.max) return band.label
  }
  return RETURN_BANDS[RETURN_BANDS.length - 1].label
}

export interface ReturnBucket {
  label: string
  short: string
  count: number
  /** Net profit of the results in this band — negative for most of them. */
  profit: number
  /** Share of all results that landed here. */
  sharePct: number
}

/**
 * Every band, in ladder order, empty ones included.
 *
 * Empty bands are kept so the axis does not move between one visit and the
 * next, and so a gap reads as a gap: no deep runs at all this year is
 * information, and dropping the column would hide it.
 */
export function returnBuckets(entries: readonly Entry[]): ReturnBucket[] {
  const counts = new Map<string, { count: number; profit: number }>()
  for (const entry of entries) {
    const label = returnBand(returnMultiple(entry))
    const bucket = counts.get(label) ?? { count: 0, profit: 0 }
    bucket.count += 1
    bucket.profit += entryProfit(entry)
    counts.set(label, bucket)
  }

  return RETURN_BANDS.map((band) => {
    const bucket = counts.get(band.label) ?? { count: 0, profit: 0 }
    return {
      label: band.label,
      short: band.short,
      count: bucket.count,
      profit: bucket.profit,
      sharePct: entries.length > 0 ? (bucket.count / entries.length) * 100 : 0,
    }
  })
}

/** Monday first: a poker week ends on the Sunday majors, it does not start there. */
export const WEEKDAYS = [
  { label: 'Monday', short: 'Mon' },
  { label: 'Tuesday', short: 'Tue' },
  { label: 'Wednesday', short: 'Wed' },
  { label: 'Thursday', short: 'Thu' },
  { label: 'Friday', short: 'Fri' },
  { label: 'Saturday', short: 'Sat' },
  { label: 'Sunday', short: 'Sun' },
] as const

export interface DayRhythm {
  /** 0 is Monday. */
  day: number
  label: string
  short: string
  count: number
  staked: number
  profit: number
  roiPct: number
}

/**
 * Volume and result by day of the week, all seven days present.
 *
 * The cut that tends to say the most for the least work: the Sunday schedule
 * is bigger, deeper and more expensive than the Tuesday one, and most people
 * have never checked whether their own results agree that it is worth it.
 */
export function byWeekday(entries: readonly Entry[]): DayRhythm[] {
  const buckets = WEEKDAYS.map((day, index) => ({
    day: index,
    label: day.label,
    short: day.short,
    count: 0,
    staked: 0,
    profit: 0,
    roiPct: 0,
  }))

  for (const entry of entries) {
    const index = weekdayIndex(entry.date)
    if (index === null) continue
    const bucket = buckets[index]
    bucket.count += 1
    bucket.staked += entryCost(entry)
    bucket.profit += entryProfit(entry)
  }

  for (const bucket of buckets) {
    bucket.roiPct = bucket.staked > 0 ? (bucket.profit / bucket.staked) * 100 : 0
  }

  return buckets
}
