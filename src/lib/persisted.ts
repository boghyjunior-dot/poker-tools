/**
 * Moving a list into the database without losing it on the way.
 *
 * Two things make this worth a module of its own rather than a few lines in
 * each page.
 *
 * The first is the migration. Everything was in localStorage; the database
 * starts empty. Read the database, see nothing, and write the current state
 * back, and you have replaced a year of results with the empty array the page
 * was holding while it waited. The order has to be: read both, decide, and
 * only then let anything save.
 *
 * The second is that the read is now asynchronous and the save is not. A
 * page that saves whatever it is holding, on mount, writes `[]` over the
 * database before the load it is waiting for has returned. That is not a
 * hypothetical — it is the same shape as the bug that emptied the schedule
 * once already, and the guard against it is the `ready` flag below being
 * false until there is something real to save.
 */

export type LoadSource = 'database' | 'migrated' | 'seeded' | 'empty'

export interface LoadPlan<T> {
  /** What the page should hold. */
  records: T[]
  /** Whether that needs writing to the database, because it came from elsewhere. */
  writeBack: boolean
  /** Where it came from, for the page to say so and for tests to pin. */
  source: LoadSource
}

/**
 * Decide what a list should start as.
 *
 * The database wins whenever it has anything, because it is the store of
 * record the moment it holds a row — a stale localStorage copy left behind by
 * an older build must never overwrite newer work.
 */
export function planLoad<T>(options: {
  fromDatabase: readonly T[]
  fromLegacy: readonly T[]
  /** Built only when both are empty and nothing has been seeded yet. */
  seed?: () => T[]
  /** Whether the seed has already been offered once and declined or cleared. */
  seeded?: boolean
}): LoadPlan<T> {
  const { fromDatabase, fromLegacy, seed, seeded = false } = options

  if (fromDatabase.length > 0) {
    return { records: [...fromDatabase], writeBack: false, source: 'database' }
  }
  if (fromLegacy.length > 0) {
    return { records: [...fromLegacy], writeBack: true, source: 'migrated' }
  }
  if (seed && !seeded) {
    return { records: seed(), writeBack: true, source: 'seeded' }
  }
  return { records: [], writeBack: false, source: 'empty' }
}

/**
 * Whether a change is safe to write.
 *
 * `ready` is false until the load has finished, which is the whole guard: a
 * save that fires before then is the page's empty starting state, not
 * anything the person did.
 */
export function shouldPersist(ready: boolean): boolean {
  return ready
}
