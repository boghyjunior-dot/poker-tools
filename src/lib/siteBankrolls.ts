/**
 * A starting bankroll per room, and one set of stats over all of them.
 *
 * Money is not one pile. A roll spread over four rooms is four balances that
 * cannot be spent on each other's tables: $40 on Coin Poker will not buy a
 * seat in a GG Bounty Hunter tonight, however healthy the total looks. One
 * "starting bankroll" box could not say that, so what it reported — your total
 * roll — was the one number you never actually need before registering.
 *
 * The split is only in the starting money and the balances it produces. Every
 * other figure stays pooled on purpose: ROI, ITM, the worst downswing and the
 * sample behind them are facts about how you play, and cutting them five ways
 * turns one thin sample into five that say nothing at all. The Stats page cuts
 * by room where that is worth doing, over the whole log.
 */

import { SITES, UNKNOWN_SITE, siteKey, compareSites } from './sites'
import { entryCost, entryProfit, type Entry } from './tracker'

/** What is on one room's account before any of the log happened. */
export interface SiteBankroll {
  /** The room, spelled as rows spell it — also the record's key. */
  id: string
  amount: number
}

export interface SiteRoll {
  site: string
  start: number
  count: number
  staked: number
  profit: number
  /** What should be sitting in that account now. */
  balance: number
}

export function startingTotal(rolls: readonly SiteBankroll[]): number {
  return rolls.reduce((total, roll) => total + Math.max(0, roll.amount), 0)
}

export function amountFor(rolls: readonly SiteBankroll[], site: string): number {
  return rolls.find((roll) => roll.id === site)?.amount ?? 0
}

/**
 * Set one room's starting money.
 *
 * A zero drops the record rather than storing it, so a room you never kept
 * money on leaves nothing behind — and clearing the box is how you say "not
 * here any more" without the row lingering at $0 forever.
 */
export function setAmount(
  rolls: readonly SiteBankroll[],
  site: string,
  amount: number,
): SiteBankroll[] {
  const rest = rolls.filter((roll) => roll.id !== site)
  if (!(amount > 0)) return rest
  return [...rest, { id: site, amount }].sort((a, b) => compareSites(a.id, b.id))
}

/**
 * Each room's account: its starting money, what the log did to it, and what
 * should therefore be in it now.
 *
 * Rooms with neither money nor results are left out — the point is the
 * accounts you actually have, not a roll call of every room that exists.
 */
export function siteRolls(
  entries: readonly Entry[],
  rolls: readonly SiteBankroll[],
): SiteRoll[] {
  const rows = new Map<string, SiteRoll>()
  const row = (site: string): SiteRoll => {
    const existing = rows.get(site)
    if (existing) return existing
    const start = Math.max(0, amountFor(rolls, site))
    const fresh: SiteRoll = { site, start, count: 0, staked: 0, profit: 0, balance: start }
    rows.set(site, fresh)
    return fresh
  }

  for (const roll of rolls) {
    if (roll.amount > 0) row(roll.id)
  }
  for (const entry of entries) {
    const current = row(siteKey(entry.site))
    current.count += 1
    current.staked += entryCost(entry)
    current.profit += entryProfit(entry)
    current.balance = current.start + current.profit
  }

  return [...rows.values()].sort((a, b) => compareSites(a.site, b.site))
}

/**
 * Rooms the log says you have spent more on than you ever had there.
 *
 * Not a rounding complaint — a negative balance means the money came from
 * somewhere this app has not been told about: a deposit, a transfer between
 * rooms, or results logged with the wrong room on them. Worth saying, because
 * the combined total hides it perfectly.
 */
export function underwater(rolls: readonly SiteRoll[]): SiteRoll[] {
  return rolls.filter((roll) => roll.balance < 0)
}

/**
 * Which rooms get a box to type a starting bankroll into.
 *
 * Always the known rooms, so a roll can be entered before the first result is
 * logged, plus any room the log or the stored money mentions. "No room" only
 * appears when something is actually in it, since an empty bucket for results
 * nobody tagged is just a box that invites a mistake.
 */
export function bankrollFields(
  entries: readonly Entry[],
  rolls: readonly SiteBankroll[],
): string[] {
  const seen = new Set<string>(SITES)
  for (const entry of entries) seen.add(siteKey(entry.site))
  for (const roll of rolls) seen.add(roll.id)
  return [...seen].sort(compareSites)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Read stored bankrolls back, distrusting every field.
 *
 * Same discipline as the results log: this comes out of a database that an
 * older build wrote, and one bad row must not take the page down with it.
 */
export function parseBankrolls(raw: unknown): SiteBankroll[] {
  if (!Array.isArray(raw)) return []
  const out = new Map<string, SiteBankroll>()
  for (const record of raw) {
    if (!isRecord(record)) continue
    const id = typeof record.id === 'string' ? record.id.trim() : ''
    const amount = Number(record.amount)
    if (!id || !Number.isFinite(amount) || amount <= 0) continue
    out.set(id, { id, amount })
  }
  return [...out.values()].sort((a, b) => compareSites(a.id, b.id))
}

/**
 * The single starting bankroll this app used to keep, if it is still there.
 *
 * It was one number with no room attached, so it cannot honestly be given to
 * one: it lands under "No room", where the total is unchanged and it is sitting
 * somewhere obvious enough to split up. Guessing GG because most people play
 * there would be inventing a fact about someone's money.
 */
export function legacyStart(raw: string | null): SiteBankroll[] {
  const amount = Number(raw)
  if (!Number.isFinite(amount) || amount <= 0) return []
  return [{ id: UNKNOWN_SITE, amount }]
}
