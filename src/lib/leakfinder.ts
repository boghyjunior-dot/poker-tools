import { STAT_DEFINITIONS, type StatCategory, type StatDefinition } from './leakfinderStats'
import {
  getPositionRange,
  getStatTarget,
  getTargetTolerance,
  statAppliesToPosition,
  statHasTargets,
  type Position,
} from './leakfinderTargets'

export type { StatCategory, StatDefinition }
export { STAT_DEFINITIONS }

export type Severity = 'ok' | 'minor' | 'moderate' | 'major'

export type RelevanceLevel = 'insufficient' | 'low' | 'medium' | 'high'

/** @deprecated Use RelevanceLevel */
export type ConfidenceLevel = RelevanceLevel

export const POSITION_ONLY: Position[] = ['utg', 'utg1', 'lj', 'hj', 'co', 'btn', 'sb', 'bb']

export type { Position }

export type PositionKey = 'overall' | Position

export const POSITION_KEYS: PositionKey[] = ['overall', ...POSITION_ONLY]

export const POSITION_LABELS: Record<PositionKey, string> = {
  overall: 'Overall',
  utg: 'UTG',
  utg1: 'UTG+1',
  lj: 'LJ',
  hj: 'HJ',
  co: 'CO',
  btn: 'BTN',
  sb: 'SB',
  bb: 'BB',
}

/**
 * Tracker seat names vary by site and table size. A bare "MP" is the seat before
 * the CO at a 6-max table, so it lands on HJ; "EP" at any table size is UTG.
 */
const POSITION_ALIASES: Record<PositionKey, string[]> = {
  overall: ['all', 'allpositions', 'total', 'totals', 'overall', 'summary'],
  utg: ['utg', 'ep', 'ep1', 'early', 'earlyposition', 'utg0'],
  utg1: ['utg1', 'utgplus1', 'utg2', 'utgplus2', 'ep2', 'ep3'],
  lj: ['lj', 'lojack', 'mp1'],
  hj: ['hj', 'hijack', 'mp', 'mp2', 'mp3', 'middle', 'middleposition'],
  co: ['co', 'cutoff'],
  btn: ['btn', 'bu', 'button', 'dealer'],
  sb: ['sb', 'smallblind'],
  bb: ['bb', 'bigblind'],
}

export { getPositionRange, getStatTarget, POSITION_RANGES, POSITION_TARGETS } from './leakfinderTargets'

/**
 * Which tabs a stat is graded on.
 *
 * A stat with targets for every seat has a meaningful blended Overall number,
 * and a stat with no positional targets at all is global by nature. But a stat
 * that only has a target at one or two seats — SB limping, BB defence — has no
 * sensible Overall reading: averaging a 60% SB limp rate with five seats that
 * never limp produces a number that is not a leak, it is arithmetic.
 */
export function statAppliesTo(defId: string, key: PositionKey): boolean {
  if (key !== 'overall') return statHasTargets(defId) ? statAppliesToPosition(defId, key) : false
  if (!statHasTargets(defId)) return true
  return POSITION_ONLY.every((position) => statAppliesToPosition(defId, position))
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

/**
 * Fill the Overall column from the per-position rows.
 *
 * A tracker's positional export has no "All" row, so without this every stat
 * that only has an Overall target — donk bets, float turn, fold to 4bet — would
 * be parsed and then never analysed. Each stat is averaged across the positions
 * that reported it, weighted by that stat's own opportunity count where the
 * export supplied one and by hands otherwise.
 *
 * Values already present in an explicit Overall row always win.
 */
export function enrichOverallFromPositions(
  positions: Partial<Record<PositionKey, Record<string, number>>>,
  hands: Partial<Record<PositionKey, number>>,
  opportunities: Partial<Record<PositionKey, Record<string, number>>> = {},
): boolean {
  const explicitOverall = { ...(positions.overall ?? {}) }
  const aggregated: Record<string, number> = {}
  const aggregatedOpps: Record<string, number> = {}
  let filledAny = false

  for (const def of STAT_DEFINITIONS) {
    if (explicitOverall[def.id] !== undefined) continue

    let weightTotal = 0
    let valueTotal = 0
    let oppTotal = 0
    let seen = 0

    for (const pos of POSITION_ONLY) {
      const value = positions[pos]?.[def.id]
      if (value === undefined || !Number.isFinite(value)) continue
      const opp = opportunities[pos]?.[def.id]
      const weight = opp && opp > 0 ? opp : (hands[pos] ?? 0)
      if (opp && opp > 0) oppTotal += opp
      seen += 1
      if (weight > 0) {
        weightTotal += weight
        valueTotal += weight * value
      }
    }

    if (seen === 0) continue

    if (weightTotal > 0) {
      aggregated[def.id] = Math.round((valueTotal / weightTotal) * 100) / 100
    } else {
      // No weights anywhere — fall back to a plain mean so the stat still shows.
      let sum = 0
      let count = 0
      for (const pos of POSITION_ONLY) {
        const value = positions[pos]?.[def.id]
        if (value === undefined || !Number.isFinite(value)) continue
        sum += value
        count += 1
      }
      aggregated[def.id] = Math.round((sum / count) * 100) / 100
    }
    if (oppTotal > 0) aggregatedOpps[def.id] = oppTotal
    filledAny = true
  }

  if (!hands.overall) {
    const totalHands = POSITION_ONLY.reduce((sum, pos) => sum + (hands[pos] ?? 0), 0)
    if (totalHands > 0) hands.overall = totalHands
  }

  if (Object.keys(aggregatedOpps).length > 0) {
    opportunities.overall = { ...aggregatedOpps, ...(opportunities.overall ?? {}) }
  }

  if (!filledAny) return false

  positions.overall = { ...aggregated, ...explicitOverall }
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

  const weightedOverallWinrate = enrichOverallFromPositions(positions, hands, opportunities)

  return { positions, hands, opportunities, matched, isTable: true, weightedOverallWinrate }
}

export interface StatResult {
  def: StatDefinition
  value: number
  range: [number, number]
  /** Severity after the sample-size cap. This is what the UI grades on. */
  severity: Severity
  /** Severity implied by the deviation alone, before any cap. */
  rawSeverity: Severity
  /** True when a thin sample held the severity below what the deviation implies. */
  capped: boolean
  /** False when the export carried no hand or opportunity count for this stat. */
  sampleKnown: boolean
  direction: 'low' | 'high' | 'ok'
  advice: string
  relevance: RelevanceLevel
  hands?: number
  /** Times this specific spot came up, when the export supplied a Count column. */
  opportunities?: number
  relevanceNote?: string
}

export interface AnalysisContext {
  hands?: number
  /** Per-stat opportunity counts, keyed by stat id. */
  opportunities?: Record<string, number>
}

/**
 * Opportunity thresholds sit far below the hand thresholds: you may have
 * 250,000 hands but only a few hundred river cbet spots from the SB, and it is
 * the latter that decides whether a river number means anything.
 */
export function relevanceFromOpportunities(opportunities: number): RelevanceLevel {
  if (opportunities < 100) return 'insufficient'
  if (opportunities < 400) return 'low'
  if (opportunities < 1_500) return 'medium'
  return 'high'
}

/** How much a result at this confidence counts toward the score. */
export function relevanceWeight(level: RelevanceLevel, sampleKnown = true): number {
  // An unknown sample is not evidence of a thin one — manual entry carries no
  // hand counts at all, and discounting it would flatten every score to noise.
  if (!sampleKnown) return 1
  switch (level) {
    case 'insufficient':
      return 0.25
    case 'low':
      return 0.6
    case 'medium':
      return 0.85
    case 'high':
      return 1
  }
}

/** A thin sample cannot prove a major leak, however far off the number looks. */
function capSeverity(severity: Severity, relevance: RelevanceLevel): Severity {
  const order: Severity[] = ['ok', 'minor', 'moderate', 'major']
  const ceiling: Record<RelevanceLevel, Severity> = {
    insufficient: 'minor',
    low: 'moderate',
    medium: 'major',
    high: 'major',
  }
  return order.indexOf(severity) <= order.indexOf(ceiling[relevance]) ? severity : ceiling[relevance]
}

function buildRelevance(
  def: StatDefinition,
  context?: AnalysisContext,
): Pick<StatResult, 'relevance' | 'hands' | 'opportunities' | 'relevanceNote' | 'sampleKnown'> {
  const opportunities = context?.opportunities?.[def.id]
  if (opportunities !== undefined && opportunities > 0) {
    const relevance = relevanceFromOpportunities(opportunities)
    return {
      relevance,
      sampleKnown: true,
      hands: context?.hands,
      opportunities,
      relevanceNote: `${opportunities.toLocaleString()} spots · ${relevanceLabel(relevance).toLowerCase()}`,
    }
  }

  const handCount = context?.hands ?? 0
  if (handCount <= 0) {
    return {
      relevance: 'insufficient',
      sampleKnown: false,
      relevanceNote: 'Hand count unknown — treat as directional only.',
    }
  }

  const relevance = relevanceFromHands(handCount)
  return {
    relevance,
    sampleKnown: true,
    hands: handCount,
    relevanceNote: `${handCount.toLocaleString()} hands · ${relevanceLabel(relevance).toLowerCase()}`,
  }
}

function severityFromDeviation(def: StatDefinition, deviation: number): Severity {
  const scale = def.unit === 'bb100' ? 2 : def.unit === 'ratio' ? 0.4 : 1
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
  const relevanceMeta = buildRelevance(def, context)

  const build = (
    rawSeverity: Severity,
    direction: 'low' | 'high' | 'ok',
    advice: string,
  ): StatResult => {
    const severity =
      direction === 'ok' || !relevanceMeta.sampleKnown
        ? rawSeverity
        : capSeverity(rawSeverity, relevanceMeta.relevance)
    return {
      def,
      value,
      range,
      severity,
      rawSeverity,
      capped: severity !== rawSeverity,
      direction,
      advice,
      ...relevanceMeta,
    }
  }

  if (value < min) return build(severityFromDeviation(def, min - value), 'low', def.lowAdvice)
  if (value > max) return build(severityFromDeviation(def, value - max), 'high', def.highAdvice)
  return build('ok', 'ok', 'Within the healthy range.')
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
    .sort((a, b) => leakPriority(b) - leakPriority(a))

  // Each stat counts in proportion to how much sample backs it, so one noisy
  // river number cannot drag the score down as hard as a proven preflop leak.
  let penalty = 0
  let maxPenalty = 0
  for (const r of results) {
    const weight = relevanceWeight(r.relevance, r.sampleKnown)
    penalty += severityWeight(r.severity) * weight
    maxPenalty += 3 * weight
  }
  const score = maxPenalty === 0 ? 0 : Math.round(100 - (penalty / maxPenalty) * 100)

  return { results, leaks, score }
}

/** How far outside the healthy band a value sits, in the stat's own unit. */
export function deviation(result: StatResult): number {
  const [min, max] = result.range
  if (result.value < min) return Math.round((min - result.value) * 100) / 100
  if (result.value > max) return Math.round((result.value - max) * 100) / 100
  return 0
}

/** Ranking key for "what do I fix first" — size of the miss, discounted by sample. */
export function leakPriority(result: StatResult): number {
  return severityWeight(result.severity) * relevanceWeight(result.relevance, result.sampleKnown) * 10 + deviation(result)
}

export interface RankedLeak extends StatResult {
  positionKey: PositionKey
  priority: number
}

export interface FullAnalysis {
  byPosition: Partial<Record<PositionKey, LeakReport>>
  /** Every leak from every position, worst first. */
  ranked: RankedLeak[]
  /** Sample-weighted score across every position that has data. */
  overallScore: number
  positionsWithData: PositionKey[]
}

/**
 * Analyse every position at once.
 *
 * Grading one tab at a time answers "how is my button?". This answers the
 * question people actually open the tool with, which is what to fix first.
 */
export function analyzeAll(
  valuesByPosition: Partial<Record<PositionKey, Record<string, number>>>,
  handsByPosition: Partial<Record<PositionKey, number>> = {},
  opportunitiesByPosition: Partial<Record<PositionKey, Record<string, number>>> = {},
): FullAnalysis {
  const byPosition: Partial<Record<PositionKey, LeakReport>> = {}
  const ranked: RankedLeak[] = []
  const positionsWithData: PositionKey[] = []

  let penalty = 0
  let maxPenalty = 0

  for (const key of POSITION_KEYS) {
    const values = valuesByPosition[key]
    if (!values || Object.keys(values).length === 0) continue
    const report = analyzeStats(values, key === 'overall' ? undefined : key, {
      hands: handsByPosition[key],
      opportunities: opportunitiesByPosition[key],
    })
    if (report.results.length === 0) continue

    byPosition[key] = report
    positionsWithData.push(key)

    for (const leak of report.leaks) {
      ranked.push({ ...leak, positionKey: key, priority: leakPriority(leak) })
    }

    // Overall restates the positional rows, so it must not be scored twice.
    if (key === 'overall') continue
    for (const r of report.results) {
      const weight = relevanceWeight(r.relevance, r.sampleKnown)
      penalty += severityWeight(r.severity) * weight
      maxPenalty += 3 * weight
    }
  }

  ranked.sort((a, b) => b.priority - a.priority)

  // Nothing but an Overall column (a flat paste) — score that instead.
  const overallScore =
    maxPenalty === 0
      ? (byPosition.overall?.score ?? 0)
      : Math.round(100 - (penalty / maxPenalty) * 100)

  return { byPosition, ranked, overallScore, positionsWithData }
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
