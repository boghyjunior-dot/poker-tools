import {
  POSITION_KEYS,
  type PositionKey,
} from './leakfinder'
import type { TargetOverrides } from './leakfinderTargets'

export const STORAGE_KEY = 'poker-tools:leakfinder'

export type ValuesByPosition = Partial<Record<PositionKey, Record<string, number>>>
export type HandsByPosition = Partial<Record<PositionKey, number>>
export type OpportunitiesByPosition = Partial<Record<PositionKey, Record<string, number>>>

/** One imported report, frozen so it can be compared with a later one. */
export interface Snapshot {
  id: string
  label: string
  /** ISO timestamp. */
  savedAt: string
  values: ValuesByPosition
  hands: HandsByPosition
  opportunities: OpportunitiesByPosition
  /** Score at save time, so the history reads without re-running the analysis. */
  score?: number
}

export interface LeakFinderState {
  /** What is currently in the editor. */
  current: {
    values: ValuesByPosition
    hands: HandsByPosition
    opportunities: OpportunitiesByPosition
  }
  snapshots: Snapshot[]
  overrides: TargetOverrides
}

export function emptyState(): LeakFinderState {
  return {
    current: { values: {}, hands: {}, opportunities: {} },
    snapshots: [],
    overrides: {},
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Keep only known positions and finite numbers — stored JSON is untrusted. */
function cleanValues(raw: unknown): ValuesByPosition {
  const out: ValuesByPosition = {}
  if (!isRecord(raw)) return out
  for (const key of POSITION_KEYS) {
    const bucket = raw[key]
    if (!isRecord(bucket)) continue
    const clean: Record<string, number> = {}
    for (const [id, value] of Object.entries(bucket)) {
      const n = typeof value === 'string' ? Number(value.replace(',', '.')) : value
      if (typeof n === 'number' && Number.isFinite(n)) clean[id] = n
    }
    if (Object.keys(clean).length > 0) out[key] = clean
  }
  return out
}

function cleanHands(raw: unknown): HandsByPosition {
  const out: HandsByPosition = {}
  if (!isRecord(raw)) return out
  for (const key of POSITION_KEYS) {
    const value = raw[key]
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) out[key] = value
  }
  return out
}

function cleanSnapshot(raw: unknown): Snapshot | null {
  if (!isRecord(raw)) return null
  const id = typeof raw.id === 'string' ? raw.id : null
  if (!id) return null
  return {
    id,
    label: typeof raw.label === 'string' ? raw.label : 'Snapshot',
    savedAt: typeof raw.savedAt === 'string' ? raw.savedAt : new Date().toISOString(),
    values: cleanValues(raw.values),
    hands: cleanHands(raw.hands),
    opportunities: cleanValues(raw.opportunities),
    score: typeof raw.score === 'number' && Number.isFinite(raw.score) ? raw.score : undefined,
  }
}

export function parseState(raw: unknown): LeakFinderState {
  const state = emptyState()
  if (!isRecord(raw)) return state
  if (isRecord(raw.current)) {
    state.current = {
      values: cleanValues(raw.current.values),
      hands: cleanHands(raw.current.hands),
      opportunities: cleanValues(raw.current.opportunities),
    }
  }
  if (Array.isArray(raw.snapshots)) {
    state.snapshots = raw.snapshots
      .map(cleanSnapshot)
      .filter((s): s is Snapshot => s !== null)
      .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
  }
  if (isRecord(raw.overrides)) state.overrides = raw.overrides as TargetOverrides
  return state
}

export function loadState(): LeakFinderState {
  if (typeof localStorage === 'undefined') return emptyState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyState()
    return parseState(JSON.parse(raw))
  } catch {
    return emptyState()
  }
}

export function saveState(state: LeakFinderState): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Private-mode or quota — the session still works, it just will not persist.
  }
}

export function newSnapshotId(): string {
  return `snap-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export interface StatDelta {
  statId: string
  positionKey: PositionKey
  before: number
  after: number
  change: number
}

export interface SnapshotDiff {
  /** Stats that exist in both, sorted by how much they moved. */
  changed: StatDelta[]
  added: number
  removed: number
}

/**
 * What moved between two imports.
 *
 * The point of saving snapshots is answering "is the thing I worked on last
 * month actually better now?", which needs a before and an after side by side.
 */
export function diffSnapshots(
  before: { values: ValuesByPosition },
  after: { values: ValuesByPosition },
): SnapshotDiff {
  const changed: StatDelta[] = []
  let added = 0
  let removed = 0

  for (const key of POSITION_KEYS) {
    const beforeBucket = before.values[key] ?? {}
    const afterBucket = after.values[key] ?? {}
    const ids = new Set([...Object.keys(beforeBucket), ...Object.keys(afterBucket)])
    for (const statId of ids) {
      const b = beforeBucket[statId]
      const a = afterBucket[statId]
      if (b === undefined && a !== undefined) {
        added += 1
        continue
      }
      if (b !== undefined && a === undefined) {
        removed += 1
        continue
      }
      if (b === undefined || a === undefined) continue
      const change = Math.round((a - b) * 100) / 100
      if (change === 0) continue
      changed.push({ statId, positionKey: key, before: b, after: a, change })
    }
  }

  changed.sort((x, y) => Math.abs(y.change) - Math.abs(x.change))
  return { changed, added, removed }
}
