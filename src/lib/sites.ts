/**
 * The rooms, and the colours they are known by.
 *
 * A room is the one field on a row you read without reading it — you are
 * scanning for "which of these are on GG tonight", not parsing text. Giving
 * each one its own colour turns that into a glance. The colours are the ones
 * the rooms use themselves, so the association is already in your head.
 *
 * The list is a suggestion, not a rule. A room nobody put here still goes in
 * the field and still shows as a tag, in grey — losing a site because it was
 * not on a list someone wrote in 2026 would be worse than the list being
 * incomplete, which it certainly is.
 */

export const SITES = ['GGPoker', 'iPoker', 'Coin Poker', 'PokerStars', '888 Poker'] as const
export type KnownSite = (typeof SITES)[number]

/** Tailwind classes for a room tag: background, text, and a border to lift it. */
export interface SiteStyle {
  className: string
}

/** Keyed by the canonical form, so every spelling lands on one entry. */
const STYLES: Record<string, SiteStyle> = {
  // Black, which on this app's dark surfaces needs its border to be seen.
  ggpoker: { className: 'border-slate-500 bg-black text-slate-100' },
  ipoker: { className: 'border-yellow-400 bg-yellow-400 text-yellow-950' },
  coinpoker: { className: 'border-red-500 bg-red-600 text-red-50' },
  pokerstars: { className: 'border-blue-400 bg-blue-600 text-blue-50' },
  // Not asked for, so it takes the house green rather than inventing a brand.
  '888poker': { className: 'border-indigo-400 bg-indigo-600 text-indigo-950' },
}

/** Grey, for a room the list has never heard of. */
const UNKNOWN: SiteStyle = { className: 'border-slate-600 bg-slate-800 text-slate-300' }

/**
 * One form for every way a room gets written.
 *
 * "GGPoker", "GG Poker" and "ggpoker" are one site, and a pasted lobby is
 * where the spelling drifts. Case and every space come out, so a tag does not
 * go grey over a space bar.
 */
function canonical(site: string): string {
  return site.toLowerCase().replace(/\s+/g, '')
}

export function siteStyle(site: string): SiteStyle {
  return STYLES[canonical(site)] ?? UNKNOWN
}

/**
 * True when the room is one the dropdown offers.
 *
 * Exact, unlike the colour lookup: the dropdown's job is to show the value
 * that is actually stored, so "gg poker" is a different string from "GGPoker"
 * even though both get the same tag. Treating them as one here would mean the
 * select silently showing a value the row does not hold.
 */
export function isKnownSite(site: string): boolean {
  return (SITES as readonly string[]).includes(site.trim())
}

/**
 * The options a room dropdown should show.
 *
 * Whatever is already on the row comes first if the list does not have it, so
 * opening the dropdown on an imported row cannot quietly rewrite its site to
 * something else the moment it is touched.
 */
export function siteOptions(current: string): string[] {
  const trimmed = current.trim()
  if (trimmed === '' || isKnownSite(trimmed)) return [...SITES]
  return [trimmed, ...SITES]
}
