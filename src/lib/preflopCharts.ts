/**
 * Preflop chart library for MTTs.
 *
 * A chart is one spot — a position at a stack depth facing a given action —
 * holding one or more range layers ("Raise", "Call", "3-bet"). Ranges are
 * written as strings and expanded by {@link parseRangeString}.
 *
 * Layers are checked in order and the first one containing a hand wins, so a
 * hand listed in both "3-bet" and "Call" is graded as the 3-bet. Anything no
 * layer claims is a fold.
 */

import { ALL_CELLS } from './matrix'
import { parseRangeString } from './rangeParser'
import { RANKS } from '../types/poker'

export const POSITIONS = ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'] as const
export type Position = (typeof POSITIONS)[number]

/**
 * Chip-EV versus ICM. cEV is the chip-maximising line — early levels, deep
 * field, no pay jump in sight. ICM is the same spot with a pay jump close
 * enough to matter, where busting costs more than the chips are worth.
 */
export const FORMATS = ['cEV', 'ICM'] as const
export type ChartFormat = (typeof FORMATS)[number]

/**
 * Layer colours follow the house convention: red for a raise or 3-bet, dark
 * red for putting it all in, green for a call. The rest are spares for
 * anything that does not fit those three.
 */
export const LAYER_COLORS = ['red', 'darkRed', 'green', 'amber', 'sky', 'violet'] as const
export type LayerColor = (typeof LAYER_COLORS)[number]

/** Cell fill, legend swatch and answer-button styling for each layer colour. */
export const COLOR_CLASSES: Record<
  LayerColor,
  { cell: string; swatch: string; button: string; name: string; hex: string }
> = {
  red: {
    name: 'Raise / 3-bet',
    hex: '#dc2626',
    cell: 'bg-red-600 text-white',
    swatch: 'bg-red-600',
    button: 'border-red-700 bg-red-950/50 text-red-200 hover:bg-red-900/60',
  },
  darkRed: {
    name: 'All in',
    hex: '#7f1d1d',
    cell: 'bg-red-900 text-red-50',
    swatch: 'bg-red-900',
    button: 'border-red-900 bg-red-950/70 text-red-200 hover:bg-red-950',
  },
  green: {
    name: 'Call',
    hex: '#16a34a',
    cell: 'bg-green-600 text-white',
    swatch: 'bg-green-600',
    button: 'border-green-700 bg-green-950/50 text-green-200 hover:bg-green-900/60',
  },
  amber: {
    name: 'Amber',
    hex: '#d97706',
    cell: 'bg-amber-600 text-white',
    swatch: 'bg-amber-600',
    button: 'border-amber-700 bg-amber-950/50 text-amber-200 hover:bg-amber-900/60',
  },
  sky: {
    name: 'Sky',
    hex: '#0284c7',
    cell: 'bg-sky-600 text-white',
    swatch: 'bg-sky-600',
    button: 'border-sky-700 bg-sky-950/50 text-sky-200 hover:bg-sky-900/60',
  },
  violet: {
    name: 'Violet',
    hex: '#7c3aed',
    cell: 'bg-violet-600 text-white',
    swatch: 'bg-violet-600',
    button: 'border-violet-700 bg-violet-950/50 text-violet-200 hover:bg-violet-900/60',
  },
}

/** Colours used before the red/dark-red/green convention, kept so saved charts survive. */
const LEGACY_COLORS: Record<string, LayerColor> = {
  emerald: 'green',
  rose: 'red',
  cyan: 'sky',
}

/**
 * Pick a colour from what the layer is called. All-in is checked before raise
 * so "3-bet shove" lands on dark red rather than plain red.
 */
export function suggestColor(label: string): LayerColor | null {
  const text = label.trim().toLowerCase()
  if (!text) return null
  if (/\ball[\s-]?in\b|shove|jam|push|stack off/.test(text)) return 'darkRed'
  if (/call|flat|defend|limp|complete/.test(text)) return 'green'
  if (/raise|open|bet|rfi|iso|steal|attack/.test(text)) return 'red'
  return null
}

export const FOLD_ANSWER = 'Fold'

export interface ChartLayer {
  id: string
  label: string
  color: LayerColor
  tokens: string
  /**
   * How often this layer is taken, 1-100. Anything under 100 is a mix: the
   * rest of the time the hand falls through to whatever would claim it next,
   * and the drill accepts either answer.
   */
  frequency?: number
}

export interface PreflopChart {
  id: string
  position: Position
  format: ChartFormat
  stackBb: number
  action: string
  layers: ChartLayer[]
  notes?: string
}

export interface ResolvedLayer {
  layer: ChartLayer
  /** Hands this layer owns, after earlier layers have taken theirs. */
  labels: Set<string>
  combos: number
  pct: number
  errors: string[]
}

export interface ResolvedChart {
  layers: ResolvedLayer[]
  /** Hand label to the layer that owns it. */
  owner: Map<string, ChartLayer>
  combos: number
  pct: number
  errors: string[]
}

const LABEL_COMBOS = new Map(ALL_CELLS.map((cell) => [cell.label, cell.combos]))
export const TOTAL_COMBOS = ALL_CELLS.reduce((sum, cell) => sum + cell.combos, 0)

export function comboCount(labels: Iterable<string>): number {
  let total = 0
  for (const label of labels) total += LABEL_COMBOS.get(label) ?? 0
  return total
}

export function createId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${Date.now().toString(36)}-${random}`
}

/** Expand every layer, giving each hand to the first layer that claims it. */
export function resolveChart(chart: PreflopChart): ResolvedChart {
  const owner = new Map<string, ChartLayer>()
  const errors: string[] = []
  const layers: ResolvedLayer[] = []

  for (const layer of chart.layers) {
    const parsed = parseRangeString(layer.tokens)
    const mine = new Set<string>()
    for (const label of parsed.labels) {
      if (owner.has(label)) continue
      owner.set(label, layer)
      mine.add(label)
    }
    const combos = comboCount(mine)
    layers.push({
      layer,
      labels: mine,
      combos,
      pct: (combos / TOTAL_COMBOS) * 100,
      errors: parsed.errors,
    })
    for (const error of parsed.errors) errors.push(`${layer.label || 'Range'}: ${error}`)
  }

  const combos = layers.reduce((sum, layer) => sum + layer.combos, 0)
  return { layers, owner, combos, pct: (combos / TOTAL_COMBOS) * 100, errors }
}

/** The action a chart prescribes for one hand. */
export function actionFor(chart: PreflopChart, handLabel: string): string {
  return resolveChart(chart).owner.get(handLabel)?.label || FOLD_ANSWER
}

/**
 * Answers that count as correct for one hand. A hand owned by a full-frequency
 * layer has exactly one. A hand in a mixed layer also accepts whatever would
 * have claimed it had that layer not been there.
 */
export function acceptedAnswers(chart: PreflopChart, handLabel: string): string[] {
  const owner = resolveChart(chart).owner.get(handLabel)
  if (!owner) return [FOLD_ANSWER]
  if (owner.frequency === undefined) return [owner.label]

  const without: PreflopChart = {
    ...chart,
    layers: chart.layers.filter((layer) => layer.id !== owner.id),
  }
  const fallback = actionFor(without, handLabel)
  return fallback === owner.label ? [owner.label] : [owner.label, fallback]
}

export function answerOptions(chart: PreflopChart): string[] {
  const seen = new Set<string>()
  const options: string[] = []
  for (const layer of chart.layers) {
    const label = layer.label.trim()
    if (!label || seen.has(label)) continue
    seen.add(label)
    options.push(label)
  }
  options.push(FOLD_ANSWER)
  return options
}

// ---------------------------------------------------------------- drill ----

const SUIT_SYMBOLS = ['♠', '♥', '♦', '♣'] as const
export type SuitSymbol = (typeof SUIT_SYMBOLS)[number]

export interface DealtCard {
  rank: string
  suit: SuitSymbol
}

export interface DrillHand {
  /** Matrix label, e.g. `A7o`. */
  label: string
  cards: [DealtCard, DealtCard]
}

/**
 * Deal a hand weighted by combinations, so offsuit hands turn up three times
 * as often as suited ones — the way they actually arrive at the table.
 */
export function randomHand(random: () => number = Math.random): DrillHand {
  let target = random() * TOTAL_COMBOS
  let cell = ALL_CELLS[ALL_CELLS.length - 1]
  for (const candidate of ALL_CELLS) {
    target -= candidate.combos
    if (target < 0) {
      cell = candidate
      break
    }
  }

  const high = RANKS[Math.min(cell.row, cell.col)]
  const low = RANKS[Math.max(cell.row, cell.col)]
  const pickSuit = () => SUIT_SYMBOLS[Math.floor(random() * SUIT_SYMBOLS.length)] ?? SUIT_SYMBOLS[0]

  if (cell.type === 'suited') {
    const suit = pickSuit()
    return { label: cell.label, cards: [{ rank: high, suit }, { rank: low, suit }] }
  }

  const first = pickSuit()
  let second = pickSuit()
  if (second === first) {
    const index = (SUIT_SYMBOLS.indexOf(first) + 1) % SUIT_SYMBOLS.length
    second = SUIT_SYMBOLS[index]
  }
  return { label: cell.label, cards: [{ rank: high, suit: first }, { rank: low, suit: second }] }
}

export interface DrillQuestion {
  chart: PreflopChart
  hand: DrillHand
  expected: string
  /** Every answer graded correct — more than one when the hand is a mix. */
  accepted: string[]
}

export function nextQuestion(
  charts: readonly PreflopChart[],
  random: () => number = Math.random,
): DrillQuestion | null {
  if (charts.length === 0) return null
  const chart = charts[Math.min(charts.length - 1, Math.floor(random() * charts.length))]
  const hand = randomHand(random)
  return {
    chart,
    hand,
    expected: actionFor(chart, hand.label),
    accepted: acceptedAnswers(chart, hand.label),
  }
}

// -------------------------------------------------------------- storage ----

export const STORAGE_KEY = 'poker-tools:preflop-charts'

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeLayer(raw: unknown, index: number): ChartLayer | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  const tokens = asText(record.tokens) || asText(record.range)
  const label = asText(record.label) || `Range ${index + 1}`
  if (!tokens) return null

  const rawColor = asText(record.color)
  const color = LAYER_COLORS.includes(rawColor as LayerColor)
    ? (rawColor as LayerColor)
    : (LEGACY_COLORS[rawColor] ?? suggestColor(label) ?? LAYER_COLORS[index % LAYER_COLORS.length])

  const rawFreq = Number(record.frequency)
  const frequency =
    Number.isFinite(rawFreq) && rawFreq > 0 && rawFreq < 100 ? Math.round(rawFreq) : undefined

  return { id: asText(record.id) || createId('layer'), label, color, tokens, frequency }
}

export function normalizeChart(raw: unknown): PreflopChart | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>

  const position = POSITIONS.includes(record.position as Position)
    ? (record.position as Position)
    : null
  if (!position) return null

  const format = FORMATS.includes(record.format as ChartFormat)
    ? (record.format as ChartFormat)
    : 'cEV'

  const stackBb = Number(record.stackBb)
  if (!Number.isFinite(stackBb) || stackBb <= 0) return null

  const rawLayers = Array.isArray(record.layers) ? record.layers : []
  const layers = rawLayers
    .map((layer, layerIndex) => normalizeLayer(layer, layerIndex))
    .filter((layer): layer is ChartLayer => layer !== null)
  if (layers.length === 0) return null

  return {
    id: asText(record.id) || createId('chart'),
    position,
    format,
    stackBb,
    action: asText(record.action) || 'RFI',
    layers,
    notes: asText(record.notes) || undefined,
  }
}

export interface ParsedChartFile {
  charts: PreflopChart[]
  errors: string[]
}

export function parseChartFile(text: string): ParsedChartFile {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch (err) {
    return {
      charts: [],
      errors: [`Invalid JSON: ${err instanceof Error ? err.message : 'could not parse file'}`],
    }
  }

  const rawCharts = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as Record<string, unknown>).charts)
      ? ((data as Record<string, unknown>).charts as unknown[])
      : []

  if (rawCharts.length === 0) return { charts: [], errors: ['No charts found in file'] }

  const charts: PreflopChart[] = []
  const errors: string[] = []
  rawCharts.forEach((raw, index) => {
    const chart = normalizeChart(raw)
    if (chart) charts.push(chart)
    else errors.push(`Chart ${index + 1}: needs a known position, a stack size and at least one range`)
  })

  return { charts, errors }
}

export function serializeCharts(charts: readonly PreflopChart[]): string {
  return JSON.stringify({ version: 1, charts }, null, 2)
}

/** Sort by position, then by stack depth, so the library reads like a chart book. */
export function sortCharts(charts: readonly PreflopChart[]): PreflopChart[] {
  return [...charts].sort((a, b) => {
    const byFormat = FORMATS.indexOf(a.format) - FORMATS.indexOf(b.format)
    if (byFormat !== 0) return byFormat
    const byPosition = POSITIONS.indexOf(a.position) - POSITIONS.indexOf(b.position)
    if (byPosition !== 0) return byPosition
    if (a.stackBb !== b.stackBb) return a.stackBb - b.stackBb
    return a.action.localeCompare(b.action)
  })
}

export function distinctStacks(charts: readonly PreflopChart[]): number[] {
  return [...new Set(charts.map((chart) => chart.stackBb))].sort((a, b) => a - b)
}
