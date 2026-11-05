/**
 * Axis arithmetic, so charts agree with each other.
 *
 * Nothing here is clever: it rounds a range outwards to tick marks a person
 * can read. It is a module rather than three lines inside each chart because
 * two charts that round differently look like they disagree about the data,
 * and on a stats page that is the one thing they must never do.
 */

/** Round a span up to a readable 1 / 2 / 5 x 10^n step. */
export function niceStep(span: number, targetTicks: number): number {
  if (!Number.isFinite(span) || span <= 0) return 1
  const ticks = Number.isFinite(targetTicks) && targetTicks > 0 ? targetTicks : 1
  const raw = span / ticks
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)))
  const scaled = raw / magnitude
  const step = scaled >= 5 ? 10 : scaled >= 2 ? 5 : scaled >= 1 ? 2 : 1
  return step * magnitude
}

export interface Bounds {
  min: number
  max: number
  step: number
  ticks: number[]
}

/**
 * Axis bounds snapped outwards to whole steps, always including zero.
 *
 * Zero is forced in because every axis on the Stats page is a profit or a
 * rate: a chart of losses that starts at the smallest loss hides the fact
 * that all of it is below the line, which is the first thing you want to see.
 */
export function niceBounds(min: number, max: number, targetTicks = 5): Bounds {
  const lo = Math.min(0, Number.isFinite(min) ? min : 0)
  const hi = Math.max(0, Number.isFinite(max) ? max : 0)
  const span = hi - lo || Math.abs(hi) || 1
  const step = niceStep(span, targetTicks)

  // Trimmed, because a step of 0.1 otherwise produces a tick labelled
  // 0.30000000000000004, which is its own bug report.
  const trim = (value: number) => Number(value.toFixed(10))

  const low = trim(Math.floor(lo / step) * step)
  let high = trim(Math.ceil(hi / step) * step)
  if (high === low) high = trim(low + step)

  const ticks: number[] = []
  const count = Math.round((high - low) / step)
  for (let i = 0; i <= count; i += 1) ticks.push(trim(low + i * step))

  return { min: low, max: high, step, ticks }
}
