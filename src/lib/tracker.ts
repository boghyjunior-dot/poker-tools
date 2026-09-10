/**
 * A results log, and the few numbers worth reading off it.
 *
 * The Bankroll tool answers what you can afford given an ROI. This is where
 * that ROI comes from — and the point of keeping it is that the figure you
 * feed a bankroll calculation should be measured rather than remembered, since
 * almost everybody remembers it high.
 */

export interface Entry {
  id: string
  /** ISO date, day resolution — results are logged per tournament, not per minute. */
  date: string
  name: string
  site: string
  buyIn: number
  /** Rake or entry fee on top of the buy-in. */
  fee: number
  /** What came back. Zero for a bust, which is most of them. */
  cashed: number
  /** Bounties collected, kept apart so they do not hide inside the cash. */
  bounties: number
  notes?: string
}

export interface EntryView extends Entry {
  cost: number
  profit: number
  /** Running bankroll after this entry, oldest first. */
  balance: number
  itm: boolean
}

export interface Totals {
  count: number
  staked: number
  returned: number
  profit: number
  /** Return on total cost, which is the definition the other tools expect. */
  roiPct: number
  itmCount: number
  itmPct: number
  averageBuyIn: number
  /** Biggest peak-to-trough fall in the running balance. */
  worstDrawdown: number
  /** Best single result, by profit. */
  bestResult: number
}

export function entryCost(entry: Entry): number {
  return Math.max(0, entry.buyIn) + Math.max(0, entry.fee)
}

export function entryProfit(entry: Entry): number {
  return Math.max(0, entry.cashed) + Math.max(0, entry.bounties) - entryCost(entry)
}

/** Oldest first, so the running balance reads down the page in order. */
export function sortByDate(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
}

/**
 * Attach cost, profit and the running balance to every entry.
 *
 * `startingBankroll` is where the balance line begins, so the graph shows your
 * roll rather than cumulative profit from zero.
 */
export function buildViews(entries: Entry[], startingBankroll = 0): EntryView[] {
  let balance = startingBankroll
  return sortByDate(entries).map((entry) => {
    const cost = entryCost(entry)
    const profit = entryProfit(entry)
    balance += profit
    return {
      ...entry,
      cost,
      profit,
      balance,
      itm: Math.max(0, entry.cashed) + Math.max(0, entry.bounties) > 0,
    }
  })
}

const EMPTY: Totals = {
  count: 0,
  staked: 0,
  returned: 0,
  profit: 0,
  roiPct: 0,
  itmCount: 0,
  itmPct: 0,
  averageBuyIn: 0,
  worstDrawdown: 0,
  bestResult: 0,
}

export function summarise(views: EntryView[]): Totals {
  if (views.length === 0) return EMPTY

  let staked = 0
  let returned = 0
  let itmCount = 0
  let buyInTotal = 0
  // The roll before the first entry is itself a peak: a fall from it is a real
  // drawdown, and seeding from the first *result* would hide the opening dip.
  let peak = views[0].balance - views[0].profit
  let worstDrawdown = 0
  let bestResult = -Infinity

  for (const view of views) {
    staked += view.cost
    returned += Math.max(0, view.cashed) + Math.max(0, view.bounties)
    if (view.itm) itmCount += 1
    buyInTotal += view.buyIn
    if (view.balance > peak) peak = view.balance
    worstDrawdown = Math.max(worstDrawdown, peak - view.balance)
    bestResult = Math.max(bestResult, view.profit)
  }

  const profit = returned - staked

  return {
    count: views.length,
    staked,
    returned,
    profit,
    roiPct: staked > 0 ? (profit / staked) * 100 : 0,
    itmCount,
    itmPct: (itmCount / views.length) * 100,
    averageBuyIn: buyInTotal / views.length,
    worstDrawdown,
    bestResult,
  }
}

/**
 * How much a measured ROI is worth trusting.
 *
 * Tournament results are so skewed that a few hundred of them say very little,
 * and quoting an ROI from a short sample is the most common way people talk
 * themselves into stakes they cannot beat.
 */
export type Confidence = 'noise' | 'thin' | 'fair' | 'solid'

export function confidenceFromCount(count: number): Confidence {
  if (count < 500) return 'noise'
  if (count < 2_000) return 'thin'
  if (count < 5_000) return 'fair'
  return 'solid'
}

export const CONFIDENCE_NOTE: Record<Confidence, string> = {
  noise: 'Under 500 tournaments this ROI is mostly noise. Do not size a bankroll off it.',
  thin: 'A few thousand is still thin for MTTs. Treat this as a direction, not a number.',
  fair: 'Enough to be worth something, though a good or bad run still moves it.',
  solid: 'A sample big enough that the number means roughly what it says.',
}

export const STORAGE_KEY = 'poker-tools:tracker'
export const BANKROLL_KEY = 'poker-tools:tracker-start'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const money = (value: unknown): number => {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

export function parseStored(raw: unknown): Entry[] {
  if (!Array.isArray(raw)) return []
  const out: Entry[] = []
  for (const entry of raw) {
    if (!isRecord(entry)) continue
    const id = typeof entry.id === 'string' ? entry.id : null
    const date = typeof entry.date === 'string' ? entry.date : null
    if (!id || !date || Number.isNaN(new Date(date).getTime())) continue
    out.push({
      id,
      date,
      name: typeof entry.name === 'string' && entry.name ? entry.name : 'Untitled',
      site: typeof entry.site === 'string' ? entry.site : '',
      buyIn: money(entry.buyIn),
      fee: money(entry.fee),
      cashed: money(entry.cashed),
      bounties: money(entry.bounties),
      notes: typeof entry.notes === 'string' ? entry.notes : undefined,
    })
  }
  return out
}

export function loadEntries(): Entry[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? parseStored(JSON.parse(raw)) : []
  } catch {
    return []
  }
}

export function saveEntries(entries: Entry[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // Private mode — the session still works, it just will not persist.
  }
}

export function newEntryId(): string {
  return `e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/** Results as CSV, so the log can leave this browser. */
export function toCsv(views: EntryView[]): string {
  const header = 'date,name,site,buyIn,fee,cashed,bounties,profit,balance'
  const rows = views.map((view) =>
    [
      view.date,
      `"${view.name.replace(/"/g, '""')}"`,
      `"${view.site.replace(/"/g, '""')}"`,
      view.buyIn,
      view.fee,
      view.cashed,
      view.bounties,
      view.profit,
      view.balance,
    ].join(','),
  )
  return [header, ...rows].join('\n')
}
