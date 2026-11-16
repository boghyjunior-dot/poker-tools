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
  /** The room it ran in. A last longer is a contest in one room's lobby. */
  site: string
  /** N: how many entered. */
  entrants: number
  /** R: where the player finished. 1 is a win. */
  place: number
  /** Bi: the buy-in the score is measured against. */
  buyIn: number
  /** Bty: bounty money collected. */
  bounties: number
  /**
   * Prize money, with bounties kept out of it.
   *
   * A cash is what the prize pool paid you. Heads are money too and they are
   * counted a line above, but they are not a cash — the same separation the
   * Tracker makes, for the same reason: a schedule of knockouts would
   * otherwise report everybody as cashing half the time.
   */
  cashed: number
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

/**
 * The buy-ins the challenge runs on.
 *
 * A band rather than a guideline: a result outside it does not score, it is
 * simply not part of the competition. That is what keeps a stake multiplier
 * safe to have at all — without a ceiling, "bigger games are worth more" is
 * an instruction to keep moving up until something breaks, and the player it
 * breaks is the one who could least afford to follow it.
 */
export const STAKE_FLOOR = 5
export const STAKE_CEILING = 60

/**
 * How much a stake is worth, as a multiple of the cheapest one that counts.
 *
 * A fourth root, which is deliberately shallow. Because finishing points go
 * as the square root of the field, a factor of f is worth finishing f² higher
 * up: at the fourth root the whole band is 1.86x, so a $60 result matches a
 * $5 one that finished three and a half times deeper. A $5 player having a
 * better night still beats a $60 player having an ordinary one, which is the
 * test the exponent has to pass. At the square root the same gap would be
 * twelve times, and the stake would stop being a nudge and start being the
 * competition.
 */
export const STAKE_EXPONENT = 0.25

export function stakeFactor(buyIn: number): number {
  if (!Number.isFinite(buyIn) || buyIn <= 0) return 1
  // Held inside the band as well as filtered by it: scoring a stray row from
  // outside should be dull rather than spectacular.
  const held = Math.min(STAKE_CEILING, Math.max(STAKE_FLOOR, buyIn))
  return Math.pow(held / STAKE_FLOOR, STAKE_EXPONENT)
}

/** Whether a result is in the challenge at all. */
export function isEligible(result: ChallengeResult): boolean {
  return (
    Number.isFinite(result.buyIn) &&
    result.buyIn >= STAKE_FLOOR &&
    result.buyIn <= STAKE_CEILING
  )
}

/** The results that count. */
export function eligible(results: readonly ChallengeResult[]): ChallengeResult[] {
  return results.filter(isEligible)
}

/** The ones that do not, so a page can say so rather than quietly dropping them. */
export function ineligible(results: readonly ChallengeResult[]): ChallengeResult[] {
  return results.filter((result) => !isEligible(result))
}

/** S = [100·√(N/R) + 25·(Bty/Bi)] × ⁴√(Bi/5) */
export function score(result: ChallengeResult): number {
  return (
    (finishPoints(result.entrants, result.place) +
      bountyPoints(result.bounties, result.buyIn)) *
    stakeFactor(result.buyIn)
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
          // Scaled by the stake like the rest of the result, or the share
          // this reports would not be a share of the total it sits beside.
          bounty: bountyPoints(result.bounties, result.buyIn) * stakeFactor(result.buyIn),
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

/** How the pot splits: half, then a third, then a fifth. */
export const PRIZE_SHARES = [0.5, 0.3, 0.2] as const

/**
 * What each player is owed, by where they finished.
 *
 * Two things this has to get right that a lookup table would not. A tie
 * shares the places it occupies rather than both taking the better one — two
 * players level at the top split first and second between them, and the next
 * player is third, which is how every prize pool in poker has ever worked.
 * And a field smaller than the paid places is scaled back up, because the
 * money people put in is the money that comes out: three places paid out of
 * two entrants would leave a fifth of the pot belonging to nobody.
 */
export function prizes(table: readonly Standing[], format: Format): Map<string, number> {
  const out = new Map<string, number>()
  const paid = Math.min(PRIZE_SHARES.length, table.length)
  if (paid === 0) return out

  const total = pot(table.length, format)
  const awarded = PRIZE_SHARES.slice(0, paid).reduce((sum, share) => sum + share, 0)
  if (total <= 0 || awarded <= 0) return out

  let start = 0
  while (start < table.length) {
    let end = start
    while (end < table.length && table[end].rank === table[start].rank) end += 1

    const shared = PRIZE_SHARES.slice(start, end).reduce((sum, share) => sum + share, 0)
    if (shared > 0) {
      const each = (total * shared) / awarded / (end - start)
      for (let i = start; i < end; i += 1) out.set(table[i].player, each)
    }
    start = end
  }

  return out
}

/**
 * A side contest inside one recurring tournament.
 *
 * A last longer is the simplest competition in poker: everybody signs up for
 * the same event and whoever busts last takes it. No points, no formula, no
 * argument — one tournament, one winner, and a result you know on the night.
 * It sits alongside the points races rather than inside them because it asks
 * a different question: not how well you ran over a season, but who was
 * still in at two in the morning.
 */
export interface LastLongerRules {
  /** The event name as the results spell it. */
  event: string
  /** The room, so the same name in another lobby is a different tournament. */
  site: string
  /** The buy-in, so a satellite or a Mini of the same name is not it. */
  buyIn: number
}

/** The one being run: GGPoker's $54 Daily Main. */
export const DAILY_MAIN: LastLongerRules = {
  event: 'Daily Main',
  site: 'GGPoker',
  buyIn: 54,
}

/**
 * Two, because one person in a tournament is not a last longer.
 *
 * Worth stating rather than leaving implicit: without it, every night the
 * only entrant turned up alone would go in the books as a win, and the
 * standings would reward being the only one awake.
 */
export const MIN_CONTESTED = 2

export function isLastLonger(result: ChallengeResult, rules: LastLongerRules): boolean {
  return (
    result.event === rules.event &&
    result.site === rules.site &&
    result.buyIn === rules.buyIn
  )
}

export interface LastLongerRound {
  date: string
  /** The size of the tournament itself. */
  entrants: number
  /** How many of the challenge field were in it. */
  contested: number
  /**
   * Who lasted longest.
   *
   * A list because the data could say two people finished in the same place,
   * which cannot happen in one tournament and therefore means somebody typed
   * something wrong. Better to show both names than to pick one quietly.
   */
  winners: string[]
  /** The winning finish. */
  place: number
  /**
   * What the winner cashed for that night.
   *
   * Money rather than points, because the last longer is not a points race:
   * it is a tournament everybody entered, and the answer to "what did
   * lasting longest get you" is in dollars. Prize money only — the buy-in is
   * not taken off it and the bounties are not added to it.
   */
  cash: number
}

/**
 * Every night the contest actually ran, newest first.
 *
 * A night with fewer than MIN_CONTESTED entrants is left out entirely rather
 * than recorded as a walkover.
 */
export function lastLongerRounds(
  results: readonly ChallengeResult[],
  rules: LastLongerRules = DAILY_MAIN,
): LastLongerRound[] {
  const nights = new Map<string, ChallengeResult[]>()
  for (const result of results) {
    if (!isLastLonger(result, rules)) continue
    const bucket = nights.get(result.date)
    if (bucket) bucket.push(result)
    else nights.set(result.date, [result])
  }

  const rounds: LastLongerRound[] = []
  for (const [date, field] of nights) {
    if (field.length < MIN_CONTESTED) continue
    const best = Math.min(...field.map((result) => result.place))
    const winners = field.filter((result) => result.place === best)
    rounds.push({
      date,
      entrants: Math.max(...field.map((result) => result.entrants)),
      contested: field.length,
      winners: winners.map((result) => result.player).sort((a, b) => a.localeCompare(b)),
      place: best,
      cash: Math.max(...winners.map((result) => Math.max(0, result.cashed))),
    })
  }

  return rounds.sort((a, b) => b.date.localeCompare(a.date))
}

export interface LastLongerStanding {
  rank: number
  player: string
  /** Nights taken. */
  won: number
  /** Nights played, counting only the ones that were a contest. */
  played: number
  winPct: number
  /** Their deepest finish in the event, won or not. */
  bestPlace: number | null
  /** What the nights they took paid them, in prize money. */
  cashFromWins: number
}

/**
 * The last longer table, most wins first.
 *
 * Sorted on wins rather than on a rate, because a rate off four nights is a
 * sentence about four nights — and the played column is right there for
 * anybody who wants to make that judgement themselves.
 */
export function lastLongerStandings(
  results: readonly ChallengeResult[],
  rules: LastLongerRules = DAILY_MAIN,
): LastLongerStanding[] {
  const rounds = lastLongerRounds(results, rules)
  const contested = new Set(rounds.map((round) => round.date))

  const wins = new Map<string, number>()
  const worth = new Map<string, number>()
  for (const round of rounds) {
    for (const player of round.winners) {
      wins.set(player, (wins.get(player) ?? 0) + 1)
      worth.set(player, (worth.get(player) ?? 0) + round.cash)
    }
  }

  const played = new Map<string, number>()
  const best = new Map<string, number>()
  for (const result of results) {
    if (!isLastLonger(result, rules) || !contested.has(result.date)) continue
    played.set(result.player, (played.get(result.player) ?? 0) + 1)
    best.set(result.player, Math.min(best.get(result.player) ?? Infinity, result.place))
  }

  const rows = [...played.entries()]
    .map(([player, nights]) => ({
      player,
      won: wins.get(player) ?? 0,
      played: nights,
      winPct: nights > 0 ? ((wins.get(player) ?? 0) / nights) * 100 : 0,
      bestPlace: best.get(player) ?? null,
      cashFromWins: worth.get(player) ?? 0,
    }))
    .sort((a, b) => b.won - a.won || a.player.localeCompare(b.player))

  let rank = 0
  let previous: number | null = null
  return rows.map((row, index) => {
    if (previous === null || row.won !== previous) rank = index + 1
    previous = row.won
    return { rank, ...row }
  })
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

/**
 * The season the challenge is running.
 *
 * A year, because the yearly competition is a calendar year and the monthly
 * one is its twelve rounds. Named rather than inferred from the results, so
 * the page has something to show on the first of January: a leaderboard that
 * only exists once somebody has played is a leaderboard nobody can sign up
 * to.
 */
export const SEASON = '2027'

/** The years to offer, newest first, with the season always among them. */
export function seasonYears(
  results: readonly ChallengeResult[],
  season: string = SEASON,
): string[] {
  return [...new Set([season, ...results.map((result) => result.date.slice(0, 4))])].sort((a, b) =>
    b.localeCompare(a),
  )
}

/**
 * The months to offer, newest first: all twelve of the season, plus any month
 * outside it that has results.
 *
 * All twelve from the start, because the monthly race is twelve separate
 * competitions and knowing that March exists is part of deciding whether to
 * enter it.
 */
export function seasonMonths(
  results: readonly ChallengeResult[],
  season: string = SEASON,
): string[] {
  const months = new Set(results.map((result) => result.date.slice(0, 7)))
  for (let month = 1; month <= 12; month += 1) {
    months.add(`${season}-${String(month).padStart(2, '0')}`)
  }
  return [...months].sort((a, b) => b.localeCompare(a))
}

/** The month to open on: the newest with anything in it, else the season's first. */
export function openingMonth(
  results: readonly ChallengeResult[],
  season: string = SEASON,
): string {
  return monthsIn(results)[0] ?? `${season}-01`
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
