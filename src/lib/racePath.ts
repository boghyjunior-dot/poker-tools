/**
 * The table as it stood on every night of the period.
 *
 * A leaderboard says who is ahead now. It cannot say who has been ahead, how
 * long they held it, or whether the gap has been closing all month — which
 * is most of what anybody in a season-long race wants to know.
 *
 * Each step is the standings recomputed from the results up to and including
 * that date, using the same `standings` the table uses rather than a running
 * total of its own. That matters because the race is a best-of: points can
 * stand still through a dozen results and then jump, and a cumulative sum
 * would draw a line that was never true.
 */

import { standings, type ChallengeResult, type Format } from './leaderboard'

export interface RaceStep {
  date: string
  /** Points per player as the table stood that evening. */
  points: Map<string, number>
}

/**
 * One step per date anybody played, oldest first.
 *
 * `qualify` is how the period decides which results are scoring — identity
 * for the monthly race, the monthly-top-ten filter for the yearly one. It is
 * applied to the results up to each date rather than to the period as a
 * whole, so a step shows what the table would have said that evening and not
 * what hindsight makes of it.
 */
export function racePath(
  results: readonly ChallengeResult[],
  format: Format,
  roster: readonly string[] = [],
  qualify: (rows: readonly ChallengeResult[]) => readonly ChallengeResult[] = (rows) => rows,
): RaceStep[] {
  const dates = [...new Set(results.map((result) => result.date))].sort()
  if (dates.length === 0) return []

  const ordered = [...results].sort((a, b) => a.date.localeCompare(b.date))
  const steps: RaceStep[] = []

  let taken = 0
  const sofar: ChallengeResult[] = []
  for (const date of dates) {
    while (taken < ordered.length && ordered[taken].date <= date) {
      sofar.push(ordered[taken])
      taken += 1
    }
    const rows = standings(qualify(sofar), format, roster)
    steps.push({ date, points: new Map(rows.map((row) => [row.player, row.points])) })
  }

  return steps
}

/**
 * Who has held the lead, in the order they first took it.
 *
 * The question the chart is really being asked. Somebody top for one evening
 * in March belongs in this list; somebody second all season does not,
 * however close they got.
 */
export function everLed(steps: readonly RaceStep[]): string[] {
  const leaders: string[] = []
  for (const step of steps) {
    let best = 0
    let leader: string | null = null
    for (const [player, points] of step.points) {
      if (points > best) {
        best = points
        leader = player
      }
    }
    if (leader && !leaders.includes(leader)) leaders.push(leader)
  }
  return leaders
}

/** Everybody who has scored at all, weakest last so the leaders draw on top. */
export function runners(steps: readonly RaceStep[]): string[] {
  const last = steps[steps.length - 1]
  if (!last) return []
  return [...last.points.entries()]
    .filter(([, value]) => value > 0)
    .sort((a, b) => a[1] - b[1])
    .map(([player]) => player)
}
