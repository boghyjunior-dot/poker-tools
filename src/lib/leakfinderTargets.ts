type Position = 'ep' | 'mp' | 'co' | 'btn' | 'sb' | 'bb'

/** Explicit healthy [min, max] % ranges per position for core stats. */
export const POSITION_RANGES: Record<string, Partial<Record<Position, [number, number]>>> = {
  raiseFirst: {
    btn: [47, 55],
    co: [35, 38],
    mp: [24, 27],
    ep: [16, 20],
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
    btn: [9, 13],
    co: [6, 9],
    mp: [4, 7],
    ep: [3, 6],
    bb: [45, 55],
    sb: [10, 14],
  },
  threeBetPf: {
    btn: [8, 12],
    co: [7, 10],
    mp: [6, 8],
    ep: [5, 7],
    bb: [9, 13],
    sb: [10, 14],
  },
  threeBetSteal: { bb: [16, 19], sb: [16, 19] },
  threeBetNaiLt35: {
    btn: [3, 6],
    co: [3, 6],
    mp: [3, 6],
    ep: [3, 6],
    bb: [5, 8],
    sb: [5, 8],
  },
  twoBetPfAndFold: {
    btn: [50, 57],
    co: [47, 55],
    mp: [45, 55],
    ep: [45, 55],
    bb: [45, 55],
    sb: [45, 55],
  },
  cbetFIpHu: {
    btn: [70, 80],
    co: [75, 85],
    mp: [75, 85],
    ep: [80, 90],
    bb: [55, 65],
  },
  floatFHu: {
    btn: [45, 55],
    co: [45, 55],
    mp: [45, 55],
    ep: [45, 55],
    bb: [40, 50],
  },
  foldToFCbetHu: {
    btn: [27, 33],
    co: [28, 35],
    mp: [33, 38],
    ep: [33, 38],
    bb: [40, 45],
    sb: [33, 38],
  },
}

/** Single target % per position for remaining stats (compared as target ± tolerance). */
export const POSITION_TARGETS: Record<string, Partial<Record<Position, number>>> = {
  threeBetPfAndFold: { ep: 40, mp: 40, co: 40, btn: 38, sb: 38, bb: 38 },
  pfSqueeze: { ep: 3, mp: 3.5, co: 4, btn: 5, sb: 6, bb: 7 },
  cbetFOopHu: { ep: 52, mp: 52, co: 53, btn: 55, sb: 50, bb: 48 },
  foldToFCbet3B: { ep: 52, mp: 52, co: 53, btn: 54, sb: 53, bb: 55 },
  cbetFAndFoldHu: { ep: 45, mp: 45, co: 45, btn: 45, sb: 45, bb: 45 },
  raiseFCbetHu: { ep: 12, mp: 12, co: 12, btn: 12, sb: 12, bb: 12 },
  xrFlopHu: { ep: 8, mp: 8, co: 9, btn: 9, sb: 10, bb: 11 },
  cbetTHu: { ep: 48, mp: 48, co: 50, btn: 50, sb: 47, bb: 46 },
  probeTHu: { ep: 45, mp: 45, co: 45, btn: 46, sb: 45, bb: 44 },
  foldToTCbet: { ep: 48, mp: 48, co: 48, btn: 48, sb: 48, bb: 48 },
  cbetR: { ep: 45, mp: 45, co: 46, btn: 46, sb: 44, bb: 43 },
  foldToRCbet: { ep: 48, mp: 48, co: 48, btn: 48, sb: 48, bb: 48 },
  vpip: { ep: 15, mp: 18, co: 26, btn: 46, sb: 42, bb: 48 },
}

const DEFAULT_TOLERANCE = 2
const ZERO_TARGET_TOLERANCE = 0.5

export function getPositionRange(defId: string, position?: Position): [number, number] | null {
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

export function getTargetTolerance(_defId: string, target: number, unit: '%' | 'bb100'): number {
  if (unit === 'bb100') return 2
  if (target === 0) return ZERO_TARGET_TOLERANCE
  return DEFAULT_TOLERANCE
}

export function statHasTargets(defId: string): boolean {
  return defId in POSITION_RANGES || defId in POSITION_TARGETS
}

export function statAppliesToPosition(defId: string, position: Position): boolean {
  if (POSITION_RANGES[defId]?.[position] !== undefined) return true
  return POSITION_TARGETS[defId]?.[position] !== undefined
}
