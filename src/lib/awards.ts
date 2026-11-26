/**
 * Titles for the things the standings do not reward.
 *
 * One player wins the month and ten do not, and the table has nothing to say
 * to the ten. These do: they are read off the same results, they are decided
 * rather than voted on, and each one asks a question the points deliberately
 * ignore — how big a field you beat, where your points came from, and
 * whether your month was ten good nights or one great one.
 *
 * Every title is held by exactly one player or by nobody. A title shared
 * four ways is not a title, and the tie-breaks here are alphabetical for the
 * same reason the standings are: inventing a rule to settle it would be
 * deciding something the rules do not.
 */

import { countedFor, type ChallengeResult, type Format, type Standing } from './leaderboard'

export type AwardId = 'giantKiller' | 'bountyHunter' | 'consistent' | 'oneHitWonder'

/** The names, in the order a profile shows them. */
export const AWARD_IDS: readonly AwardId[] = [
  'giantKiller',
  'bountyHunter',
  'consistent',
  'oneHitWonder',
]

export const AWARD_LABELS: Record<AwardId, string> = {
  giantKiller: 'Giant Killer',
  bountyHunter: 'Bounty Hunter',
  consistent: 'Mr. Consistent',
  oneHitWonder: 'One Hit Wonder',
}

export interface Award {
  id: AwardId
  player: string
  /**
   * What it was won with: a place for the finish, a fraction for the two
   * that are shares. Which one is the award's own business.
   */
  value: number
  /** The field behind the finish. Only the Giant Killer has one. */
  entrants?: number
}

/**
 * How uneven a set of scores is, as a fraction of their average.
 *
 * Relative rather than absolute, because an absolute spread hands the title
 * to whoever is uniformly worst: ten scores around 150 sit closer together
 * than ten around 1,500 by any difference you can measure, and nobody thinks
 * that is the steadier month. Dividing by the mean asks the question people
 * actually mean — did your nights look like each other.
 *
 * Nought for a single score, which has nothing to be uneven with. The caller
 * decides whether that counts as consistency; this will not claim it does.
 */
export function spread(scores: readonly number[]): number {
  if (scores.length < 2) return 0
  const mean = scores.reduce((sum, value) => sum + value, 0) / scores.length
  if (mean <= 0) return 0
  const variance =
    scores.reduce((sum, value) => sum + (value - mean) ** 2, 0) / scores.length
  return Math.sqrt(variance) / mean
}

/**
 * The best finish in the biggest field anybody played.
 *
 * The field is the period's largest, not each player's own: the title is for
 * going deep in the room everybody was afraid of, so the comparison has to
 * be against the same room. If one person played it alone they hold it by
 * default, which is fair enough — they were the only one who turned up.
 */
function giantKiller(results: readonly ChallengeResult[]): Award | null {
  let biggest = 0
  for (const result of results) {
    if (Number.isFinite(result.entrants) && result.entrants > biggest) biggest = result.entrants
  }
  if (biggest <= 0) return null

  let held: ChallengeResult | null = null
  for (const result of results) {
    if (result.entrants !== biggest) continue
    if (
      held === null ||
      result.place < held.place ||
      (result.place === held.place && result.player.localeCompare(held.player) < 0)
    ) {
      held = result
    }
  }
  if (held === null) return null

  return { id: 'giantKiller', player: held.player, value: held.place, entrants: biggest }
}

/** The largest share of a total that came out of the bounty term. */
function bountyHunter(table: readonly Standing[]): Award | null {
  let held: Award | null = null
  for (const row of table) {
    if (row.points <= 0 || row.fromBounties <= 0) continue
    const share = row.fromBounties / row.points
    if (held === null || share > held.value) {
      held = { id: 'bountyHunter', player: row.player, value: share }
    }
  }
  return held
}

/**
 * The players a full-quota title can go to.
 *
 * A full quota is the condition, not a detail: somebody with three results
 * has three nights that happen to look alike, and calling that the steadiest
 * month in the competition would be rewarding a small sample rather than a
 * consistent one.
 *
 * Two of them, at least. A title with one candidate has not been won by
 * anybody — and in an early month, when one player alone has filled their
 * ten, it would hand them both of these at once: the steadiest month in the
 * competition and the most one-sided, which cannot both be true of anyone.
 */
function qualified(
  results: readonly ChallengeResult[],
  table: readonly Standing[],
  format: Format,
): { player: string; scores: number[]; points: number; best: number }[] {
  if (format.best < 2) return []

  const rows = table
    .filter((row) => row.counted >= format.best && row.points > 0)
    .map((row) => ({
      player: row.player,
      scores: countedFor(results, row.player, format).map((entry) => entry.score),
      points: row.points,
      best: row.best,
    }))
    .filter((row) => row.scores.length >= 2)

  return rows.length >= 2 ? rows : []
}

/** The tightest spread across a full quota of counting scores. */
function consistent(
  rows: ReturnType<typeof qualified>,
): Award | null {
  let held: Award | null = null
  for (const row of rows) {
    const value = spread(row.scores)
    if (held === null || value < held.value) {
      held = { id: 'consistent', player: row.player, value }
    }
  }
  return held
}

/**
 * The total leaning hardest on a single night.
 *
 * The other end of the same question Mr. Consistent asks, and the funnier
 * end: a best score that is most of a total is a month somebody spiked in
 * week one and has been living off since. A share rather than the score
 * itself, so it is about the shape of the month and not about who is
 * winning — the leader has the biggest best score almost by definition.
 */
function oneHitWonder(rows: ReturnType<typeof qualified>): Award | null {
  let held: Award | null = null
  for (const row of rows) {
    const value = row.best / row.points
    if (held === null || value > held.value) {
      held = { id: 'oneHitWonder', player: row.player, value }
    }
  }
  return held
}

/**
 * Every title that has an owner, over one period's results.
 *
 * Handed the same results the standings were built from rather than the raw
 * log, so a title can never be won on a result the table did not count.
 */
export function awards(
  results: readonly ChallengeResult[],
  table: readonly Standing[],
  format: Format,
): Award[] {
  const rows = qualified(results, table, format)
  const found = [
    giantKiller(results),
    bountyHunter(table),
    consistent(rows),
    oneHitWonder(rows),
  ]
  return found.filter((award): award is Award => award !== null)
}

/** The titles one player holds, in the order a profile shows them. */
export function awardsFor(all: readonly Award[], player: string): Award[] {
  const held = all.filter((award) => award.player === player)
  return AWARD_IDS.map((id) => held.find((award) => award.id === id)).filter(
    (award): award is Award => award !== undefined,
  )
}
