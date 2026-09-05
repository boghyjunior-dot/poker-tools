import { calculateEquity, marginOfErrorForEquity } from './equity'
import { PERCENT_RANGES, parsePredefinedRange } from './predefinedRanges'
import type { RangeCellStates } from './equityRange'

export interface CallingWidth {
  id: string
  label: string
  /** Nominal width of the calling range, e.g. 20 for "top 20%". */
  pct: number
  /** Equity of that whole range against the jamming range. */
  equity: number
  marginOfError: number
  /** True when this width clears the break-even threshold. */
  clears: boolean
}

export interface CallingRangeSolution {
  widths: CallingWidth[]
  /** The widest range that still clears the threshold, if any does. */
  widest: CallingWidth | null
  thresholdPct: number
  jamRangeLabel: string
  iterations: number
}

const NOMINAL_PCT: Record<string, number> = {
  'top-10': 10,
  'top-15': 15,
  'top-20': 20,
  'top-25': 25,
  'top-30': 30,
  'top-40': 40,
  'top-50': 50,
  'full-range': 100,
}

export const JAM_RANGE_OPTIONS = PERCENT_RANGES.map((range) => ({
  id: range.id,
  label: range.label,
}))

/**
 * Turn a break-even equity number into hands.
 *
 * A threshold on its own does not tell you what to do at the table. Rather
 * than price all 169 hands one at a time — which takes the better part of a
 * minute in the browser — this measures the standard range widths against the
 * jamming range and reports which of them clear the bar. Eight simulations
 * instead of one hundred and sixty-nine, and the answer is the one you act on:
 * roughly how wide you can call.
 *
 * Each width is scored as a whole range, so it answers "is calling every hand
 * in the top 20% profitable on average", not "is the very worst hand in it a
 * break-even call".
 */
export function solveCallingRange(
  thresholdPct: number,
  jamRangeId: string,
  iterations = 3000,
): CallingRangeSolution | null {
  const jamRange = PERCENT_RANGES.find((range) => range.id === jamRangeId)
  if (!jamRange) return null

  const villain = parsePredefinedRange(jamRange) as RangeCellStates

  const widths: CallingWidth[] = []
  for (const preset of PERCENT_RANGES) {
    const hero = parsePredefinedRange(preset) as RangeCellStates
    let equity: number
    try {
      const result = calculateEquity(
        [
          { type: 'range', name: 'You', cellStates: hero },
          { type: 'range', name: 'Them', cellStates: villain },
        ],
        { iterations },
      )
      equity = result.players[0].equity
    } catch {
      // Overlapping or empty ranges — skip rather than break the panel.
      continue
    }

    widths.push({
      id: preset.id,
      label: preset.label,
      pct: NOMINAL_PCT[preset.id] ?? 0,
      equity,
      marginOfError: marginOfErrorForEquity(equity, iterations),
      clears: equity >= thresholdPct,
    })
  }

  if (widths.length === 0) return null

  widths.sort((a, b) => a.pct - b.pct)
  const clearing = widths.filter((width) => width.clears)
  const widest = clearing.length > 0 ? clearing[clearing.length - 1] : null

  return {
    widths,
    widest,
    thresholdPct,
    jamRangeLabel: jamRange.label,
    iterations,
  }
}
