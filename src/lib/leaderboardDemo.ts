/**
 * Ten players who never existed, for looking at the challenge with a field in
 * it.
 *
 * The point of the mock field is not decoration, it is calibration. A scoring
 * formula is a set of instructions about how to play, and you cannot read
 * those instructions off the algebra — you read them off a table of people
 * who played differently and see who the rules reward. So these ten are built
 * to disagree with each other: a micro-stakes grinder against a big-field
 * specialist, a bounty hunter against somebody who only plays Sundays, high
 * volume against high skill. Whoever wins, wins because of the formula.
 *
 * Seeded, so the same table comes back every time and a number somebody
 * queries can be reproduced rather than argued about.
 */

import { DAILY_MAIN, type ChallengeResult } from './leaderboard'
import type { PlayerCard } from './playerProfiles'
import { rng } from './seededRandom'

export interface PlayerProfile {
  name: string
  /** How they play, in a line. */
  blurb: string
  /** Tournaments over the whole period. */
  volume: number
  /** Field sizes they play, smallest and largest. */
  field: [number, number]
  /** The buy-in ladder they pick from. */
  buyIns: number[]
  /**
   * How deep they run, as an exponent on a uniform finish.
   *
   * 1 is the average of the field — in a fair field everybody's finishing
   * place is uniform, so 1 means no edge at all. Above 1 skews towards the
   * low numbers, which is what an edge looks like from the outside.
   */
  skill: number
  /** Share of their schedule that carries bounties. */
  bountyShare: number
  /** Typical bounty collection, as a multiple of the buy-in. */
  bountyRate: number
  /** The room most of their volume is in. */
  site: string
  /**
   * How often they turn up for the $54 Daily Main, as a share of nights.
   *
   * Separate from everything else because the last longer is a standing
   * arrangement rather than part of a schedule: somebody who grinds $5 turbos
   * may still fire the Main most nights because it is the one everybody is
   * in, and somebody who plays higher may not bother.
   */
  dailyMain: number
  /** Served path to their picture. Most of the mock field has none. */
  avatar?: string
}

export const PLAYERS: PlayerProfile[] = [
  {
    name: 'Simion',
    blurb: 'Grinds the bottom of the band, every night.',
    volume: 300,
    field: [400, 4000],
    buyIns: [5.5, 11, 22],
    skill: 1.15,
    bountyShare: 0.8,
    bountyRate: 0.4,
    site: 'GGPoker',
    dailyMain: 0.55,
  },
  {
    name: 'Ana R.',
    blurb: 'Big-field specialist: fewer tournaments, enormous ones.',
    volume: 95,
    field: [2000, 15000],
    buyIns: [11, 22, 55],
    skill: 1.35,
    bountyShare: 0.4,
    bountyRate: 0.3,
    site: 'GGPoker',
    dailyMain: 0.3,
  },
  {
    name: 'Sw1ngKKing',
    blurb: 'Bounty hunter: nothing without a head on it.',
    volume: 210,
    field: [300, 2500],
    buyIns: [5.5, 11, 22],
    skill: 1.1,
    bountyShare: 1,
    bountyRate: 0.75,
    site: 'Coin Poker',
    dailyMain: 0.2,
  },
  {
    name: 'Ferdi',
    blurb: 'Mid-stakes regular, deep runs more often than most.',
    volume: 150,
    field: [500, 5000],
    buyIns: [22, 33, 55],
    skill: 1.3,
    bountyShare: 0.55,
    bountyRate: 0.35,
    site: 'GGPoker',
    dailyMain: 0.7,
  },
  {
    name: 'Dana M.',
    blurb: 'Top of the band only, and not often: picks her spots.',
    volume: 48,
    field: [200, 1500],
    buyIns: [33, 55, 60],
    skill: 1.4,
    bountyShare: 0.5,
    bountyRate: 0.3,
    site: 'PokerStars',
    dailyMain: 0.25,
  },
  {
    name: 'Vlad N.',
    blurb: 'Weekends only, and only the majors.',
    volume: 72,
    field: [1500, 9000],
    buyIns: [22, 55],
    skill: 1.25,
    bountyShare: 0.6,
    bountyRate: 0.35,
    site: 'GGPoker',
    dailyMain: 0.35,
  },
  {
    name: 'Iulia S.',
    blurb: 'Steady schedule, mid fields, no heroics.',
    volume: 130,
    field: [400, 3000],
    buyIns: [11, 22],
    skill: 1.2,
    bountyShare: 0.65,
    bountyRate: 0.45,
    site: 'iPoker',
    dailyMain: 0.45,
  },
  {
    name: 'Sorin B.',
    blurb: 'Turbos, eight tables at a time, small fields.',
    volume: 340,
    field: [120, 700],
    buyIns: [5.5, 11],
    skill: 1.05,
    bountyShare: 0.7,
    bountyRate: 0.5,
    site: 'GGPoker',
    dailyMain: 0.6,
  },
  {
    name: 'Petru L.',
    blurb: 'Part-timer: two evenings a week when work allows.',
    volume: 38,
    field: [300, 2500],
    buyIns: [11, 33],
    skill: 1.2,
    bountyShare: 0.6,
    bountyRate: 0.4,
    site: '888 Poker',
    dailyMain: 0.15,
  },
  {
    name: 'Snapper',
    blurb: 'I snap call ya',
    volume: 220,
    field: [300, 3000],
    buyIns: [5.5, 11, 22],
    // Below one: a calling station finishes worse than the field average,
    // which is the whole joke and also what the results should say.
    skill: 0.95,
    bountyShare: 1,
    bountyRate: 0.9,
    site: 'GGPoker',
    dailyMain: 0.85,
    avatar: './players/snapper.webp',
  },
  {
    name: 'Elena D.',
    blurb: 'All-rounder: a bit of everything, most days.',
    volume: 165,
    field: [500, 4000],
    buyIns: [11, 33, 55],
    skill: 1.28,
    bountyShare: 0.7,
    bountyRate: 0.45,
    site: 'GGPoker',
    dailyMain: 0.5,
  },
]

const EVENTS = [
  'Bounty Hunters',
  'Daily Guarantee',
  'Nightly Deepstack',
  'Sunday Major',
  'Turbo Knockout',
  'Big Antes',
  'Mini Main',
  'Global MILLION$',
  'Midnight Turbo',
  'Weekend Special',
]

/** The day `offset` days after `from`. */
function dayAt(from: string, offset: number): string {
  const date = new Date(`${from}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}

const round = (value: number) => Math.round(value * 100) / 100

/** Roughly the share of a field that gets paid. */
const PAID_SHARE = 0.15

/**
 * What the prize pool paid for a finish.
 *
 * A power law over the paid places, which is the shape every tournament
 * payout has: the top of it holds most of the money and the bottom of it
 * hands back rather less than the seat cost. Not any real structure — the
 * point is that a min-cash is a consolation and a win is a month's volume,
 * and anything with that shape will do.
 */
function cashFor(
  entrants: number,
  place: number,
  buyIn: number,
  bounty: boolean,
  random: () => number,
): number {
  const paid = Math.max(1, Math.round(entrants * PAID_SHARE))
  if (place > paid) return 0

  // A knockout tournament puts half the buy-in on heads, so only the other
  // half is in the pool these places are paid out of.
  const pool = entrants * buyIn * (bounty ? 0.5 : 0.93)

  let total = 0
  for (let r = 1; r <= paid; r += 1) total += Math.pow(r, -0.9)
  // A little noise, because no two structures are the same.
  const share = (Math.pow(place, -0.9) / total) * (0.92 + random() * 0.16)
  return round(pool * share)
}

/**
 * A field size, log-uniform between the two ends.
 *
 * Log-uniform rather than flat because tournament fields are: somebody whose
 * range is 400 to 4000 plays far more 600-runners than 3000-runners, and a
 * flat draw would hand them big fields at a rate nobody sees.
 */
function fieldSize(range: [number, number], random: () => number): number {
  const [low, high] = range
  return Math.round(Math.exp(Math.log(low) + random() * (Math.log(high) - Math.log(low))))
}

/**
 * Where they finished.
 *
 * In a field of equals your finishing place is uniform across the field, so
 * the exponent is the whole of the edge: raising a uniform draw to a power
 * above one pulls it towards the front without ever promising anything.
 */
function finishPlace(entrants: number, skill: number, random: () => number): number {
  const draw = Math.pow(Math.max(random(), 1e-9), skill)
  return Math.max(1, Math.min(entrants, Math.ceil(entrants * draw)))
}

/**
 * What they collected in heads.
 *
 * Scaled by how deep they ran, because knockouts and survival are the same
 * thing seen twice — a player still in at the final table has been collecting
 * all night, and one who busted early has not.
 */
function bountiesWon(
  buyIn: number,
  rate: number,
  entrants: number,
  place: number,
  random: () => number,
): number {
  if (buyIn <= 0) return 0
  const depth = 1 - place / entrants
  // Exponential with a mean of one, so most nights are ordinary and the
  // occasional one is not.
  const draw = -Math.log(Math.max(random(), 1e-9))
  const multiple = Math.min(12, rate * draw * (0.4 + 1.8 * depth))
  return round(buyIn * multiple)
}

/**
 * A year of results for the whole mock field.
 *
 * `days` is the window starting at `from`, so a shorter window simply
 * compresses everybody's schedule rather than cutting the field down — the
 * comparison is between players, and it should not change shape because the
 * period did.
 */
export function buildChallengeLog(options: {
  seed: number
  from: string
  days: number
  players?: readonly PlayerProfile[]
}): ChallengeResult[] {
  const { seed, from, days, players = PLAYERS } = options
  const results: ChallengeResult[] = []

  players.forEach((profile, playerIndex) => {
    const random = rng(seed + playerIndex * 7919)
    for (let index = 0; index < profile.volume; index += 1) {
      const entrants = fieldSize(profile.field, random)
      const place = finishPlace(entrants, profile.skill, random)
      const buyIn = profile.buyIns[Math.floor(random() * profile.buyIns.length)]
      const bounty = random() < profile.bountyShare
      results.push({
        id: `c-${playerIndex.toString(36)}-${index.toString(36)}`,
        player: profile.name,
        date: dayAt(from, Math.floor(random() * days)),
        event: EVENTS[Math.floor(random() * EVENTS.length)],
        site: profile.site,
        entrants,
        place,
        buyIn,
        bounties: bounty ? bountiesWon(buyIn, profile.bountyRate, entrants, place, random) : 0,
        cashed: cashFor(entrants, place, buyIn, bounty, random),
      })
    }
  })

  results.push(...buildDailyMains({ seed, from, days, players }))

  return results.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
}

/** Nights the Main does not run, or nobody is about. */
const DARK_NIGHT = 0.08

/**
 * The $54 Daily Main, which everybody plays together.
 *
 * Built as one tournament rather than as ten private ones, because that is
 * the whole point of a last longer: the same field, the same night, and
 * finishing places that can be compared because they came out of the same
 * event. The per-player generator above cannot do that — it gives each player
 * their own field size for what is supposed to be one tournament — so the
 * Main is built from the outside in: the field first, then who was in it,
 * then where each of them finished.
 */
export function buildDailyMains(options: {
  seed: number
  from: string
  days: number
  players?: readonly PlayerProfile[]
}): ChallengeResult[] {
  const { seed, from, days, players = PLAYERS } = options
  const random = rng(seed + 104729)
  const out: ChallengeResult[] = []

  for (let day = 0; day < days; day += 1) {
    if (random() < DARK_NIGHT) continue

    const entrants = Math.round(600 + random() * 1900)
    const field = players.filter((profile) => random() < profile.dailyMain)
    // One person is not a last longer, and the contest is the only reason
    // this event is generated separately at all.
    if (field.length < 2) continue

    const date = dayAt(from, day)
    const taken = new Set<number>()

    field.forEach((profile, index) => {
      // Distinct places: two people cannot finish 40th in the same
      // tournament, so a collision is nudged down rather than left to look
      // like a tie nobody can explain.
      let place = finishPlace(entrants, profile.skill, random)
      while (taken.has(place)) place += 1
      taken.add(place)

      out.push({
        id: `m-${day.toString(36)}-${index.toString(36)}`,
        player: profile.name,
        date,
        event: DAILY_MAIN.event,
        site: DAILY_MAIN.site,
        entrants,
        place,
        buyIn: DAILY_MAIN.buyIn,
        bounties: bountiesWon(DAILY_MAIN.buyIn, 0.35, entrants, place, random),
        cashed: cashFor(entrants, place, DAILY_MAIN.buyIn, true, random),
      })
    })
  }

  return out
}

/**
 * The mock field's profiles, which are the same ten blurbs the generator
 * already uses to decide how they play.
 *
 * Kept as a derived list rather than a second table of names, so a player
 * cannot end up with a bio that disagrees with their results.
 */
export const DEMO_PROFILES: PlayerCard[] = PLAYERS.map((profile) => ({
  name: profile.name,
  description: profile.blurb,
  avatar: profile.avatar,
}))
