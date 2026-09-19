/**
 * A preflop spot laid out as a table: who did what, for how much, with which
 * range and which bounty.
 *
 * The equity calculator takes a hero, some villains and a pot typed in by
 * hand. That is fine once you already know the pot, but the pot is the part
 * people get wrong — dead blinds get forgotten, antes get counted twice, and
 * the price ends up flattering the call. Here the seats are the input and the
 * pot is derived, so the price cannot disagree with the action.
 *
 * Hero has no action of their own. Hero is the seat being asked whether to
 * call, so what hero has committed is the blind and ante they posted, and the
 * call is what it costs to match the largest bet.
 */

import {
  buildBountyBreakdown,
  requiredEquityPct,
  totalCapturableBountyChips,
  type BountyBreakdown,
} from './equityBounty'
import { formatMoney } from './formatNumber'
import type { RangeCellStates } from './equityRange'
import type { BoardCard } from '../types/poker'

export type TableSize = 6 | 8 | 9

export type Position =
  | 'UTG'
  | 'UTG+1'
  | 'UTG+2'
  | 'LJ'
  | 'HJ'
  | 'CO'
  | 'BTN'
  | 'SB'
  | 'BB'

/**
 * Seats in acting order, shortest table first.
 *
 * Short tables lose the earliest seats rather than the blinds, which is how a
 * table actually empties out.
 */
const SEATS_BY_SIZE: Record<TableSize, Position[]> = {
  6: ['LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  8: ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  9: ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
}

export function seatsForTable(size: TableSize): Position[] {
  return [...SEATS_BY_SIZE[size]]
}

/** What a villain did. Hero has no action — see the module note. */
export type SeatAction = 'fold' | 'call' | 'raise' | 'shove'

export interface Seat {
  position: Position
  stack: number
  /** Bounty in tournament currency; only meaningful on villains. */
  bountyAmount: number
  action: SeatAction
  /**
   * Chips this seat has put in, when you know the number.
   *
   * null reads it off the action instead: a caller matches the bet, a shove
   * is the stack, a fold leaves its blind. Typing a number overrides that,
   * which is the only way to describe the spots the action alone cannot — a
   * seat that raised and then folded to a 3-bet has money in the middle that
   * no action name accounts for, and a limp-caller put in less than the raise
   * that came after them.
   */
  committed: number | null
  /** What a villain shoves, raises or calls with. Hero does not get one. */
  range: RangeCellStates
  /**
   * Hero's exact two cards, half-filled while the picker is open.
   *
   * Hero is a hand and villains are ranges on purpose: you always know your
   * own cards, and you never know theirs — a range for hero only invites
   * averaging over hands you are not actually holding.
   */
  hand?: [BoardCard | null, BoardCard | null] | null
  isHero: boolean
}

/**
 * The ante a structure charges each seat, as a share of the big blind.
 *
 * Ten per cent is the common default. An eight-handed table at 12.5% puts
 * exactly one big blind of antes in the middle, which is the other structure
 * worth having to hand.
 */
export const ANTE_OPTIONS = [0.1, 0.125] as const
export type AntePct = (typeof ANTE_OPTIONS)[number]

/**
 * One number describes the level.
 *
 * The small blind is half the big blind and the ante is a share of it, so
 * asking for either separately only invites a level that could not exist.
 */
export interface Blinds {
  bigBlind: number
  antePct: number
}

/** Half the big blind, rounded to a whole chip the way a structure would. */
export function smallBlindOf(bigBlind: number): number {
  if (!Number.isFinite(bigBlind) || bigBlind <= 0) return 0
  return Math.round(bigBlind / 2)
}

/** What each seat antes, in chips. */
export function anteOf(blinds: Blinds): number {
  if (!Number.isFinite(blinds.bigBlind) || blinds.bigBlind <= 0) return 0
  if (!Number.isFinite(blinds.antePct) || blinds.antePct <= 0) return 0
  return Math.round(blinds.bigBlind * blinds.antePct)
}

export interface SeatView extends Seat {
  /** Chips this seat has put in, ante and dead blinds included. */
  contribution: number
  /** The part of that which was bet rather than forced — what sits in front. */
  inFront: number
  /** Ante this seat posted. Dead money: it buys no part of the current bet. */
  ante: number
  /** Blind this seat posted, which does count toward the bet. */
  blind: number
  /** Still in the hand and able to win it. */
  isActive: boolean
}

export interface SpotDerived {
  seats: SeatView[]
  hero: SeatView | null
  activeVillains: SeatView[]
  /** Largest amount any one seat has committed. */
  currentBet: number
  /** Everything in the middle before hero decides. */
  potBeforeCall: number
  heroCallAmount: number
  /** The pot hero is playing for, their own call included. */
  finalPot: number
  /** Chips that reached the middle from seats that folded. */
  deadChips: number
  /** Equity a call needs on pot odds alone. */
  requiredEquityPct: number
  /** The same threshold once bounties hero can actually win are counted. */
  requiredEquityWithBountyPct: number
  capturableBountyChips: number
  /**
   * The same money in big blinds, which is the unit a bounty is worth judging
   * in: "$2.50" means nothing at the table until you know it is six blinds.
   */
  capturableBountyBB: number
  /** Face value, in buy-in currency, of the bounties hero can actually win. */
  capturableBountyAmount: number
  bountyBreakdown: BountyBreakdown[]
  /** "3.2 : 1" — the price, the way it gets said out loud. */
  potOdds: string
  /** Things that stop the spot being calculable, in the order found. */
  problems: string[]
}

export function newSeat(position: Position, stack: number, bountyAmount = 0): Seat {
  return {
    position,
    stack,
    bountyAmount,
    action: 'fold',
    committed: null,
    range: {},
    hand: null,
    isHero: false,
  }
}

/**
 * What a seat puts up before anyone acts, split by what it buys.
 *
 * An ante is dead money: it goes to the middle and buys no part of the current
 * bet, so a big blind facing a raise still owes the raise less their blind
 * alone. Folding the ante into the blind would quietly discount every call
 * hero makes from the big blind, which is the most common spot there is.
 */
function forcedBets(position: Position, blinds: Blinds): { ante: number; blind: number } {
  const ante = anteOf(blinds)
  let blind = 0
  if (position === 'SB') blind = smallBlindOf(blinds.bigBlind)
  if (position === 'BB') blind = Math.max(0, blinds.bigBlind)
  return { ante, blind }
}

/**
 * The part of a seat's chips that counts toward matching the bet.
 *
 * Capped by what is left of the stack after the ante, because the ante has
 * already left it.
 */
function betPartOf(seat: Seat, ante: number, blind: number, currentBet: number): number {
  const room = Math.max(0, Math.max(0, seat.stack) - ante)
  const typed = seat.committed
  // A seat can never have less in than the blind it was forced to post.
  const atLeastBlind = (value: number) => Math.min(Math.max(value, blind), room)

  switch (seat.action) {
    case 'shove':
      return room
    case 'fold':
      // Chips put in before folding stay in the middle; the blind is the floor.
      return atLeastBlind(typed ?? blind)
    case 'raise':
      return atLeastBlind(typed ?? blind)
    case 'call':
      // Left to itself a caller matches whatever the largest bet turns out to
      // be, so raising someone else later drags the call up with it. A typed
      // number opts out of that, which is what a limp-call needs.
      return atLeastBlind(typed ?? currentBet)
  }
}

function formatOdds(reward: number, risk: number): string {
  if (risk <= 0 || !Number.isFinite(reward / risk)) return '—'
  return `${(reward / risk).toFixed(1)} : 1`
}

/**
 * Work the whole spot out from the seats.
 *
 * `buyIn` and `startingStack` are only needed to price bounties in chips; pass
 * zero for either and the bounty columns simply come out empty.
 */
export function deriveSpot(
  seats: Seat[],
  blinds: Blinds,
  buyIn: number,
  startingStack: number,
): SpotDerived {
  const problems: string[] = []

  const forced = seats.map((seat) => forcedBets(seat.position, blinds))

  // The largest bet has to be known before a call can be priced, and only
  // aggressive actions can set it. A limped pot leaves it at the big blind.
  let currentBet = Math.max(0, blinds.bigBlind)
  seats.forEach((seat, index) => {
    if (seat.isHero) return
    if (seat.action === 'shove' || seat.action === 'raise') {
      currentBet = Math.max(
        currentBet,
        betPartOf(seat, forced[index].ante, forced[index].blind, currentBet),
      )
    }
  })

  const views: SeatView[] = seats.map((seat, index) => {
    const { ante, blind } = forced[index]
    // Hero has not acted: what hero has in is the ante and the blind, no more.
    const betPart = seat.isHero
      ? Math.min(blind, Math.max(0, Math.max(0, seat.stack) - ante))
      : betPartOf(seat, ante, blind, currentBet)
    return {
      ...seat,
      ante: Math.min(ante, Math.max(0, seat.stack)),
      blind,
      contribution: Math.min(ante, Math.max(0, seat.stack)) + betPart,
      inFront: betPart,
      isActive: seat.isHero || seat.action !== 'fold',
    }
  })

  const heroes = views.filter((seat) => seat.isHero)
  if (heroes.length === 0) problems.push('Pick which seat is yours.')
  if (heroes.length > 1) problems.push('Only one seat can be yours.')
  const hero = heroes.length === 1 ? heroes[0] : null

  const activeVillains = views.filter((seat) => !seat.isHero && seat.action !== 'fold')
  if (hero && activeVillains.length === 0) {
    problems.push('Nobody is in the hand with you — give a seat an action other than fold.')
  }

  const potBeforeCall = views.reduce((sum, seat) => sum + seat.contribution, 0)
  const deadChips = views
    .filter((seat) => !seat.isHero && seat.action === 'fold')
    .reduce((sum, seat) => sum + seat.contribution, 0)

  // What it costs to match the bet: the ante is already gone and buys nothing.
  const heroCallAmount = hero
    ? Math.max(
        0,
        Math.min(currentBet, Math.max(0, Math.max(0, hero.stack) - hero.ante)) - hero.blind,
      )
    : 0
  const finalPot = potBeforeCall + heroCallAmount

  if (hero && heroCallAmount === 0 && activeVillains.length > 0) {
    problems.push('There is nothing to call — no seat has bet more than you have posted.')
  }

  const bountyBreakdown = hero
    ? buildBountyBreakdown(
        buyIn,
        startingStack,
        hero.stack,
        activeVillains.map((seat) => ({ stack: seat.stack, bountyAmount: seat.bountyAmount })),
      )
    : []
  const capturableBountyChips = totalCapturableBountyChips(bountyBreakdown)
  // Only bounties on players hero covers: the rest are not hero's to win.
  const capturableBountyAmount = bountyBreakdown
    .filter((row) => row.covered)
    .reduce((sum, row) => sum + row.bountyAmount, 0)

  return {
    seats: views,
    hero,
    activeVillains,
    currentBet,
    potBeforeCall,
    heroCallAmount,
    finalPot,
    deadChips,
    requiredEquityPct: requiredEquityPct(heroCallAmount, finalPot),
    requiredEquityWithBountyPct: requiredEquityPct(
      heroCallAmount,
      finalPot,
      capturableBountyChips,
    ),
    capturableBountyChips,
    capturableBountyBB:
      blinds.bigBlind > 0 ? capturableBountyChips / blinds.bigBlind : 0,
    capturableBountyAmount,
    bountyBreakdown,
    potOdds: formatOdds(finalPot - heroCallAmount, heroCallAmount),
    problems,
  }
}

/** How amounts are shown: raw chips, or multiples of the big blind. */
export type AmountView = 'chips' | 'bb'

/**
 * One amount, in the chosen view.
 *
 * Big blinds keep one decimal until they are large enough that the fraction
 * stops meaning anything — nobody talks about a 112.4 BB stack, but the
 * difference between 8 BB and 8.5 BB is a different shove chart.
 */
export function formatAmount(chips: number, bigBlind: number, view: AmountView): string {
  if (view === 'bb' && bigBlind > 0) {
    const bb = chips / bigBlind
    const text =
      Math.abs(bb) >= 100 ? Math.round(bb).toLocaleString('en-US') : bb.toFixed(1).replace(/\.0$/, '')
    return `${text} BB`
  }
  return formatMoney(chips)
}

/**
 * The bounty a PKO seat starts with, read off the listed buy-in.
 *
 * A listed buy-in like 10.80 carries the 8% fee on top of the money that
 * plays (10.80 = 10 + 8%), and the starting bounty is a quarter of that net:
 * half the net funds the bounty pool, and half of a player's bounty is the
 * cash half a captor is actually paid. So 10.80 → 2.50, not 2.48 — the fee
 * comes off by division because it was added on top, not carved out.
 *
 * Only a default: rooms vary, and every seat's bounty stays editable.
 */
export function defaultBounty(listedBuyIn: number): number {
  if (!Number.isFinite(listedBuyIn) || listedBuyIn <= 0) return 0
  return Math.round((listedBuyIn / 1.08 / 4) * 100) / 100
}
