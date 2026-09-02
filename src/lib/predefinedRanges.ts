import { RANKS, cellKey, type CellState, type Rank, type RankIndex } from '../types/poker'
import { ALL_CELLS } from './matrix'

export interface PredefinedRange {
  id: string
  label: string
  category: string
  description: string
  tokens: string[]
}

const LABEL_TO_CELL = new Map(ALL_CELLS.map((cell) => [cell.label, cell]))

/** All suited — BB defends every suited combo vs any open at 40 BB MTT (BBZ). */
const ALL_SUITED = [
  'A2s+',
  'K2s+',
  'Q2s+',
  'J2s+',
  'T2s+',
  '92s+',
  '82s+',
  '72s+',
  '62s+',
  '52s+',
  '42s+',
  '32s',
] as const

/** BB offsuit horizontal bar + all stronger offsuit (no interior triangle gaps). */
function bbOffsuitBarTokens(barRank: Rank): string[] {
  const barIdx = rankIndex(barRank)
  const tokens: string[] = ['A2o+']
  for (let h = 1; h < barIdx; h++) {
    tokens.push(`${RANKS[h]}${RANKS[barIdx]}o+`)
  }
  return tokens
}

const BB_OFFSUIT_9X = bbOffsuitBarTokens('9')
const BB_OFFSUIT_7X = bbOffsuitBarTokens('7')
const BB_OFFSUIT_6X = bbOffsuitBarTokens('6')
const BB_OFFSUIT_5X = bbOffsuitBarTokens('5')

function rankIndex(rank: string): RankIndex {
  const idx = RANKS.indexOf(rank as Rank)
  if (idx < 0) throw new Error(`Invalid rank: ${rank}`)
  return idx as RankIndex
}

/** Expand one token like `TT+`, `AJs+`, `AKs`, or `KQo`. */
export function expandHandToken(token: string): string[] {
  const trimmed = token.trim()
  if (!trimmed) return []

  const pairPlus = trimmed.match(/^([AKQJT98765432])\1\+$/)
  if (pairPlus) {
    const start = rankIndex(pairPlus[1])
    const hands: string[] = []
    for (let r = start; r >= 0; r--) {
      hands.push(`${RANKS[r]}${RANKS[r]}`)
    }
    return hands
  }

  const suitedPlus = trimmed.match(/^([AKQJT98765432])([AKQJT98765432])s\+$/)
  if (suitedPlus) {
    const high = rankIndex(suitedPlus[1])
    const low = rankIndex(suitedPlus[2])
    if (high >= low) return []
    const hands: string[] = []
    for (let l = low; l > high; l--) {
      hands.push(`${RANKS[high]}${RANKS[l]}s`)
    }
    return hands
  }

  const offsuitPlus = trimmed.match(/^([AKQJT98765432])([AKQJT98765432])o\+$/)
  if (offsuitPlus) {
    const high = rankIndex(offsuitPlus[1])
    const low = rankIndex(offsuitPlus[2])
    if (high >= low) return []
    const hands: string[] = []
    for (let l = low; l > high; l--) {
      hands.push(`${RANKS[high]}${RANKS[l]}o`)
    }
    return hands
  }

  const pairExact = trimmed.match(/^([AKQJT98765432])\1$/)
  if (pairExact) {
    return [`${pairExact[1]}${pairExact[1]}`]
  }

  const exactWithSuffix = trimmed.match(/^([AKQJT98765432])([AKQJT98765432])([so])$/)
  if (exactWithSuffix) {
    const high = rankIndex(exactWithSuffix[1])
    const low = rankIndex(exactWithSuffix[2])
    if (high >= low) return []
    return [`${RANKS[high]}${RANKS[low]}${exactWithSuffix[3]}`]
  }

  if (LABEL_TO_CELL.has(trimmed)) return [trimmed]

  return []
}

export function expandRangeTokens(tokens: string[]): string[] {
  const labels = new Set<string>()
  for (const token of tokens) {
    for (const label of expandHandToken(token)) {
      labels.add(label)
    }
  }
  return [...labels]
}

export function parsePredefinedRange(range: PredefinedRange): Record<string, CellState> {
  const labels = expandRangeTokens(range.tokens)
  const cellStates: Record<string, CellState> = {}

  for (const label of labels) {
    const cell = LABEL_TO_CELL.get(label)
    if (cell) {
      cellStates[cellKey(cell.row, cell.col)] = 'in'
    }
  }

  return cellStates
}

export function countRangeCombos(cellStates: Record<string, CellState>): number {
  let total = 0
  for (const cell of ALL_CELLS) {
    const key = cellKey(cell.row, cell.col)
    if (cellStates[key] === 'in') total += cell.combos
  }
  return total
}

export const PREDEFINED_RANGES: PredefinedRange[] = [
  // 8-max MTT · 40 BB · 1 BB ante · 2.2x open — continue vs RFI (call + 3-bet).
  // BB: BBZ all suited + Rule of 5-6-7. IP: tighter flats, more 3-bet/fold at this depth.
  {
    id: '40bb-hj-vs-utg',
    label: 'vs UTG',
    category: 'MTT · 40BB · HJ',
    description: 'HJ continue vs UTG open — pairs, suited broadways, AK/AQ',
    tokens: ['88+', 'AJs+', 'KQs', 'QJs', 'JTs', 'T9s', '98s', 'AKo', 'AQo'],
  },
  {
    id: '40bb-co-vs-utg',
    label: 'vs UTG',
    category: 'MTT · 40BB · CO',
    description: 'CO continue vs UTG open — value + suited connectors',
    tokens: ['77+', 'ATs+', 'KJs+', 'QJs', 'JTs', 'T9s', '98s', '87s', 'AKo', 'AQo', 'AJo'],
  },
  {
    id: '40bb-co-vs-hj',
    label: 'vs HJ',
    category: 'MTT · 40BB · CO',
    description: 'CO continue vs hijack open — 3-bet heavy, selective flats',
    tokens: ['66+', 'A9s+', 'A5s', 'KTs+', 'QJs', 'JTs', 'T9s', '98s', '87s', '76s', 'AJo+', 'KQo'],
  },
  {
    id: '40bb-btn-vs-utg',
    label: 'vs UTG',
    category: 'MTT · 40BB · BTN',
    description: 'BTN continue vs UTG open',
    tokens: ['66+', 'AJs+', 'KQs', 'QJs', 'JTs', 'T9s', '98s', '87s', 'AKo', 'AQo', 'AJo', 'KQo'],
  },
  {
    id: '40bb-btn-vs-hj',
    label: 'vs HJ',
    category: 'MTT · 40BB · BTN',
    description: 'BTN continue vs hijack open',
    tokens: [
      '55+', 'A9s+', 'A5s', 'A4s', 'KTs+', 'QJs', 'JTs', 'T9s', '98s', '87s', '76s',
      'AJo+', 'KJo+', 'QJo', 'KQo',
    ],
  },
  {
    id: '40bb-btn-vs-co',
    label: 'vs CO',
    category: 'MTT · 40BB · BTN',
    description: 'BTN continue vs cutoff open — wide BTN defense',
    tokens: [
      '44+', 'A2s+', 'K8s+', 'Q9s+', 'J9s+', 'T8s+', '98s', '87s', '76s', '65s', '54s',
      'A9o+', 'KJo+', 'QJo', 'QTo', 'JTo', 'KQo',
    ],
  },
  {
    id: '40bb-sb-vs-utg',
    label: 'vs UTG',
    category: 'MTT · 40BB · SB',
    description: 'SB continue vs UTG — mostly 3-bet, tight flats',
    tokens: ['99+', 'AJs+', 'KQs', 'QJs', 'JTs', 'AKo', 'AQo'],
  },
  {
    id: '40bb-sb-vs-hj',
    label: 'vs HJ',
    category: 'MTT · 40BB · SB',
    description: 'SB continue vs hijack open',
    tokens: ['88+', 'ATs+', 'KJs+', 'QJs', 'JTs', 'T9s', '98s', 'AKo', 'AQo', 'AJo'],
  },
  {
    id: '40bb-sb-vs-co',
    label: 'vs CO',
    category: 'MTT · 40BB · SB',
    description: 'SB continue vs cutoff — suited 8x floor',
    tokens: [
      '66+', 'A8s+', 'A5s', 'K9s+', 'Q9s+', 'J9s+', 'T8s+', '98s', '87s', '76s',
      'ATo+', 'KJo+', 'QJo', 'KQo',
    ],
  },
  {
    id: '40bb-sb-vs-btn',
    label: 'vs BTN',
    category: 'MTT · 40BB · SB',
    description: 'SB continue vs button — suited 7x, wide vs steal',
    tokens: [
      '22+', 'A2s+', 'K7s+', 'Q8s+', 'J8s+', 'T7s+', '97s+', '87s', '76s', '65s', '54s', '43s',
      'A4o+', 'K9o+', 'Q9o+', 'J9o+', 'T9o', '98o',
    ],
  },
  {
    id: '40bb-bb-vs-utg',
    label: 'vs UTG',
    category: 'MTT · 40BB · BB',
    description: 'BB defend vs UTG — all suited, offsuit 9x bar',
    tokens: ['22+', ...ALL_SUITED, ...BB_OFFSUIT_9X],
  },
  {
    id: '40bb-bb-vs-hj',
    label: 'vs HJ',
    category: 'MTT · 40BB · BB',
    description: 'BB defend vs hijack — all suited, offsuit 7x bar',
    tokens: ['22+', ...ALL_SUITED, ...BB_OFFSUIT_7X],
  },
  {
    id: '40bb-bb-vs-co',
    label: 'vs CO',
    category: 'MTT · 40BB · BB',
    description: 'BB defend vs cutoff — all suited, offsuit 6x bar',
    tokens: ['22+', ...ALL_SUITED, ...BB_OFFSUIT_6X],
  },
  {
    id: '40bb-bb-vs-btn',
    label: 'vs BTN',
    category: 'MTT · 40BB · BB',
    description: 'BB defend vs button — all suited, offsuit 5x bar',
    tokens: ['22+', ...ALL_SUITED, ...BB_OFFSUIT_5X],
  },
  {
    id: '40bb-bb-vs-sb',
    label: 'vs SB',
    category: 'MTT · 40BB · BB',
    description: 'BB defend vs SB open — all suited, offsuit 5x bar',
    tokens: ['22+', ...ALL_SUITED, ...BB_OFFSUIT_5X],
  },
]

/**
 * Top-X% ranges ordered by all-in equity vs a random hand — the same basis
 * PokerStove/Equilab use for their percentage slider. Each range is a strict
 * superset of the one above it, so they nest cleanly. Combo counts land within
 * ~1 percentage point of the nominal label: the strength ordering is kept
 * faithful rather than padded with weaker hands to hit an exact count.
 */
export const PERCENT_RANGES: PredefinedRange[] = [
  {
    id: 'top-10',
    label: 'Top 10%',
    category: 'Top %',
    description: 'Top 10% — big pairs, strong suited aces and broadways (140 combos · 10.6%)',
    tokens: ['77+', 'A9s+', 'KTs+', 'QTs+', 'JTs', 'AJo+', 'KQo'],
  },
  {
    id: 'top-15',
    label: 'Top 15%',
    category: 'Top %',
    description: 'Top 15% — adds mid pairs, more suited aces and broadways (204 combos · 15.4%)',
    tokens: ['55+', 'A7s+', 'A5s', 'K9s+', 'Q9s+', 'J9s+', 'T9s', 'ATo+', 'KJo+'],
  },
  {
    id: 'top-20',
    label: 'Top 20%',
    category: 'Top %',
    description: 'Top 20% — all suited aces, suited connectors down to 98s (262 combos · 19.8%)',
    tokens: ['44+', 'A2s+', 'K8s+', 'Q9s+', 'J9s+', 'T8s+', '98s', 'A9o+', 'KJo+', 'QJo'],
  },
  {
    id: 'top-25',
    label: 'Top 25%',
    category: 'Top %',
    description: 'Top 25% — all pairs, suited kings to K5s, offsuit broadways (338 combos · 25.5%)',
    tokens: ['22+', 'A2s+', 'K5s+', 'Q8s+', 'J8s+', 'T8s+', '97s+', '87s', 'A8o+', 'KTo+', 'QJo', 'JTo'],
  },
  {
    id: 'top-30',
    label: 'Top 30%',
    category: 'Top %',
    description: 'Top 30% — all suited kings, weaker suited queens, A7o+ (406 combos · 30.6%)',
    tokens: ['22+', 'A2s+', 'K2s+', 'Q6s+', 'J7s+', 'T7s+', '97s+', '87s', '76s', 'A7o+', 'K9o+', 'QTo+', 'JTo'],
  },
  {
    id: 'top-40',
    label: 'Top 40%',
    category: 'Top %',
    description: 'Top 40% — all offsuit aces, suited hands down to 54s (526 combos · 39.7%)',
    tokens: [
      '22+', 'A2s+', 'K2s+', 'Q2s+', 'J4s+', 'T6s+', '95s+', '85s+', '75s+', '65s', '54s',
      'A2o+', 'K9o+', 'QTo+', 'JTo',
    ],
  },
  {
    id: 'top-50',
    label: 'Top 50%',
    category: 'Top %',
    description: 'Top 50% — nearly every suited hand plus K7o+, Q9o+, J9o+, T9o (670 combos · 50.5%)',
    tokens: [
      '22+', 'A2s+', 'K2s+', 'Q2s+', 'J2s+', 'T2s+', '92s+', '82s+', '72s+', '62s+', '52s+', '43s',
      'A2o+', 'K7o+', 'Q9o+', 'J9o+', 'T9o',
    ],
  },
  {
    id: 'full-range',
    label: 'Full range (100%)',
    category: 'Top %',
    description: 'Every hand — all 169 cells, 1,326 combos (100%)',
    tokens: [
      '22+',
      'A2s+', 'K2s+', 'Q2s+', 'J2s+', 'T2s+', '92s+', '82s+', '72s+', '62s+', '52s+', '42s+', '32s',
      'A2o+', 'K2o+', 'Q2o+', 'J2o+', 'T2o+', '92o+', '82o+', '72o+', '62o+', '52o+', '42o+', '32o',
    ],
  },
]

/** Presets offered by the equity calculator: top-X% ranges plus the positional ranges. */
export const EQUITY_PRESET_RANGES: PredefinedRange[] = [...PERCENT_RANGES, ...PREDEFINED_RANGES]

export function getPredefinedRange(id: string): PredefinedRange | undefined {
  return PREDEFINED_RANGES.find((range) => range.id === id)
}

export function getPredefinedRangeCategories(): string[] {
  return [...new Set(PREDEFINED_RANGES.map((range) => range.category))]
}
