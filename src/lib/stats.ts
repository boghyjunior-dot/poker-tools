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

export const UNKNOWN_SITE = 'No room'

export function bySite(entries: readonly Entry[]): Breakdown[] {
  return groupBy(entries, (entry) => entry.site.trim() || UNKNOWN_SITE)
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
