/** Evaluate the best 5-card hand from up to 7 cards (0–51 indices). Higher score wins. */
export function evaluate(cards: readonly number[]): number {
  if (cards.length < 5) throw new Error('Need at least 5 cards')
  if (cards.length === 5) return evaluate5(cards)
  let best = 0
  const combo = new Array<number>(5)
  choose5(cards, 0, 0, combo, (five) => {
    const score = evaluate5(five)
    if (score > best) best = score
  })
  return best
}

function choose5(
  cards: readonly number[],
  start: number,
  picked: number,
  combo: number[],
  onComplete: (five: number[]) => void,
): void {
  if (picked === 5) {
    onComplete(combo)
    return
  }
  for (let i = start; i <= cards.length - (5 - picked); i++) {
    combo[picked] = cards[i]
    choose5(cards, i + 1, picked + 1, combo, onComplete)
  }
}

function evaluate5(cards: readonly number[]): number {
  const ranks = cards.map((c) => Math.floor(c / 4))
  const suits = cards.map((c) => c % 4)
  ranks.sort((a, b) => b - a)

  const counts = new Int8Array(13)
  for (const rank of ranks) counts[rank]++

  const isFlush = suits.every((s) => s === suits[0])

  const unique = [...new Set(ranks)].sort((a, b) => b - a)
  let straightHigh = -1

  for (let i = 0; i <= unique.length - 5; i++) {
    if (unique[i] - unique[i + 4] === 4) {
      straightHigh = unique[i]
      break
    }
  }
  if (straightHigh < 0 && unique.includes(12) && unique.includes(3) && unique.includes(2) && unique.includes(1) && unique.includes(0)) {
    straightHigh = 3
  }
  const isStraight = straightHigh >= 0

  const pairs: number[] = []
  const trips: number[] = []
  let quads = -1

  for (let r = 12; r >= 0; r--) {
    if (counts[r] === 4) quads = r
    else if (counts[r] === 3) trips.push(r)
    else if (counts[r] === 2) pairs.push(r)
  }

  const kickers = [...ranks]

  if (isStraight && isFlush) return pack(8, [straightHigh])
  if (quads >= 0) {
    const kicker = kickers.find((r) => r !== quads)!
    return pack(7, [quads, kicker])
  }
  if (trips.length > 0 && pairs.length > 0) return pack(6, [trips[0], pairs[0]])
  if (isFlush) return pack(5, kickers.slice(0, 5))
  if (isStraight) return pack(4, [straightHigh])
  if (trips.length > 0) {
    const k = kickers.filter((r) => r !== trips[0]).slice(0, 2)
    return pack(3, [trips[0], ...k])
  }
  if (pairs.length >= 2) {
    const k = kickers.find((r) => r !== pairs[0] && r !== pairs[1])!
    return pack(2, [pairs[0], pairs[1], k])
  }
  if (pairs.length === 1) {
    const k = kickers.filter((r) => r !== pairs[0]).slice(0, 3)
    return pack(1, [pairs[0], ...k])
  }
  return pack(0, kickers.slice(0, 5))
}

function pack(category: number, kickers: number[]): number {
  let score = category * 1e10
  let mul = 1e8
  for (const k of kickers) {
    score += k * mul
    mul /= 100
  }
  return score
}
