/**
 * Where a number sits among the others in its column.
 *
 * A leaderboard is read by scanning, and a column of figures all in the same
 * colour has to be read rather than scanned. Three bands — behind, middle,
 * ahead — turn each column into something you take in at a glance and only
 * read when something catches your eye.
 *
 * Relative to the field on screen rather than to any fixed threshold,
 * because there is no absolute number that makes 4,508 points good: it is
 * good if the others are on 3,000 and poor if they are on 9,000, and the
 * column already knows which.
 */

export type Band = 'behind' | 'middle' | 'ahead'

/**
 * The band a value falls in, by its percentile among the column.
 *
 * Ties share a position rather than being broken arbitrarily — a column
 * where everybody has the same figure is a column where nobody is ahead,
 * and colouring one of them green would be inventing a difference.
 */
export function band(
  value: number,
  column: readonly number[],
  higherIsBetter = true,
): Band {
  if (column.length < 2) return 'middle'

  let below = 0
  let equal = 0
  for (const other of column) {
    if (other === value) equal += 1
    else if (higherIsBetter ? other < value : other > value) below += 1
  }
  // Nothing to compare against: every row holds the same number.
  if (equal === column.length) return 'middle'

  const percentile = (below + equal / 2) / column.length
  if (percentile < 1 / 3) return 'behind'
  if (percentile < 2 / 3) return 'middle'
  return 'ahead'
}

/** Text colours for the three bands, red through amber to green. */
export const BAND_TEXT: Record<Band, string> = {
  behind: 'text-rose-400',
  middle: 'text-amber-300',
  ahead: 'text-emerald-400',
}

/** The same, for a figure that should sit quieter than the headline. */
export const BAND_TEXT_SOFT: Record<Band, string> = {
  behind: 'text-rose-400/80',
  middle: 'text-amber-300/80',
  ahead: 'text-emerald-400/80',
}
