export type Position = 'utg' | 'utg1' | 'lj' | 'hj' | 'co' | 'btn' | 'sb' | 'bb'

/**
 * Where the numbers come from, so the tool can show its working instead of
 * grading you against an anonymous baseline.
 */
export const BASELINE = {
  name: 'Online MTT · 100bb-ish, mid stakes',
  note: 'Ranges are a healthy band for reg-infested online MTTs, not solver output. Wide fields and shallow stacks shift several of these — edit any target you disagree with.',
} as const

/** Explicit healthy [min, max] % ranges per position for core stats. */
export const POSITION_RANGES: Record<string, Partial<Record<Position, [number, number]>>> = {
  raiseFirst: {
    utg: [16, 20],
    utg1: [18, 22],
    lj: [21, 24],
    hj: [24, 27],
    co: [35, 38],
    btn: [47, 55],
    sb: [25, 30],
  },
  limpOpen: { sb: [55, 65] },
  limpRaise: { sb: [10, 14] },
  limpCall: { sb: [45, 55] },
  limpFold: { sb: [35, 45] },
  raiseSbOpenLimp: { bb: [40, 45] },
  foldBbVsSb: { bb: [35, 45] },
  foldToSteal: { bb: [30, 35], sb: [70, 75] },
  callPf2Bet: {
    utg: [3, 6],
    utg1: [3, 6],
    lj: [4, 7],
    hj: [4, 7],
    co: [6, 9],
    btn: [9, 13],
    sb: [10, 14],
    bb: [45, 55],
  },
  threeBetPf: {
    utg: [5, 7],
    utg1: [5, 7],
    lj: [6, 8],
    hj: [6, 8],
    co: [7, 10],
    btn: [8, 12],
    sb: [10, 14],
    bb: [9, 13],
  },
  threeBetSteal: { bb: [16, 19], sb: [16, 19] },
  threeBetNaiLt35: {
    utg: [3, 6],
    utg1: [3, 6],
    lj: [3, 6],
    hj: [3, 6],
    co: [3, 6],
    btn: [3, 6],
    sb: [5, 8],
    bb: [5, 8],
  },
  twoBetPfAndFold: {
    utg: [45, 55],
    utg1: [45, 55],
    lj: [45, 55],
    hj: [45, 55],
    co: [47, 55],
    btn: [50, 57],
    sb: [45, 55],
    bb: [45, 55],
  },
  cbetFIpHu: {
    utg: [80, 90],
    utg1: [80, 90],
    lj: [75, 85],
    hj: [75, 85],
    co: [75, 85],
    btn: [70, 80],
    bb: [55, 65],
  },
  floatFHu: {
    utg: [45, 55],
    utg1: [45, 55],
    lj: [45, 55],
    hj: [45, 55],
    co: [45, 55],
    btn: [45, 55],
    bb: [40, 50],
  },
  foldToFCbetHu: {
    utg: [33, 38],
    utg1: [33, 38],
    lj: [33, 38],
    hj: [33, 38],
    co: [28, 35],
    btn: [27, 33],
    sb: [33, 38],
    bb: [40, 45],
  },
}

/** Single target % per position for remaining stats (compared as target ± tolerance). */
export const POSITION_TARGETS: Record<string, Partial<Record<Position, number>>> = {
  threeBetPfAndFold: { utg: 40, utg1: 40, lj: 40, hj: 40, co: 40, btn: 38, sb: 38, bb: 38 },
  pfSqueeze: { utg: 3, utg1: 3, lj: 3.5, hj: 3.5, co: 4, btn: 5, sb: 6, bb: 7 },
  cbetFOopHu: { utg: 52, utg1: 52, lj: 52, hj: 52, co: 53, btn: 55, sb: 50, bb: 48 },
  foldToFCbet3B: { utg: 52, utg1: 52, lj: 52, hj: 52, co: 53, btn: 54, sb: 53, bb: 55 },
  cbetFAndFoldHu: { utg: 45, utg1: 45, lj: 45, hj: 45, co: 45, btn: 45, sb: 45, bb: 45 },
  raiseFCbetHu: { utg: 12, utg1: 12, lj: 12, hj: 12, co: 12, btn: 12, sb: 12, bb: 12 },
  xrFlopHu: { utg: 8, utg1: 8, lj: 8, hj: 8, co: 9, btn: 9, sb: 10, bb: 11 },
  cbetTHu: { utg: 48, utg1: 48, lj: 48, hj: 48, co: 50, btn: 50, sb: 47, bb: 46 },
  probeTHu: { utg: 45, utg1: 45, lj: 45, hj: 45, co: 45, btn: 46, sb: 45, bb: 44 },
  foldToTCbet: { utg: 48, utg1: 48, lj: 48, hj: 48, co: 48, btn: 48, sb: 48, bb: 48 },
  cbetR: { utg: 45, utg1: 45, lj: 45, hj: 45, co: 46, btn: 46, sb: 44, bb: 43 },
  foldToRCbet: { utg: 48, utg1: 48, lj: 48, hj: 48, co: 48, btn: 48, sb: 48, bb: 48 },
  vpip: { utg: 15, utg1: 16, lj: 17, hj: 18, co: 26, btn: 46, sb: 42, bb: 48 },
}

const DEFAULT_TOLERANCE = 2
const ZERO_TARGET_TOLERANCE = 0.5

/**
 * Per-stat overrides layered on top of the bundled tables.
 *
 * The tool ships one opinion about what "healthy" means; this is how a user
 * disagrees with it. Set by the targets editor and persisted with the session.
 */
export interface TargetOverride {
  /** Explicit [min, max] band. */
  range?: [number, number]
  /** Single target compared as target ± tolerance. */
  target?: number
}

export type TargetOverrides = Record<string, Partial<Record<Position | 'all', TargetOverride>>>

let overrides: TargetOverrides = {}

export function setTargetOverrides(next: TargetOverrides): void {
  overrides = next ?? {}
}

export function getTargetOverrides(): TargetOverrides {
  return overrides
}

function overrideFor(defId: string, position?: Position): TargetOverride | null {
  const forStat = overrides[defId]
  if (!forStat) return null
  if (position && forStat[position]) return forStat[position]!
  return forStat.all ?? null
}

export function getPositionRange(defId: string, position?: Position): [number, number] | null {
  const override = overrideFor(defId, position)
  if (override?.range) return override.range

  const ranges = POSITION_RANGES[defId]
  if (!ranges) return null
  if (position) {
    const range = ranges[position]
    return range ?? null
  }
  const entries = Object.values(ranges)
  if (entries.length === 0) return null
  const min = entries.reduce((sum, [lo]) => sum + lo, 0) / entries.length
  const max = entries.reduce((sum, [, hi]) => sum + hi, 0) / entries.length
  return [Math.round(min * 100) / 100, Math.round(max * 100) / 100]
}

export function getStatTarget(defId: string, position?: Position): number | null {
  const override = overrideFor(defId, position)
  if (override?.target !== undefined) return override.target
  if (override?.range) return null

  const targets = POSITION_TARGETS[defId]
  if (!targets) return null
  if (position) {
    const value = targets[position]
    return value === undefined ? null : value
  }
  const values = Object.values(targets)
  if (values.length === 0) return null
  return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 100) / 100
}

export function getTargetTolerance(_defId: string, target: number, unit: '%' | 'bb100' | 'ratio'): number {
  if (unit === 'bb100') return 2
  if (unit === 'ratio') return 0.4
  if (target === 0) return ZERO_TARGET_TOLERANCE
  return DEFAULT_TOLERANCE
}

export function statHasTargets(defId: string): boolean {
  return defId in POSITION_RANGES || defId in POSITION_TARGETS || defId in overrides
}

export function statAppliesToPosition(defId: string, position: Position): boolean {
  const forStat = overrides[defId]
  if (forStat?.[position] || forStat?.all) return true
  if (POSITION_RANGES[defId]?.[position] !== undefined) return true
  return POSITION_TARGETS[defId]?.[position] !== undefined
}
