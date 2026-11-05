/**
 * The schedule, in the database.
 *
 * localStorage stays readable so that a schedule saved by an older build is
 * found and moved across once, but it is not written to any more: two copies
 * of the same list, one of them stale, is how you lose the newer one.
 */

import { readAll, writeAll, indexedDbAvailable } from './localDb'
import { planLoad, type LoadPlan } from './persisted'
import { loadSchedule, parseStored, type Tournament } from './schedule'
import { defaultSchedule, SEEDED_KEY } from './scheduleTemplate'

function seeded(): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    return localStorage.getItem(SEEDED_KEY) !== null
  } catch {
    return false
  }
}

function markSeeded(): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(SEEDED_KEY, '1')
  } catch {
    // Private mode. The cards reappear next time, which is the mild failure.
  }
}

/**
 * What the Schedule should open with, and whether it owes the database a write.
 *
 * Records come back through `parseStored` even from the database, because a
 * row written by an older version of this app is exactly as untrusted as one
 * from anywhere else — the shape has already changed twice.
 */
export async function loadScheduleFromDb(): Promise<LoadPlan<Tournament>> {
  const fromDatabase = indexedDbAvailable()
    ? parseStored(await readAll<Tournament>('schedule').catch(() => []))
    : []

  const plan = planLoad<Tournament>({
    fromDatabase,
    fromLegacy: loadSchedule(),
    seed: () => defaultSchedule(),
    seeded: seeded(),
  })

  if (plan.source === 'seeded') markSeeded()
  return plan
}

/** Replace the stored schedule. Quiet on failure: the session still works. */
export async function saveScheduleToDb(tournaments: readonly Tournament[]): Promise<void> {
  if (!indexedDbAvailable()) return
  await writeAll('schedule', tournaments).catch(() => {})
}
