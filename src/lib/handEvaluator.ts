/**
 * Evaluate the best 5-card hand from 5 to 7 cards (0–51 indices). Higher wins.
 *
 * Card index packs rank and suit: `index >> 2` is the rank with the ace at 12
 * and the deuce at 0, `index & 3` is the suit.
 *
 * This reads the hand straight off rank counts and per-suit bitmasks rather
 * than scoring all 21 five-card subsets of a seven-card hand. Equity work
 * calls this millions of times, and the subset version spent its whole budget
 * allocating: two arrays and an Int8Array per subset, 84 allocations per hand.
 * The scores it returns are the same numbers as that version produced, so
 * every comparison anywhere in the app is unaffected.
 */

// Reused across calls so the hot path allocates nothing. Safe because
// evaluation never yields part-way through.
const rankCounts = new Int8Array(13)
const suitCounts = new Int8Array(4)
const suitMasks = new Int32Array(4)
const kickers: number[] = []

export function evaluate(cards: readonly number[]): number {
  if (cards.length < 5) throw new Error('Need at least 5 cards')

  rankCounts.fill(0)
  suitCounts.fill(0)
  suitMasks.fill(0)
  let rankMask = 0

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i]
    const rank = card >> 2
    const suit = card & 3
    rankCounts[rank]++
    suitCounts[suit]++
    suitMasks[suit] |= 1 << rank
    rankMask |= 1 << rank
  }

  let flushSuit = -1
  for (let suit = 0; suit < 4; suit++) {
    if (suitCounts[suit] >= 5) {
      flushSuit = suit
      break
    }
  }

  // A straight flush outranks everything, so it is settled before the counts.
  if (flushSuit >= 0) {
    const high = straightHigh(suitMasks[flushSuit])
    if (high >= 0) return pack(8, [high])
  }

  // One descending pass collects every group the categories below need.
  let quad = -1
  let tripHigh = -1
  let tripLow = -1
  let pairHigh = -1
  let pairLow = -1
  for (let rank = 12; rank >= 0; rank--) {
    switch (rankCounts[rank]) {
      case 4:
        if (quad < 0) quad = rank
        break
      case 3:
        if (tripHigh < 0) tripHigh = rank
        else if (tripLow < 0) tripLow = rank
        break
      case 2:
        if (pairHigh < 0) pairHigh = rank
        else if (pairLow < 0) pairLow = rank
        break
    }
  }

  if (quad >= 0) {
    return pack(7, [quad, highestExcept(rankMask, quad, -1)])
  }

  if (tripHigh >= 0 && (tripLow >= 0 || pairHigh >= 0)) {
    // A second set plays as the pair when it beats the best actual pair.
    const pair = tripLow > pairHigh ? tripLow : pairHigh
    return pack(6, [tripHigh, pair])
  }

  if (flushSuit >= 0) {
    return pack(5, topRanks(suitMasks[flushSuit], 5, -1, -1))
  }

  const straight = straightHigh(rankMask)
  if (straight >= 0) return pack(4, [straight])

  if (tripHigh >= 0) {
    return pack(3, [tripHigh, ...topRanks(rankMask, 2, tripHigh, -1)])
  }

  if (pairHigh >= 0 && pairLow >= 0) {
    return pack(2, [pairHigh, pairLow, highestExcept(rankMask, pairHigh, pairLow)])
  }

  if (pairHigh >= 0) {
    return pack(1, [pairHigh, ...topRanks(rankMask, 3, pairHigh, -1)])
  }

  return pack(0, topRanks(rankMask, 5, -1, -1))
}

/** Highest rank in the mask, skipping up to two excluded ranks. */
function highestExcept(mask: number, skipA: number, skipB: number): number {
  for (let rank = 12; rank >= 0; rank--) {
    if (rank === skipA || rank === skipB) continue
    if (mask & (1 << rank)) return rank
  }
  return -1
}

/** The `count` highest ranks in the mask, descending, skipping exclusions. */
function topRanks(mask: number, count: number, skipA: number, skipB: number): number[] {
  kickers.length = 0
  for (let rank = 12; rank >= 0 && kickers.length < count; rank--) {
    if (rank === skipA || rank === skipB) continue
    if (mask & (1 << rank)) kickers.push(rank)
  }
  return kickers.slice()
}

/** Top card of the best straight in a rank mask, or -1. The wheel reads as 5. */
function straightHigh(mask: number): number {
  for (let high = 12; high >= 4; high--) {
    if (((mask >> (high - 4)) & 0b11111) === 0b11111) return high
  }
  // A2345: the ace plays low, and the five is the top card.
  if (mask & (1 << 12) && (mask & 0b1111) === 0b1111) return 3
  return -1
}

function pack(category: number, ranks: number[]): number {
  let score = category * 1e10
  let mul = 1e8
  for (const rank of ranks) {
    score += rank * mul
    mul /= 100
  }
  return score
}
