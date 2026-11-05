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
import { loadEntries, parseStored, type Entry } from './tracker'

/** What the Tracker should open with, and whether it owes the database a write. */
export async function loadEntriesFromDb(): Promise<LoadPlan<Entry>> {
  const fromDatabase = indexedDbAvailable()
    ? parseStored(await readAll<Entry>('entries').catch(() => []))
    : []

  // No seed: an empty results log is simply someone who has not logged
  // anything, and inventing rows there would be inventing a history.
  return planLoad<Entry>({ fromDatabase, fromLegacy: loadEntries() })
}

export async function saveEntriesToDb(entries: readonly Entry[]): Promise<void> {
  if (!indexedDbAvailable()) return
  await writeAll('entries', entries).catch(() => {})
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
  if (!indexedDbAvailable()) return
  await writeOne('entries', entry).catch(() => {})
}
