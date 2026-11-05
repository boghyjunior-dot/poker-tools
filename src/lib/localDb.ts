/**
 * The browser's own database, for the things worth not losing.
 *
 * localStorage was always the wrong shape for a results log. It holds about
 * five megabytes of string, rewrites the whole array on every change, and is
 * the first thing cleared by anything that clears site data — which is how a
 * few hundred tournaments disappear in one click. IndexedDB is bigger, keyed,
 * and survives more.
 *
 * Still local only. There is no server behind this and nothing leaves the
 * machine; it is the same promise the rest of the tools make, kept somewhere
 * sturdier.
 *
 * Deliberately dumb: open, read all, write all, delete. Every decision worth
 * testing lives in the modules above this one, because a thin wrapper around
 * a browser API cannot be unit-tested without pulling in a fake browser.
 */

const DB_NAME = 'poker-tools'
/**
 * Raise this whenever STORES gains a name.
 *
 * A database created at an older version keeps the stores it has and gets
 * the missing ones in onupgradeneeded; leaving the number alone means that
 * upgrade never runs, and the first write to a store the browser has never
 * heard of throws. Which, until the catch below was removed, looked exactly
 * like a save that worked.
 */
const DB_VERSION = 2

/** Object stores, each keyed by the `id` on the records it holds. */
export const STORES = ['schedule', 'entries', 'library'] as const
export type StoreName = (typeof STORES)[number]

export function indexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined'
}

let open: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (open) return open
  open = new Promise((resolve, reject) => {
    if (!indexedDbAvailable()) {
      reject(new Error('IndexedDB is not available'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open the database'))
    // A second tab holding an old version open blocks the upgrade. Failing
    // loudly beats hanging on a promise that never settles.
    request.onblocked = () => reject(new Error('Another tab is holding the database open'))
  })
  // A failed open must not be cached, or every later call inherits one bad
  // moment — a private window, a quota prompt declined — for the session.
  open.catch(() => {
    open = null
  })
  return open
}

function run<T>(
  store: StoreName,
  mode: IDBTransactionMode,
  body: (objectStore: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode)
        const request = body(tx.objectStore(store))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error ?? new Error('Database request failed'))
        tx.onabort = () => reject(tx.error ?? new Error('Database transaction aborted'))
      }),
  )
}

export function readAll<T>(store: StoreName): Promise<T[]> {
  return run<T[]>(store, 'readonly', (objectStore) => objectStore.getAll())
}

/**
 * Replace a store's contents.
 *
 * The clear and the writes are one transaction, and the order they are issued
 * in is the whole of the danger here. A clear followed by writes that throw
 * leaves a transaction holding nothing but the deletion — and IndexedDB will
 * commit that quite happily, because nothing told it anything went wrong. The
 * result is a store emptied by the act of trying to save to it, which looks
 * from the outside exactly like a save that silently did nothing.
 *
 * So the handlers go on before any request is issued, and a throw while
 * issuing them aborts the transaction, which rolls the clear back with it.
 * Whatever was there survives a failed save.
 */
export function writeAll<T extends { id: string }>(
  store: StoreName,
  records: readonly T[],
): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite')
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error ?? new Error('Database write failed'))
        tx.onabort = () => reject(tx.error ?? new Error('Database write aborted'))

        try {
          const objectStore = tx.objectStore(store)
          objectStore.clear()
          for (const record of records) objectStore.put(record)
        } catch (error) {
          // Rolls back the clear. Without this the store stays empty.
          try {
            tx.abort()
          } catch {
            // Already aborting; onabort will do the rejecting.
          }
          reject(error instanceof Error ? error : new Error(String(error)))
        }
      }),
  )
}

/** Add or update one record without rewriting the store around it. */
export function writeOne<T extends { id: string }>(store: StoreName, record: T): Promise<void> {
  return run(store, 'readwrite', (objectStore) => objectStore.put(record)).then(() => undefined)
}
