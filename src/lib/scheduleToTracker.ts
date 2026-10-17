/**
 * Where a finished tournament goes.
 *
 * The Schedule knows what you entered and what it cost; the Tracker is what
 * turns a pile of those into an ROI. Typing each result into both is how the
 * second one quietly stops being true, so busting out of a tournament you
 * marked as playing writes the entry itself.
 *
 * It is a one-way door on purpose. The Tracker owns the log once the row
 * arrives, and editing it there must not be undone by anything the Schedule
 * does afterwards — so this builds an entry and hands it over, rather than
 * keeping the two in step.
 */

import type { Tournament, TournamentResult } from './schedule'
import { newEntryId, type Entry } from './tracker'

/** The day a tournament belongs to in a results log: the day it started. */
export function entryDate(startsAt: string): string {
  const date = new Date(startsAt)
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10)
  // Local, not UTC: a tournament you played on Saturday night belongs to
  // Saturday, even when that is already Sunday in Greenwich.
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Turn a busted tournament into a results entry.
 *
 * Everything the result does not say is left at zero rather than guessed. A
 * blank cash field means a bust, which is most of them, and the Tracker reads
 * "in the money" off the cash rather than off a flag that could disagree with
 * it. The finishing place has nowhere structured to live in an entry, so it
 * goes in the notes, where it is at least still legible.
 */
export function entryFromTournament(
  tournament: Tournament,
  result: TournamentResult,
  id: string = newEntryId(),
): Entry {
  const place =
    result.position !== null && result.position > 0 ? `Finished ${result.position}` : undefined
  return {
    id,
    date: entryDate(tournament.startsAt),
    name: tournament.name.trim() || 'Untitled',
    site: tournament.site.trim(),
    buyIn: Math.max(0, tournament.buyIn),
    // The Schedule records one number for the entry, with no rake split out.
    fee: 0,
    cashed: Math.max(0, result.cashed),
    bounties: Math.max(0, result.bounties),
    notes: [tournament.notes?.trim(), place].filter(Boolean).join(' · ') || undefined,
  }
}
