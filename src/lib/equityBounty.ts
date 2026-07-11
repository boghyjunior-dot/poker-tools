/** PKO: fraction of opponent bounty paid immediately when you eliminate them. */
export const PKO_IMMEDIATE_CAPTURE = 0.5

/** Convert a tournament bounty ($) to chip EV using buy-in and starting stack. */
export function bountyAmountToChips(
  bountyAmount: number,
  buyIn: number,
  startingStack: number,
): number {
  if (!Number.isFinite(bountyAmount) || bountyAmount <= 0) return 0
  if (!Number.isFinite(buyIn) || buyIn <= 0) return 0
  if (!Number.isFinite(startingStack) || startingStack <= 0) return 0
  return bountyAmount * (startingStack / buyIn)
}

export function heroCoversVillain(heroStack: number, villainStack: number): boolean {
  return heroStack >= villainStack
}

export interface StackBountyInput {
  stack: number
  /** Opponent bounty in tournament currency (e.g. dollars). */
  bountyAmount?: number
}

export interface BountyBreakdown {
  villainIndex: number
  bountyAmount: number
  bountyChips: number
  captureChips: number
  covered: boolean
}

export function buildBountyBreakdown(
  buyIn: number,
  startingStack: number,
  heroStack: number,
  villains: StackBountyInput[],
): BountyBreakdown[] {
  return villains.map((villain, index) => {
    const bountyAmount = villain.bountyAmount ?? 0
    const bountyChips = bountyAmountToChips(bountyAmount, buyIn, startingStack)
    const covered = heroCoversVillain(heroStack, villain.stack)
    return {
      villainIndex: index,
      bountyAmount,
      bountyChips,
      captureChips: covered ? PKO_IMMEDIATE_CAPTURE * bountyChips : 0,
      covered,
    }
  })
}

export function totalCapturableBountyChips(breakdown: BountyBreakdown[]): number {
  return breakdown.reduce((sum, row) => sum + row.captureChips, 0)
}

/** Bounty EV expressed as added equity % relative to the pot. */
export function bountyEquityAddPct(avgBountyChips: number, potChips: number): number {
  if (!Number.isFinite(avgBountyChips) || avgBountyChips <= 0) return 0
  if (!Number.isFinite(potChips) || potChips <= 0) return 0
  return (avgBountyChips / potChips) * 100
}

export function totalEquityWithBounty(chipEquityPct: number, bountyEquityAdd: number): number {
  return chipEquityPct + bountyEquityAdd
}

export type CallRecommendation = 'call' | 'fold'

export interface CallEvResult {
  callAmount: number
  evChips: number
  chipEvChips: number
  bountyEvChips: number
  recommendation: CallRecommendation
}

/** EV of calling: equity share of showdown pot minus call, plus bounty EV. */
export function callEvChips(
  chipEquityPct: number,
  showdownPot: number,
  callAmount: number,
  bountyEvChips = 0,
): number {
  if (!Number.isFinite(showdownPot) || showdownPot <= 0) return 0
  if (!Number.isFinite(callAmount) || callAmount <= 0) return 0
  const chipEv = (chipEquityPct / 100) * showdownPot - callAmount
  return chipEv + bountyEvChips
}

export function buildCallEvResult(
  chipEquityPct: number,
  showdownPot: number,
  callAmount: number,
  bountyEvChips = 0,
): CallEvResult {
  const chipEv = callEvChips(chipEquityPct, showdownPot, callAmount, 0)
  const evChips = chipEv + bountyEvChips
  return {
    callAmount,
    evChips,
    chipEvChips: chipEv,
    bountyEvChips,
    recommendation: evChips >= 0 ? 'call' : 'fold',
  }
}

export interface ShowdownPotResult {
  existingPot: number
  contributions: number[]
  playerTotal: number
  potChips: number
  effectiveStack: number
}

/** Showdown pot = existing pot (antes + blinds) + each player's matched all-in contribution. */
export function computeShowdownPot(
  stacks: number[],
  options: {
    existingPot?: number
    heroCallAmount?: number
  } = {},
): ShowdownPotResult {
  if (stacks.length === 0) {
    return { existingPot: 0, contributions: [], playerTotal: 0, potChips: 0, effectiveStack: 0 }
  }

  const existingPot = options.existingPot ?? 0
  const effectiveStack = Math.min(...stacks)
  const heroCall =
    options.heroCallAmount !== undefined && options.heroCallAmount > 0
      ? Math.min(options.heroCallAmount, stacks[0])
      : Math.min(stacks[0], effectiveStack)

  const contributions = stacks.map((stack, index) => {
    if (index === 0) return heroCall
    return Math.min(stack, effectiveStack)
  })

  const playerTotal = contributions.reduce((sum, value) => sum + value, 0)

  return {
    existingPot,
    contributions,
    playerTotal,
    potChips: existingPot + playerTotal,
    effectiveStack,
  }
}
