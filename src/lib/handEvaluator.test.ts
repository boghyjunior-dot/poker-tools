import { describe, expect, it } from 'vitest'
import { evaluate } from './handEvaluator'

/**
 * Reference implementation: score one five-card hand the slow, obvious way.
 *
 * The fast evaluator reads seven cards off bitmasks in a single pass. This is
 * the version that cannot be clever enough to be wrong, and the differential
 * test below scores every five-card subset with it to check the fast one.
 */
function reference5(cards: readonly number[]): number {
  const ranks = cards.map((c) => Math.floor(c / 4)).sort((a, b) => b - a)
  const suits = cards.map((c) => c % 4)
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
  if (straightHigh < 0 && [12, 3, 2, 1, 0].every((r) => unique.includes(r))) straightHigh = 3
  const isStraight = straightHigh >= 0

  const pairs: number[] = []
  const trips: number[] = []
  let quads = -1
  for (let r = 12; r >= 0; r--) {
    if (counts[r] === 4) quads = r
    else if (counts[r] === 3) trips.push(r)
    else if (counts[r] === 2) pairs.push(r)
  }

  if (isStraight && isFlush) return pack(8, [straightHigh])
  if (quads >= 0) return pack(7, [quads, ranks.find((r) => r !== quads)!])
  if (trips.length > 0 && pairs.length > 0) return pack(6, [trips[0], pairs[0]])
  if (isFlush) return pack(5, ranks.slice(0, 5))
  if (isStraight) return pack(4, [straightHigh])
  if (trips.length > 0) {
    return pack(3, [trips[0], ...ranks.filter((r) => r !== trips[0]).slice(0, 2)])
  }
  if (pairs.length >= 2) {
    return pack(2, [pairs[0], pairs[1], ranks.find((r) => r !== pairs[0] && r !== pairs[1])!])
  }
  if (pairs.length === 1) {
    return pack(1, [pairs[0], ...ranks.filter((r) => r !== pairs[0]).slice(0, 3)])
  }
  return pack(0, ranks.slice(0, 5))
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

/** Best five-card score out of any hand, by brute force over every subset. */
function referenceBest(cards: readonly number[]): number {
  let best = 0
  const combo = new Array<number>(5)
  const walk = (start: number, picked: number) => {
    if (picked === 5) {
      const score = reference5(combo)
      if (score > best) best = score
      return
    }
    for (let i = start; i <= cards.length - (5 - picked); i++) {
      combo[picked] = cards[i]
      walk(i + 1, picked + 1)
    }
  }
  walk(0, 0)
  return best
}

/** `Ah` style notation to a card index, so the cases below read as poker. */
function card(text: string): number {
  const rank = '23456789TJQKA'.indexOf(text[0].toUpperCase())
  const suit = 'shdc'.indexOf(text[1].toLowerCase())
  if (rank < 0 || suit < 0) throw new Error(`bad card ${text}`)
  return rank * 4 + suit
}

const hand = (text: string) => text.split(' ').map(card)

describe('hand categories', () => {
  const category = (text: string) => Math.floor(evaluate(hand(text)) / 1e10)

  it('names every category correctly', () => {
    expect(category('As Ks Qs Js Ts')).toBe(8) // straight flush
    expect(category('Ah Ad Ac As Kh')).toBe(7) // quads
    expect(category('Ah Ad Ac Kh Kd')).toBe(6) // full house
    expect(category('Ah Kh Qh Jh 9h')).toBe(5) // flush
    expect(category('Ah Kd Qc Js Th')).toBe(4) // straight
    expect(category('Ah Ad Ac Kh Qd')).toBe(3) // trips
    expect(category('Ah Ad Kh Kd Qc')).toBe(2) // two pair
    expect(category('Ah Ad Kh Qd Jc')).toBe(1) // pair
    expect(category('Ah Kd Qc Js 9h')).toBe(0) // high card
  })

  it('reads the wheel as a five-high straight, under a six-high one', () => {
    expect(category('As 2h 3d 4c 5s')).toBe(4)
    expect(evaluate(hand('As 2h 3d 4c 5s'))).toBeLessThan(evaluate(hand('2h 3d 4c 5s 6h')))
  })

  it('takes the steel wheel as a straight flush', () => {
    expect(category('As 2s 3s 4s 5s')).toBe(8)
  })

  it('prefers a full house to a flush when seven cards allow both', () => {
    expect(category('Ah Ad As Kh Kd 7h 2h')).toBe(6)
  })

  it('plays the second set as the pair in a full house', () => {
    // Kings full of nines, not nines full of kings.
    expect(evaluate(hand('Kh Kd Kc 9h 9d 9s 2h'))).toBe(evaluate(hand('Kh Kd Kc 9h 9d 4s 2h')))
  })

  it('uses the third pair as the kicker when it is highest', () => {
    // Aces and kings with a queen kicker, from three pairs.
    expect(evaluate(hand('Ah Ad Kh Kd Qh Qd 2s'))).toBe(evaluate(hand('Ah Ad Kh Kd Qh 7c 2s')))
  })
})

describe('against brute force', () => {
  it('matches the reference on every seven-card deal it is given', () => {
    // Deterministic sweep so a failure is reproducible.
    let seed = 12345
    const next = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }

    for (let trial = 0; trial < 4000; trial++) {
      const used = new Set<number>()
      const cards: number[] = []
      while (cards.length < 7) {
        const pick = Math.floor(next() * 52)
        if (used.has(pick)) continue
        used.add(pick)
        cards.push(pick)
      }
      expect(evaluate(cards)).toBe(referenceBest(cards))
    }
  })

  it('matches the reference on five- and six-card hands too', () => {
    let seed = 999
    const next = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }

    for (const size of [5, 6]) {
      for (let trial = 0; trial < 1500; trial++) {
        const used = new Set<number>()
        const cards: number[] = []
        while (cards.length < size) {
          const pick = Math.floor(next() * 52)
          if (used.has(pick)) continue
          used.add(pick)
          cards.push(pick)
        }
        expect(evaluate(cards)).toBe(referenceBest(cards))
      }
    }
  })
})
