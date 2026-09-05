/**
 * Preflop range-string parser.
 *
 * Accepts the usual notation, comma / space / newline separated and
 * case-insensitive:
 *
 *   22+          every pair from 22 up
 *   77-JJ        a run of pairs, either way round
 *   AKs  76s     one exact hand
 *   K6s+         K6s through KQs — the HIGH card is fixed and the kicker
 *                climbs, which is what "K6s+" means to most players
 *   A5s-A2s      a run of kickers under one high card
 *   AJ+          no suffix means both suited and offsuit
 *   Ax           every hand whose top card is an ace, AA included
 *   Axs / Axo    just the suited / offsuit half of that
 *
 * A trailing "+" on a wildcard (`Ax+`) is accepted and ignored — it adds
 * nothing, but people write it.
 *
 * Parsing never throws. Unrecognised tokens come back in `errors` so the rest
 * of the range still loads.
 */

import { RANKS, type Rank } from '../types/poker'

const RANK_CHARS = 'AKQJT98765432'

/** Lower index = stronger rank, matching RANKS. */
function rankIndex(char: string): number {
  return RANKS.indexOf(char.toUpperCase() as Rank)
}

function pairLabel(index: number): string {
  return `${RANKS[index]}${RANKS[index]}`
}

/** `high` and `low` are indices, so `high < low` means the first rank is stronger. */
function comboLabel(high: number, low: number, suited: boolean): string {
  return `${RANKS[high]}${RANKS[low]}${suited ? 's' : 'o'}`
}

export interface ParsedRange {
  /** Hand labels such as `AA`, `AKs`, `KQo`. */
  labels: Set<string>
  errors: string[]
}

const PAIR_EXACT = new RegExp(`^([${RANK_CHARS}])\\1$`, 'i')
const PAIR_PLUS = new RegExp(`^([${RANK_CHARS}])\\1\\+$`, 'i')
const COMBO_EXACT = new RegExp(`^([${RANK_CHARS}])([${RANK_CHARS}])([SO]?)$`, 'i')
const COMBO_PLUS = new RegExp(`^([${RANK_CHARS}])([${RANK_CHARS}])([SO]?)\\+$`, 'i')
const WILDCARD = new RegExp(`^([${RANK_CHARS}])X([SO]?)\\+?$`, 'i')

/** Every hand whose top card is `index`: the pair plus each kicker below it. */
function wildcardLabels(index: number, suffix: string): string[] {
  const labels: string[] = []
  const wantSuited = suffix === '' || suffix === 's'
  const wantOffsuit = suffix === '' || suffix === 'o'

  if (suffix === '') labels.push(pairLabel(index))
  for (let low = index + 1; low < RANKS.length; low++) {
    if (wantSuited) labels.push(comboLabel(index, low, true))
    if (wantOffsuit) labels.push(comboLabel(index, low, false))
  }
  return labels
}

/** `77+` — every pair from `index` up to aces. */
function pairPlusLabels(index: number): string[] {
  const labels: string[] = []
  for (let i = index; i >= 0; i--) labels.push(pairLabel(i))
  return labels
}

/** `K6s+` — the high card stays put, the kicker climbs until it meets it. */
function comboPlusLabels(high: number, low: number, suffix: string): string[] {
  if (high >= low) return []
  const labels: string[] = []
  for (let l = low; l > high; l--) {
    if (suffix === '' || suffix === 's') labels.push(comboLabel(high, l, true))
    if (suffix === '' || suffix === 'o') labels.push(comboLabel(high, l, false))
  }
  return labels
}

function exactLabels(high: number, low: number, suffix: string): string[] {
  if (high === low) return suffix === '' ? [pairLabel(high)] : []
  const [hi, lo] = high < low ? [high, low] : [low, high]
  if (suffix === 's') return [comboLabel(hi, lo, true)]
  if (suffix === 'o') return [comboLabel(hi, lo, false)]
  return [comboLabel(hi, lo, true), comboLabel(hi, lo, false)]
}

/** `77-JJ` or `A5s-A2s`, in either direction. */
function dashLabels(left: string, right: string): string[] | null {
  const leftPair = PAIR_EXACT.exec(left)
  const rightPair = PAIR_EXACT.exec(right)
  if (leftPair && rightPair) {
    const a = rankIndex(leftPair[1])
    const b = rankIndex(rightPair[1])
    const [from, to] = a < b ? [a, b] : [b, a]
    const labels: string[] = []
    for (let i = from; i <= to; i++) labels.push(pairLabel(i))
    return labels
  }

  const leftCombo = COMBO_EXACT.exec(left)
  const rightCombo = COMBO_EXACT.exec(right)
  if (!leftCombo || !rightCombo) return null

  const suffix = leftCombo[3].toLowerCase()
  if (suffix !== rightCombo[3].toLowerCase()) return null

  const leftHigh = rankIndex(leftCombo[1])
  const rightHigh = rankIndex(rightCombo[1])
  // A run only makes sense under a single high card, e.g. A5s-A2s.
  if (leftHigh !== rightHigh) return null

  const a = rankIndex(leftCombo[2])
  const b = rankIndex(rightCombo[2])
  const [from, to] = a < b ? [a, b] : [b, a]

  const labels: string[] = []
  for (let low = from; low <= to; low++) {
    if (low <= leftHigh) continue
    labels.push(...exactLabels(leftHigh, low, suffix))
  }
  return labels
}

function tokenLabels(raw: string): string[] | null {
  const token = raw.trim()
  if (!token) return []

  const wildcard = WILDCARD.exec(token)
  if (wildcard) return wildcardLabels(rankIndex(wildcard[1]), wildcard[2].toLowerCase())

  const pairPlus = PAIR_PLUS.exec(token)
  if (pairPlus) return pairPlusLabels(rankIndex(pairPlus[1]))

  const comboPlus = COMBO_PLUS.exec(token)
  if (comboPlus) {
    const high = rankIndex(comboPlus[1])
    const low = rankIndex(comboPlus[2])
    if (high === low) return pairPlusLabels(high)
    const [hi, lo] = high < low ? [high, low] : [low, high]
    return comboPlusLabels(hi, lo, comboPlus[3].toLowerCase())
  }

  const dash = token.split('-')
  if (dash.length === 2) return dashLabels(dash[0].trim(), dash[1].trim())

  const exact = COMBO_EXACT.exec(token)
  if (exact) {
    return exactLabels(rankIndex(exact[1]), rankIndex(exact[2]), exact[3].toLowerCase())
  }

  return null
}

export function parseRangeString(input: string): ParsedRange {
  const labels = new Set<string>()
  const errors: string[] = []

  for (const raw of input.split(/[,;\s]+/)) {
    const token = raw.trim()
    if (!token) continue

    const parsed = tokenLabels(token)
    if (parsed === null || parsed.length === 0) {
      errors.push(`Could not read "${token}"`)
      continue
    }
    for (const label of parsed) labels.add(label)
  }

  return { labels, errors }
}

/**
 * Canonical form of a set of hand labels — pairs first, then suited, then
 * offsuit, each collapsed into runs (`77+`, `A2s+`, `T7s-T5s`).
 */
export function formatRange(labels: ReadonlySet<string>): string {
  const parts: string[] = []

  const pairs: number[] = []
  for (let i = 0; i < RANKS.length; i++) {
    if (labels.has(pairLabel(i))) pairs.push(i)
  }
  parts.push(...collapse(pairs, (from, to) => runToken(from, to, null, 0)))

  for (const suited of [true, false]) {
    for (let high = 0; high < RANKS.length; high++) {
      const kickers: number[] = []
      for (let low = high + 1; low < RANKS.length; low++) {
        if (labels.has(comboLabel(high, low, suited))) kickers.push(low)
      }
      parts.push(...collapse(kickers, (from, to) => runToken(from, to, suited, high)))
    }
  }

  return parts.join(', ')
}

/** Group ascending indices into consecutive runs, rendering each run. */
function collapse(indices: number[], render: (from: number, to: number) => string): string[] {
  const out: string[] = []
  let i = 0
  while (i < indices.length) {
    let j = i
    while (j + 1 < indices.length && indices[j + 1] === indices[j] + 1) j++
    out.push(render(indices[i], indices[j]))
    i = j + 1
  }
  return out
}

/**
 * Render one run. Indices ascend as rank strength falls, so `from` is the
 * strongest end. A run that reaches the top of its family collapses to "+".
 */
function runToken(from: number, to: number, suited: boolean | null, high: number): string {
  const label = (index: number) =>
    suited === null ? pairLabel(index) : comboLabel(high, index, suited)

  const reachesTop = suited === null ? from === 0 : from === high + 1
  if (from === to) return label(from)
  if (reachesTop) return `${label(to)}+`
  // `from` holds the smallest index, which is the strongest hand — lead with it.
  return `${label(from)}-${label(to)}`
}
