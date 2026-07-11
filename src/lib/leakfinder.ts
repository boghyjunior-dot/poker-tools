import { STAT_DEFINITIONS, type StatCategory, type StatDefinition } from './leakfinderStats'
import {
  getPositionRange,
  getStatTarget,
  getTargetTolerance,
  statAppliesToPosition,
  statHasTargets,
} from './leakfinderTargets'

export type { StatCategory, StatDefinition }
export { STAT_DEFINITIONS }

export type Severity = 'ok' | 'minor' | 'moderate' | 'major'

export type RelevanceLevel = 'insufficient' | 'low' | 'medium' | 'high'

/** @deprecated Use RelevanceLevel */
export type ConfidenceLevel = RelevanceLevel

export const POSITION_ONLY: Position[] = ['ep', 'mp', 'co', 'btn', 'sb', 'bb']

export type Position = 'ep' | 'mp' | 'co' | 'btn' | 'sb' | 'bb'

export type PositionKey = 'overall' | Position

export const POSITION_KEYS: PositionKey[] = ['overall', 'ep', 'mp', 'co', 'btn', 'sb', 'bb']

export const POSITION_LABELS: Record<PositionKey, string> = {
  overall: 'Overall',
  ep: 'Early (UTG)',
  mp: 'Middle (MP/HJ)',
  co: 'Cutoff',
  btn: 'Button',
  sb: 'Small Blind',
  bb: 'Big Blind',
}

const POSITION_ALIASES: Record<PositionKey, string[]> = {
  overall: ['all', 'allpositions', 'total', 'overall', 'summary'],
  ep: ['utg', 'utg1', 'utg2', 'ep', 'ep1', 'ep2', 'early', 'earlyposition'],
  mp: ['mp', 'mp1', 'mp2', 'mp3', 'hj', 'hijack', 'lj', 'lojack', 'middle', 'middleposition'],
  co: ['co', 'cutoff'],
  btn: ['btn', 'bu', 'button'],
  sb: ['sb', 'smallblind'],
  bb: ['bb', 'bigblind'],
}

export { getPositionRange, getStatTarget, POSITION_RANGES, POSITION_TARGETS } from './leakfinderTargets'

export function statAppliesTo(defId: string, key: PositionKey): boolean {
  if (statHasTargets(defId)) {
    if (key === 'overall') return true
    return statAppliesToPosition(defId, key)
  }
  // Winrate and other stats without position targets: overall only
  return key === 'overall'
}

export function getStatRange(def: StatDefinition, position?: Position): [number, number] {
  const explicit = getPositionRange(def.id, position)
  if (explicit) return explicit
  const target = getStatTarget(def.id, position)
  if (target !== null) {
    const tol = getTargetTolerance(def.id, target, def.unit)
    const min = Math.max(0, Math.round((target - tol) * 100) / 100)
    const max = Math.round((target + tol) * 100) / 100
    return [min, max]
  }
  return def.range
}

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9$]/g, '')
}

export function matchPosition(cell: string): PositionKey | null {
  const normalized = normalizeToken(cell)
  if (!normalized) return null
  for (const key of POSITION_KEYS) {
    if (POSITION_ALIASES[key].includes(normalized)) return key
  }
  return null
}

const IGNORED_COLUMN_TOKENS = new Set(['position', 'pos', 'seat', 'hands', 'handcount'])

function isIgnoredColumn(header: string): boolean {
  const normalized = normalizeToken(header)
  if (!normalized) return true
  if (IGNORED_COLUMN_TOKENS.has(normalized)) return true
  return normalized.endsWith('count')
}

function matchCountColumn(header: string): StatDefinition | null {
  const normalized = normalizeToken(header)
  if (!normalized.endsWith('count')) return null
  const statToken = normalized.slice(0, -'count'.length)
  if (!statToken) return null
  let best: StatDefinition | null = null
  let bestLen = 0
  for (const def of STAT_DEFINITIONS) {
    for (const alias of def.aliases) {
      const aliasNorm = normalizeToken(alias)
      if (aliasNorm === statToken && aliasNorm.length > bestLen) {
        best = def
        bestLen = aliasNorm.length
      }
    }
  }
  return best
}

function isHandsColumn(header: string): boolean {
  const normalized = normalizeToken(header)
  return normalized === 'hands' || normalized === 'handcount'
}

export function relevanceFromHands(hands: number): RelevanceLevel {
  if (hands < 5_000) return 'insufficient'
  if (hands < 20_000) return 'low'
  if (hands < 75_000) return 'medium'
  return 'high'
}

export function relevanceLabel(level: RelevanceLevel): string {
  switch (level) {
    case 'insufficient':
      return 'Not enough data'
    case 'low':
      return 'Low relevance'
    case 'medium':
      return 'Moderately relevant'
    case 'high':
      return 'Highly relevant'
  }
}

/** @deprecated Use relevanceFromHands */
export const confidenceFromHands = relevanceFromHands

/** @deprecated Use relevanceLabel */
export const confidenceLabel = relevanceLabel

export function enrichOverallFromPositions(
  positions: Partial<Record<PositionKey, Record<string, number>>>,
  hands: Partial<Record<PositionKey, number>>,
): boolean {
  let totalHands = 0
  let weightedWinrate = 0
  let hasWinrate = false

  for (const pos of POSITION_ONLY) {
    const h = hands[pos]
    const wr = positions[pos]?.allInAdjBb100
    if (h && h > 0 && wr !== undefined) {
      totalHands += h
      weightedWinrate += h * wr
      hasWinrate = true
    }
  }

  if (!hasWinrate || totalHands <= 0) return false

  if (!hands.overall) {
    hands.overall = POSITION_ONLY.reduce((sum, pos) => sum + (hands[pos] ?? 0), 0)
  }

  if (positions.overall?.allInAdjBb100 !== undefined) return false

  positions.overall = {
    ...positions.overall,
    allInAdjBb100: Math.round((weightedWinrate / totalHands) * 100) / 100,
  }
  return true
}

function matchStatColumn(header: string): StatDefinition | null {
  if (isIgnoredColumn(header)) return null
  const normalized = normalizeToken(header)
  let best: StatDefinition | null = null
  let bestLen = 0
  for (const def of STAT_DEFINITIONS) {
    for (const alias of def.aliases) {
      const aliasNorm = normalizeToken(alias)
      if (aliasNorm === normalized && aliasNorm.length > bestLen) {
        best = def
        bestLen = aliasNorm.length
      }
    }
  }
  return best
}

function cleanCell(cell: string): string {
  return cell.trim().replace(/^"(.*)"$/s, '$1').trim()
}

export function parseNumber(raw: string): number | null {
  let cleaned = cleanCell(raw).replace(/%/g, '').trim()
  if (cleaned === '' || cleaned === '-') return null

  if (/,/.test(cleaned)) {
    const hasDecimalPoint = cleaned.includes('.')
    const looksLikeThousands = /,\d{3}(?:,|\.|$)/.test(cleaned)
    if (hasDecimalPoint || looksLikeThousands) {
      cleaned = cleaned.replace(/,/g, '')
    } else {
      cleaned = cleaned.replace(',', '.')
    }
  }

  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function splitLine(line: string, delimiter: string): string[] {
  if (delimiter === '\t') return line.split('\t').map(cleanCell)
  const cells: string[] = []
  let current = ''
  let inQuotes = false
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === delimiter && !inQuotes) {
      cells.push(cleanCell(current))
      current = ''
    } else {
      current += char
    }
  }
  cells.push(cleanCell(current))
  return cells
}

function detectDelimiter(line: string): string {
  if (line.includes('\t')) return '\t'
  if ((line.match(/;/g)?.length ?? 0) >= 2) return ';'
  return ','
}

export interface ParsedStats {
  values: Record<string, number>
  matched: number
}

/** Parse a flat pasted stats report ("VPIP: 24.5" style lines). */
export function parseStatsReport(text: string): ParsedStats {
  const values: Record<string, number> = {}
  let working = text

  const entries = STAT_DEFINITIONS.flatMap((def) =>
    def.aliases.map((alias) => ({ def, alias })),
  ).sort((a, b) => b.alias.length - a.alias.length)

  for (const { def, alias } of entries) {
    if (def.id in values) continue
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`${escaped}\\s*[:=]?\\s*(-?\\d+(?:[.,]\\d+)?)\\s*%?`, 'i')
    const match = working.match(regex)
    if (match) {
      const value = parseNumber(match[1])
      if (value !== null) {
        values[def.id] = value
        working = working.replace(match[0], ' '.repeat(match[0].length))
      }
    }
  }

  return { values, matched: Object.keys(values).length }
}

export interface PositionalParse {
  positions: Partial<Record<PositionKey, Record<string, number>>>
  hands: Partial<Record<PositionKey, number>>
  opportunities: Partial<Record<PositionKey, Record<string, number>>>
  matched: number
  isTable: boolean
  weightedOverallWinrate: boolean
}

/**
 * Parse a PT4/HM-style positional export: a delimited table with a header row of
 * stat names and one row per position (UTG, MP, CO, BTN, SB, BB, All).
 * Rows mapping to the same position group (e.g. UTG and UTG+1) are averaged.
 */
export function parsePositionalReport(text: string): PositionalParse {
  const normalizedText = text.replace(/^\uFEFF/, '')
  const lines = normalizedText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l !== '')
  if (lines.length < 2) {
    return { positions: {}, hands: {}, opportunities: {}, matched: 0, isTable: false, weightedOverallWinrate: false }
  }

  let headerIndex = -1
  let delimiter = ','
  let columnMap: (StatDefinition | null)[] = []
  let countColumnMap: (StatDefinition | null)[] = []
  let positionColumn = 0
  let handsColumn = -1

  for (let i = 0; i < lines.length; i++) {
    const delim = detectDelimiter(lines[i])
    const cells = splitLine(lines[i], delim)
    if (cells.length < 3) continue
    const map = cells.map((cell) => matchStatColumn(cell))
    const statCount = map.filter(Boolean).length
    if (statCount >= 2) {
      headerIndex = i
      delimiter = delim
      columnMap = map
      countColumnMap = cells.map((cell) => matchCountColumn(cell))
      const posIdx = cells.findIndex((cell) =>
        ['position', 'pos', 'seat'].includes(normalizeToken(cell)),
      )
      positionColumn = posIdx >= 0 ? posIdx : 0
      handsColumn = cells.findIndex((cell) => isHandsColumn(cell))
      break
    }
  }

  if (headerIndex < 0) {
    return { positions: {}, hands: {}, opportunities: {}, matched: 0, isTable: false, weightedOverallWinrate: false }
  }

  const sums: Partial<Record<PositionKey, Record<string, { total: number; count: number }>>> = {}
  const hands: Partial<Record<PositionKey, number>> = {}
  const opportunities: Partial<Record<PositionKey, Record<string, number>>> = {}

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const cells = splitLine(lines[i], delimiter)
    const position = matchPosition(cells[positionColumn] ?? '')
    if (!position) continue

    if (handsColumn >= 0) {
      const handCount = parseNumber(cells[handsColumn] ?? '')
      if (handCount !== null && handCount > 0) {
        hands[position] = (hands[position] ?? 0) + handCount
      }
    }

    const bucket = (sums[position] ??= {})
    const oppBucket = (opportunities[position] ??= {})

    for (let col = 0; col < cells.length; col++) {
      if (col === positionColumn || col === handsColumn) continue

      const countDef = countColumnMap[col]
      if (countDef) {
        const opp = parseNumber(cells[col])
        if (opp !== null && opp > 0) {
          oppBucket[countDef.id] = (oppBucket[countDef.id] ?? 0) + opp
        }
        continue
      }

      const def = columnMap[col]
      if (!def) continue
      const value = parseNumber(cells[col])
      if (value === null) continue
      const acc = (bucket[def.id] ??= { total: 0, count: 0 })
      acc.total += value
      acc.count += 1
    }
  }

  const positions: Partial<Record<PositionKey, Record<string, number>>> = {}
  let matched = 0
  for (const [key, bucket] of Object.entries(sums) as [PositionKey, Record<string, { total: number; count: number }>][]) {
    const values: Record<string, number> = {}
    for (const [statId, acc] of Object.entries(bucket)) {
      values[statId] = Math.round((acc.total / acc.count) * 100) / 100
      matched += 1
    }
    if (Object.keys(values).length > 0) positions[key] = values
  }

  const weightedOverallWinrate = enrichOverallFromPositions(positions, hands)

  return { positions, hands, opportunities, matched, isTable: true, weightedOverallWinrate }
}

export interface StatResult {
  def: StatDefinition
  value: number
  range: [number, number]
  severity: Severity
  direction: 'low' | 'high' | 'ok'
  advice: string
  relevance: RelevanceLevel
  hands?: number
  relevanceNote?: string
}

export interface AnalysisContext {
  hands?: number
}

function buildRelevance(
  context?: AnalysisContext,
): Pick<StatResult, 'relevance' | 'hands' | 'relevanceNote'> {
  const handCount = context?.hands ?? 0
  if (handCount <= 0) {
    return {
      relevance: 'insufficient',
      relevanceNote: 'Hand count unknown — treat as directional only.',
    }
  }

  const relevance = relevanceFromHands(handCount)
  return {
    relevance,
    hands: handCount,
    relevanceNote: `${handCount.toLocaleString()} hands · ${relevanceLabel(relevance).toLowerCase()}`,
  }
}

function severityFromDeviation(def: StatDefinition, deviation: number): Severity {
  const scale = def.unit === 'bb100' ? 2 : 1
  if (deviation <= 0) return 'ok'
  if (deviation < 2 * scale) return 'minor'
  if (deviation < 5 * scale) return 'moderate'
  return 'major'
}

export function evaluateStat(
  def: StatDefinition,
  value: number,
  position?: Position,
  context?: AnalysisContext,
): StatResult {
  const range = getStatRange(def, position)
  const [min, max] = range
  const relevanceMeta = buildRelevance(context)
  if (value < min) {
    const severity = severityFromDeviation(def, min - value)
    return {
      def,
      value,
      range,
      severity,
      direction: 'low',
      advice: def.lowAdvice,
      ...relevanceMeta,
    }
  }
  if (value > max) {
    const severity = severityFromDeviation(def, value - max)
    return {
      def,
      value,
      range,
      severity,
      direction: 'high',
      advice: def.highAdvice,
      ...relevanceMeta,
    }
  }
  return {
    def,
    value,
    range,
    severity: 'ok',
    direction: 'ok',
    advice: 'Within the healthy range.',
    ...relevanceMeta,
  }
}

export interface LeakReport {
  results: StatResult[]
  leaks: StatResult[]
  score: number
}

export function analyzeStats(
  values: Record<string, number>,
  position?: Position,
  context?: AnalysisContext,
): LeakReport {
  const key: PositionKey = position ?? 'overall'
  const results: StatResult[] = []
  for (const def of STAT_DEFINITIONS) {
    if (!statAppliesTo(def.id, key)) continue
    const value = values[def.id]
    if (value === undefined || !Number.isFinite(value)) continue
    results.push(evaluateStat(def, value, position, context))
  }

  const leaks = results
    .filter((r) => r.severity !== 'ok')
    .sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity))

  const penalty = results.reduce((sum, r) => sum + severityWeight(r.severity), 0)
  const maxPenalty = results.length * 3
  const score = results.length === 0 ? 0 : Math.round(100 - (penalty / maxPenalty) * 100)

  return { results, leaks, score }
}

export function severityWeight(severity: Severity): number {
  switch (severity) {
    case 'ok':
      return 0
    case 'minor':
      return 1
    case 'moderate':
      return 2
    case 'major':
      return 3
  }
}

export const CATEGORY_LABELS: Record<StatCategory, string> = {
  preflop: 'Preflop',
  postflop: 'Postflop',
  showdown: 'Winrate',
}

export function formatStatUnit(unit: StatDefinition['unit']): string {
  if (unit === '%') return '%'
  if (unit === 'bb100') return ' bb/100'
  return ''
}
