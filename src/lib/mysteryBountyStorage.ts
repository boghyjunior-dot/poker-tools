import type { BountyTier } from './mysteryBounty'

export const STORAGE_KEY = 'poker-tools:mystery-bounty'

/** Every field the page holds, kept as strings so a half-typed number survives. */
export type BountyForm = Record<string, string>

export interface SavedTournament {
  id: string
  name: string
  savedAt: string
  form: BountyForm
  /** The drum as it stands: envelopes still in it, by value. */
  tiers: BountyTier[]
}

export interface BountyState {
  /** What is on screen now. */
  active: SavedTournament | null
  saved: SavedTournament[]
}

export function emptyState(): BountyState {
  return { active: null, saved: [] }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function cleanForm(raw: unknown): BountyForm {
  const out: BountyForm = {}
  if (!isRecord(raw)) return out
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string') out[key] = value
    else if (typeof value === 'number' && Number.isFinite(value)) out[key] = String(value)
  }
  return out
}

function cleanTierList(raw: unknown): BountyTier[] {
  if (!Array.isArray(raw)) return []
  const tiers: BountyTier[] = []
  for (const entry of raw) {
    if (!isRecord(entry)) continue
    const value = Number(entry.value)
    const count = Number(entry.count)
    if (!Number.isFinite(value) || !Number.isFinite(count)) continue
    if (value <= 0 || count <= 0) continue
    tiers.push({ value, count })
  }
  return tiers
}

function cleanTournament(raw: unknown): SavedTournament | null {
  if (!isRecord(raw)) return null
  const id = typeof raw.id === 'string' ? raw.id : null
  if (!id) return null
  return {
    id,
    name: typeof raw.name === 'string' && raw.name.trim() !== '' ? raw.name : 'Untitled event',
    savedAt: typeof raw.savedAt === 'string' ? raw.savedAt : new Date().toISOString(),
    form: cleanForm(raw.form),
    tiers: cleanTierList(raw.tiers),
  }
}

export function parseState(raw: unknown): BountyState {
  const state = emptyState()
  if (!isRecord(raw)) return state
  state.active = cleanTournament(raw.active)
  if (Array.isArray(raw.saved)) {
    state.saved = raw.saved
      .map(cleanTournament)
      .filter((t): t is SavedTournament => t !== null)
      .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
  }
  return state
}

export function loadState(): BountyState {
  if (typeof localStorage === 'undefined') return emptyState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyState()
    return parseState(JSON.parse(raw))
  } catch {
    return emptyState()
  }
}

export function saveState(state: BountyState): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Private mode or quota — the session still works, it just will not persist.
  }
}

export function newTournamentId(): string {
  return `mb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}
