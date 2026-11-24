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
  /**
   * The day this was entered into the challenge, if it is known.
   *
   * Not the day it was played — that is `date`. Results arrive after the
   * fact and sometimes in batches, and a competition people pay into should
   * be able to show when each row turned up as well as what it scored.
   */
  added?: string
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
export const STAKE_CEILING = 66

/**
 * How much a stake is worth, as a multiple of the cheapest one that counts.
 *
 * A fourth root, which is deliberately shallow. Because finishing points go
 * as the square root of the field, a factor of f is worth finishing f² higher
 * up: at the fourth root the whole band is a little over 1.9x, so a $60 result matches a
 * cheap one that finished three or four times deeper. A player at the floor
 * having a better night still beats one at the ceiling having an ordinary
 * one, which is the test the exponent has to pass. At the square root the
 * same gap would be an order of magnitude, and the stake would stop being a
 * nudge and start being the competition.
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

/**
 * The scores that made a monthly top ten, pooled across the year.
 *
 * This is what the yearly race counts, and it is not the same as the best
 * fifty of everything. A result has to earn its place twice: once in the
 * month it was played, and again against the other months. The effect is
 * that the monthly race is the qualifier rather than a separate contest —
 * a quiet month cannot be padded out later, and a huge month is capped at
 * ten however many good nights it held.
 */
export function monthlyQualifiers(
  results: readonly ChallengeResult[],
  best: number = FORMATS.monthly.best,
): ChallengeResult[] {
  const buckets = new Map<string, ChallengeResult[]>()
  for (const result of results) {
    const key = `${result.player}|${result.date.slice(0, 7)}`
    const bucket = buckets.get(key)
    if (bucket) bucket.push(result)
    else buckets.set(key, [result])
  }

  const out: ChallengeResult[] = []
  for (const bucket of buckets.values()) {
    out.push(...[...bucket].sort((a, b) => score(b) - score(a)).slice(0, Math.max(0, best)))
  }
  return out
}

export interface HistoryEntry {
  result: ChallengeResult
  score: number
  /** False for a result outside the buy-in band, which scores nothing. */
  counts: boolean
}

/**
 * Every result entered, newest first.
 *
 * Sorted by when it was added rather than when it was played, because that
 * is the question this answers: what has gone in since I last looked. A row
 * with no recorded entry date sorts to the bottom, where it reads as older
 * rather than as a mistake.
 */
export function history(results: readonly ChallengeResult[]): HistoryEntry[] {
  return [...results]
    .sort(
      (a, b) =>
        (b.added ?? '').localeCompare(a.added ?? '') ||
        b.date.localeCompare(a.date) ||
        a.id.localeCompare(b.id),
    )
    .map((result) => ({ result, score: score(result), counts: isEligible(result) }))
}

/**
 * What an invented row's id begins with.
 *
 * Nothing real ever will, so a page can tell whether it is showing a
 * competition or a demonstration of one without being told separately —
 * and the notice clears itself the moment the placeholder rows go, which
 * is the only way a notice like that stays honest.
 */
export const PLACEHOLDER_PREFIX = 'demo-'

export function isPlaceholder(results: readonly ChallengeResult[]): boolean {
  return results.some((result) => result.id.startsWith(PLACEHOLDER_PREFIX))
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
  roster: readonly string[] = [],
): Standing[] {
  // Seeded with everybody entered, so a player who has paid and not yet
  // played is on the table at nought rather than missing from it.
  const byPlayer = new Map<string, ChallengeResult[]>()
  for (const player of roster) byPlayer.set(player, [])
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
        cutoff: counting.length === format.best ? counting[counting.length - 1].total : null,
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

/**
 * Prize money won per player, over whatever results are handed in.
 *
 * Every result counts towards it, not only the ones scoring — a quiet
 * month's cash is still cash, and a figure that moved when a score dropped
 * out of somebody's top ten would be a number nobody could reconcile with
 * their own records.
 *
 * Prize only: bounties are money too and are counted in the points, but
 * they are not a cash, and the buy-ins are not taken off.
 */
export function cashByPlayer(results: readonly ChallengeResult[]): Map<string, number> {
  const out = new Map<string, number>()
  for (const result of results) {
    out.set(result.player, (out.get(result.player) ?? 0) + Math.max(0, result.cashed))
  }
  return out
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
export function prizes(
  table: readonly Standing[],
  format: Format,
  entrants: number = table.length,
): Map<string, number> {
  const out = new Map<string, number>()
  // Somebody who has not scored is not in the money, however few others
  // there are: a prize for nought points would be paid for playing nothing.
  const scoring = table.filter((row) => row.points > 0)
  const paid = Math.min(PRIZE_SHARES.length, scoring.length)
  if (paid === 0) return out

  const total = pot(entrants, format)
  const awarded = PRIZE_SHARES.slice(0, paid).reduce((sum, share) => sum + share, 0)
  if (total <= 0 || awarded <= 0) return out

  let start = 0
  while (start < scoring.length) {
    let end = start
    while (end < scoring.length && scoring[end].rank === scoring[start].rank) end += 1

    const shared = PRIZE_SHARES.slice(start, end).reduce((sum, share) => sum + share, 0)
    if (shared > 0) {
      const each = (total * shared) / awarded / (end - start)
      for (let i = start; i < end; i += 1) out.set(scoring[i].player, each)
    }
    start = end
  }

  return out
}

/**
 * The same split, in whole dollars that add up to the pot.
 *
 * `prizes` works in exact shares, which is right for the arithmetic and
 * wrong for a page. Eleven players at $25 make a $275 pot, and the shares
 * come to $137.50, $82.50 and $55 — rounded one at a time that reads
 * $138, $83 and $55, so anyone adding the column finds a dollar nobody put
 * in. A pot that pays out more than it took is the one mistake a leaderboard
 * people have paid into cannot make.
 *
 * So the dollars are apportioned rather than rounded: everybody takes their
 * floor, and the remainder goes a dollar at a time to the largest fractions,
 * highest finisher first. That is the odd-chip rule every live room already
 * uses, and it means a tie can be split a dollar apart — which is what
 * happens at a real table when the chips do not divide.
 */
export function payouts(
  table: readonly Standing[],
  format: Format,
  entrants: number = table.length,
): Map<string, number> {
  const exact = prizes(table, format, entrants)
  if (exact.size === 0) return exact

  // Walked in table order rather than the map's, so the odd dollar goes up
  // the standings instead of wherever the entries happened to be made.
  const rows = table.filter((row) => exact.has(row.player))

  const whole = new Map<string, number>()
  let handed = 0
  for (const row of rows) {
    const floor = Math.floor(exact.get(row.player) ?? 0)
    whole.set(row.player, floor)
    handed += floor
  }

  const total = Math.round([...exact.values()].reduce((sum, value) => sum + value, 0))
  // A stable sort, so players left on the same fraction keep their order and
  // the dollar goes to the better finish.
  const spare = rows
    .map((row) => ({ player: row.player, part: (exact.get(row.player) ?? 0) % 1 }))
    .sort((a, b) => b.part - a.part)

  for (let i = 0; handed < total && i < spare.length; i += 1) {
    whole.set(spare[i].player, (whole.get(spare[i].player) ?? 0) + 1)
    handed += 1
  }

  return whole
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
/**
 * What the competition is called, wherever it is named.
 *
 * One constant rather than a string in six components, because a half
 * renamed competition is worse than one with the old name throughout.
 */
export const CHALLENGE_NAME = 'MTT December Challenge 2026'

export const SEASON = '2027'

/**
 * The month the challenge opened, ahead of the season proper.
 *
 * December 2026 is a monthly round like any other and is not part of the
 * 2027 yearly race — a year is a year. It is named here so the month picker
 * offers it from the start rather than waiting for somebody to play in it.
 */
export const OPENING_MONTH = '2026-12'

/** The years to offer, newest first, with the season always among them. */
export function seasonYears(
  results: readonly ChallengeResult[],
  season: string = SEASON,
): string[] {
  return [
    ...new Set([
      season,
      OPENING_MONTH.slice(0, 4),
      ...results.map((result) => result.date.slice(0, 4)),
    ]),
  ].sort((a, b) => b.localeCompare(a))
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
  months.add(OPENING_MONTH)
  for (let month = 1; month <= 12; month += 1) {
    months.add(`${season}-${String(month).padStart(2, '0')}`)
  }
  return [...months].sort((a, b) => b.localeCompare(a))
}

/**
 * The year to open on: the newest with anything in it, else the season.
 *
 * The season opens in the December before it, so defaulting to the season
 * year would show an empty table to anybody looking during the only month
 * that has results in it.
 */
export function openingYear(results: readonly ChallengeResult[]): string {
  return yearsIn(results)[0] ?? SEASON
}

/** The month to open on: the newest with anything in it, else the season's first. */
export function openingMonth(results: readonly ChallengeResult[]): string {
  return monthsIn(results)[0] ?? OPENING_MONTH
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
