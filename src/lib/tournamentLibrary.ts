/**
 * The tournaments you actually play, kept so you stop retyping them.
 *
 * A results log is mostly the same thirty tournaments over and over. Typing
 * "Bounty Hunters $21.60 / GGPoker / 21.60" for the hundredth time is how a
 * log stops getting filled in, and a log that is not filled in is worse than
 * none, because the ROI it reports is of the nights you felt like typing.
 *
 * So the library is a list of what you play, and logging a result becomes
 * picking one and saying how it went.
 */

import type { Entry } from './tracker'

export interface SavedTournament {
  id: string
  name: string
  site: string
  buyIn: number
  fee: number
  /** How many results have been logged against it. */
  played: number
  /** ISO day of the most recent one, for sorting by what is current. */
  lastPlayed: string | null
}

/**
 * What makes two tournaments the same one.
 *
 * Name and room together, folded and trimmed. The buy-in is deliberately not
 * part of it: "Bounty Hunters $21.60" that goes up to $22 is the same
 * tournament with a new price, and splitting it in two would lose the history
 * at the moment it starts mattering.
 */
export function tournamentKey(name: string, site: string): string {
  return `${name.trim().toLowerCase()}|${site.trim().toLowerCase()}`
}

export function newSavedTournamentId(): string {
  return `lib-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function savedTournament(
  fields: Partial<SavedTournament> & { name: string },
  id: string = newSavedTournamentId(),
): SavedTournament {
  const positive = (value: unknown) => {
    const n = Number(value)
    return Number.isFinite(n) && n > 0 ? n : 0
  }
  return {
    id,
    name: fields.name.trim() || 'Untitled',
    site: (fields.site ?? '').trim(),
    buyIn: positive(fields.buyIn),
    fee: positive(fields.fee),
    played: Math.max(0, Math.floor(Number(fields.played) || 0)),
    lastPlayed: typeof fields.lastPlayed === 'string' ? fields.lastPlayed : null,
  }
}

/** Stored records are untrusted, so every field is checked on the way back. */
export function parseStoredLibrary(raw: unknown): SavedTournament[] {
  if (!Array.isArray(raw)) return []
  const out: SavedTournament[] = []
  for (const record of raw) {
    if (typeof record !== 'object' || record === null || Array.isArray(record)) continue
    const item = record as Record<string, unknown>
    if (typeof item.id !== 'string' || !item.id) continue
    if (typeof item.name !== 'string' || !item.name.trim()) continue
    out.push(savedTournament(item as Partial<SavedTournament> & { name: string }, item.id))
  }
  return out
}

/**
 * Most played first, then most recent, then by name.
 *
 * What you play most is what you are most likely to be logging, and should
 * be the shortest reach. Alphabetical would put the tournament you played
 * once in 2024 above the one you play every night.
 */
export function sortLibrary(library: readonly SavedTournament[]): SavedTournament[] {
  return [...library].sort(
    (a, b) =>
      b.played - a.played ||
      (b.lastPlayed ?? '').localeCompare(a.lastPlayed ?? '') ||
      a.name.localeCompare(b.name),
  )
}

export function findSaved(
  library: readonly SavedTournament[],
  name: string,
  site: string,
): SavedTournament | undefined {
  const key = tournamentKey(name, site)
  return library.find((item) => tournamentKey(item.name, item.site) === key)
}

/**
 * Fold a logged result back into the library.
 *
 * Logging a tournament is the strongest evidence that it belongs in the list,
 * so the library learns from the log rather than having to be curated beside
 * it. A tournament already there has its count and its price brought up to
 * date, because the entry just logged is the better record of what it costs.
 */
export function recordPlay(
  library: readonly SavedTournament[],
  entry: Pick<Entry, 'name' | 'site' | 'buyIn' | 'fee' | 'date'>,
): SavedTournament[] {
  const existing = findSaved(library, entry.name, entry.site)
  if (!existing) {
    return [
      ...library,
      savedTournament({
        name: entry.name,
        site: entry.site,
        buyIn: entry.buyIn,
        fee: entry.fee,
        played: 1,
        lastPlayed: entry.date,
      }),
    ]
  }
  return library.map((item) =>
    item.id === existing.id
      ? {
          ...item,
          buyIn: entry.buyIn > 0 ? entry.buyIn : item.buyIn,
          fee: entry.fee > 0 ? entry.fee : item.fee,
          played: item.played + 1,
          lastPlayed:
            item.lastPlayed === null || entry.date > item.lastPlayed ? entry.date : item.lastPlayed,
        }
      : item,
  )
}

/**
 * Build a library out of a log that already exists.
 *
 * Nobody should have to type in thirty tournaments they have already logged a
 * hundred results for, so a first run reads the list out of the history.
 */
export function libraryFromEntries(entries: readonly Entry[]): SavedTournament[] {
  let library: SavedTournament[] = []
  for (const entry of entries) {
    if (!entry.name.trim() || entry.name.trim() === 'Untitled') continue
    library = recordPlay(library, entry)
  }
  return sortLibrary(library)
}

/** Drop one, by id. */
export function removeSaved(
  library: readonly SavedTournament[],
  id: string,
): SavedTournament[] {
  return library.filter((item) => item.id !== id)
}
