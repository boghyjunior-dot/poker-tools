/**
 * The results log, in the database.
 *
 * Same shape as the schedule's store, and for the same reason: a log built
 * over a year is the thing in this app that cannot be reconstructed. The
 * cards can be loaded again, a schedule can be remade in an evening, but
 * nobody can remember what a hundred tournaments paid.
 *
 * localStorage is read once and moved across, then left alone.
 */

import { readAll, writeAll, writeOne, indexedDbAvailable } from './localDb'
import { planLoad, type LoadPlan } from './persisted'
import { BANKROLL_KEY, loadEntries, parseStored, type Entry } from './tracker'
import { legacyStart, parseBankrolls, type SiteBankroll } from './siteBankrolls'

/** What the Tracker should open with, and whether it owes the database a write. */
export async function loadEntriesFromDb(): Promise<LoadPlan<Entry>> {
  const fromDatabase = indexedDbAvailable()
    ? parseStored(await readAll<Entry>('entries').catch(() => []))
    : []

  // No seed: an empty results log is simply someone who has not logged
  // anything, and inventing rows there would be inventing a history.
  return planLoad<Entry>({ fromDatabase, fromLegacy: loadEntries() })
}

/**
 * Save, then read back what is actually there.
 *
 * Not paranoia. A browser can accept a write and keep nothing — private
 * windows, storage set to clear on exit, extensions that stub IndexedDB out —
 * and every one of those looks identical to a working save until the next
 * reload, which is far too late to find out. Reading the count back costs one
 * more transaction and turns "it did not save" into a number on the screen.
 *
 * Throws if it cannot save at all.
 */
export async function saveEntriesToDb(entries: readonly Entry[]): Promise<number> {
  if (!indexedDbAvailable()) throw new Error('This browser has no database to save to.')
  await writeAll('entries', entries)
  const stored = await readAll<Entry>('entries')
  return stored.length
}

/**
 * Add one result without touching the rest.
 *
 * This is what the Schedule calls when you bust out, and it writes a single
 * record rather than the whole list on purpose: the Schedule does not hold
 * the log and must not be the one to decide what else is in it. A Tracker
 * open in another tab still only learns about it on its next load, but it
 * can no longer overwrite it by saving a list this row was never in.
 */
export async function appendEntryToDb(entry: Entry): Promise<void> {
  if (!indexedDbAvailable()) throw new Error('This browser has no database to save to.')
  await writeOne('entries', entry)
}

/**
 * The starting bankrolls, one per room.
 *
 * Small enough to have lived happily in localStorage, and it did — but it is
 * the figure every balance on the page is measured from, so losing it silently
 * would misreport every account at once. It goes where the results went.
 */
export async function loadBankrollsFromDb(): Promise<LoadPlan<SiteBankroll>> {
  const fromDatabase = indexedDbAvailable()
    ? parseBankrolls(await readAll<SiteBankroll>('bankrolls').catch(() => []))
    : []

  let stored: string | null = null
  try {
    stored = typeof localStorage === 'undefined' ? null : localStorage.getItem(BANKROLL_KEY)
  } catch {
    // Private mode. There is nothing to migrate across, which is fine.
  }

  return planLoad<SiteBankroll>({ fromDatabase, fromLegacy: legacyStart(stored) })
}

/** Replace the stored bankrolls, and report what the database kept. */
export async function saveBankrollsToDb(rolls: readonly SiteBankroll[]): Promise<number> {
  if (!indexedDbAvailable()) throw new Error('This browser has no database to save to.')
  await writeAll('bankrolls', rolls)
  const stored = await readAll<SiteBankroll>('bankrolls')
  return stored.length
}
