/**
 * The MTT Challenge: a points race over tournament results.
 *
 * Two competitions run off the same results. The monthly one counts each
 * player's best ten scores in a calendar month; the yearly one counts their
 * best fifty in a calendar year. Entry is paid per competition, so the pot is
 * simply the fee times the number of people in it.
 *
 * Counting a fixed number of best scores rather than every result is what
 * makes the two tables worth entering separately. A sum of everything is a
 * volume contest and nothing else — whoever fires the most tournaments wins
 * it — while best-of-ten asks for ten good nights, which somebody playing
 * four tournaments a week can produce and somebody playing forty cannot
 * guarantee. It also means that once a player has filled their ten, a new
 * result only matters if it beats the worst one they are already counting,
 * which is the number this module calls the cutoff.
 */

/**
 * One tournament a player finished, as the challenge needs it.
 *
 * Deliberately not the Tracker's `Entry`: scoring needs the field size, and
 * the Tracker has never asked for one. Anything feeding this will have to
 * supply N, which is the one piece of data a results log usually throws away.
 */
export interface ChallengeResult {
  id: string
  player: string
  /** ISO date, day resolution. */
  date: string
  event: string
  /** N: how many entered. */
  entrants: number
  /** R: where the player finished. 1 is a win. */
  place: number
  /** Bi: the buy-in the score is measured against. */
  buyIn: number
  /** Bty: bounty money collected. */
  bounties: number
}

/** The part of a score that comes from how deep you ran in how big a field. */
export function finishPoints(entrants: number, place: number): number {
  const field = Number.isFinite(entrants) && entrants > 0 ? entrants : 1
  const finish = Number.isFinite(place) && place > 0 ? place : field
  // A place below the field size is bad data rather than a worse result, so
  // the ratio floors at 1: last of the field is worth 100 and nothing less.
  return 100 * Math.sqrt(Math.max(1, field / finish))
}

/**
 * The part that comes from bounties, as a multiple of the buy-in.
 *
 * A ratio rather than an amount, so a $5 PKO and a $500 one are asking the
 * same thing of the player: collect heads worth more than your seat. Without
 * it the bounty term would just be another way of saying "play higher".
 */
export function bountyPoints(bounties: number, buyIn: number): number {
  if (!Number.isFinite(buyIn) || buyIn <= 0) return 0
  if (!Number.isFinite(bounties) || bounties <= 0) return 0
  return 25 * (bounties / buyIn)
}

/** S = 100·√(N/R) + 25·(Bty/Bi) */
export function score(result: ChallengeResult): number {
  return (
    finishPoints(result.entrants, result.place) +
    bountyPoints(result.bounties, result.buyIn)
  )
}

export type FormatId = 'monthly' | 'yearly'

export interface Format {
  id: FormatId
  label: string
  /** How many of a player's best scores count. */
  best: number
  /** What it costs to enter, per period. */
  fee: number
  /** How long a period runs, for the labels. */
  period: 'month' | 'year'
}

export const FORMATS: Record<FormatId, Format> = {
  monthly: { id: 'monthly', label: 'Monthly', best: 10, fee: 25, period: 'month' },
  yearly: { id: 'yearly', label: 'Yearly', best: 50, fee: 100, period: 'year' },
}

export interface Standing {
  rank: number
  player: string
  /** The sum of their best scores, up to the format's limit. */
  points: number
  /** How many scores are counting. Below the limit means room to improve. */
  counted: number
  /** How many they played in the period. */
  played: number
  /** Their single best score. */
  best: number
  /**
   * The lowest score currently counting, once they have filled their quota.
   *
   * Null while they still have room, because then anything at all helps. Once
   * it has a value it is the bar: a new result under it changes nothing.
   */
  cutoff: number | null
  /** How much of the total came from the bounty term. */
  fromBounties: number
}

/**
 * The table, best first.
 *
 * Ties share a rank and the one after them is pushed down, so two players on
 * the same points are first and first, and the next is third. Alphabetical
 * within a tie: there is no tiebreak in the rules, and inventing one here
 * would quietly decide who gets paid.
 */
export function standings(
  results: readonly ChallengeResult[],
  format: Format,
): Standing[] {
  const byPlayer = new Map<string, ChallengeResult[]>()
  for (const result of results) {
    const bucket = byPlayer.get(result.player)
    if (bucket) bucket.push(result)
    else byPlayer.set(result.player, [result])
  }

  const rows = [...byPlayer.entries()]
    .map(([player, played]) => {
      const scored = played
        .map((result) => ({
          total: score(result),
          bounty: bountyPoints(result.bounties, result.buyIn),
        }))
        .sort((a, b) => b.total - a.total)
      const counting = scored.slice(0, format.best)

      return {
        player,
        points: counting.reduce((sum, entry) => sum + entry.total, 0),
        counted: counting.length,
        played: played.length,
        best: counting.length > 0 ? counting[0].total : 0,
        cutoff:
          counting.length === format.best ? counting[counting.length - 1].total : null,
        fromBounties: counting.reduce((sum, entry) => sum + entry.bounty, 0),
      }
    })
    .sort((a, b) => b.points - a.points || a.player.localeCompare(b.player))

  let rank = 0
  let previous: number | null = null
  return rows.map((row, index) => {
    if (previous === null || row.points !== previous) rank = index + 1
    previous = row.points
    return { rank, ...row }
  })
}

/** What the entrants have put in. */
export function pot(entrants: number, format: Format): number {
  return Math.max(0, entrants) * format.fee
}

/** Results inside one calendar month, given as YYYY-MM. */
export function inMonth(
  results: readonly ChallengeResult[],
  month: string,
): ChallengeResult[] {
  return results.filter((result) => result.date.slice(0, 7) === month)
}

/** Results inside one calendar year, given as YYYY. */
export function inYear(
  results: readonly ChallengeResult[],
  year: string,
): ChallengeResult[] {
  return results.filter((result) => result.date.slice(0, 4) === year)
}

/** Every month with a result in it, newest first. */
export function monthsIn(results: readonly ChallengeResult[]): string[] {
  return [...new Set(results.map((result) => result.date.slice(0, 7)))].sort((a, b) =>
    b.localeCompare(a),
  )
}

/** Every year with a result in it, newest first. */
export function yearsIn(results: readonly ChallengeResult[]): string[] {
  return [...new Set(results.map((result) => result.date.slice(0, 4)))].sort((a, b) =>
    b.localeCompare(a),
  )
}

/**
 * The results a player is counting, best first.
 *
 * For showing somebody why they are where they are — a standing is a sum, and
 * a sum with no working shown is the quickest way to an argument about
 * whether the table is right.
 */
export function countedFor(
  results: readonly ChallengeResult[],
  player: string,
  format: Format,
): { result: ChallengeResult; score: number }[] {
  return results
    .filter((result) => result.player === player)
    .map((result) => ({ result, score: score(result) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, format.best)
}
