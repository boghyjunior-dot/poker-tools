/**
 * The three currencies the calculator takes money in.
 *
 * The challenge itself is denominated in dollars and stays that way: the
 * $5–$66 band is a rule, and a rule that moved with the euro would be a
 * different rule every morning. What changes here is only what you are
 * allowed to type — people buy in at €20 or ¥150 and should not have to do
 * the conversion in their head before they can use the thing.
 *
 * Two of the three terms do not care. Bty / Bi is a ratio, so it comes out
 * the same whatever you counted the heads in, and the finishing term is
 * entries over place. Only the stake multiplier and the band check are in
 * dollars, which is where the conversion happens and nowhere else.
 *
 * The rates are a snapshot rather than a lookup. This is a static page with
 * no server behind it: a live rate is a network call that can fail, a number
 * that moves while you are reading it, and a score that cannot be reproduced
 * tomorrow. A fixed rate with the date it was taken printed next to it is
 * honest about what it is, and a calculator nobody is settling bets with
 * does not need the fourth decimal place.
 */

export type CurrencyCode = 'USD' | 'EUR' | 'CNY'

export interface Currency {
  code: CurrencyCode
  /** What goes in front of the figure. */
  symbol: string
  /** The name on the button. */
  label: string
  /** How many of it one US dollar buys. */
  perUsd: number
}

/** The day the rates below were read, shown wherever they are used. */
export const RATES_TAKEN = '2026-11-26'

export const CURRENCIES: Record<CurrencyCode, Currency> = {
  USD: { code: 'USD', symbol: '$', label: 'USD', perUsd: 1 },
  EUR: { code: 'EUR', symbol: '€', label: 'EUR', perUsd: 0.9121 },
  CNY: { code: 'CNY', symbol: '¥', label: 'CNY', perUsd: 6.6832 },
}

/** In the order the buttons sit, dollars first because the rules are. */
export const CURRENCY_CODES: readonly CurrencyCode[] = ['USD', 'EUR', 'CNY']

/** What an amount in this currency is worth in dollars. */
export function toUsd(amount: number, code: CurrencyCode): number {
  if (!Number.isFinite(amount)) return 0
  return amount / CURRENCIES[code].perUsd
}

/** What a dollar amount is worth in this currency. */
export function fromUsd(usd: number, code: CurrencyCode): number {
  if (!Number.isFinite(usd)) return 0
  return usd * CURRENCIES[code].perUsd
}

/**
 * The same money, counted in a different currency.
 *
 * Used when somebody changes the currency with figures already in the boxes:
 * the amount they meant has not changed, so the score must not either.
 */
export function convert(amount: number, from: CurrencyCode, to: CurrencyCode): number {
  if (from === to) return Number.isFinite(amount) ? amount : 0
  return fromUsd(toUsd(amount, from), to)
}

/**
 * An amount with its symbol in front.
 *
 * Whole numbers keep their shape — $22 rather than $22.00 — because that is
 * how a buy-in is written, and the decimals only turn up on the figures that
 * have them, which are the converted ones.
 */
export function formatAmount(amount: number, code: CurrencyCode): string {
  const value = Number.isFinite(amount) ? amount : 0
  const whole = Number.isInteger(value)
  return `${CURRENCIES[code].symbol}${value.toLocaleString('en-US', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  })}`
}

/**
 * A dollar amount written in another currency, rounded the way a buy-in is.
 *
 * Two decimal places, because the band ends at $66 and €60.20 is a figure
 * somebody might actually be charged.
 */
export function showInCurrency(usd: number, code: CurrencyCode): string {
  return formatAmount(Math.round(fromUsd(usd, code) * 100) / 100, code)
}
