import type { BoardCard, RankIndex, SuitId } from '../types/poker'

const SUIT_IDS: SuitId[] = ['s', 'h', 'd', 'c']

export function cardToIndex(card: BoardCard): number {
  const rankIdx = 12 - card.rank
  const suitIdx = SUIT_IDS.indexOf(card.suit)
  return rankIdx * 4 + suitIdx
}

export function indexToCard(index: number): BoardCard {
  const rankIdx = (12 - Math.floor(index / 4)) as RankIndex
  const suit = SUIT_IDS[index % 4]
  return { rank: rankIdx, suit }
}

export function fullDeckIndices(): number[] {
  return Array.from({ length: 52 }, (_, i) => i)
}

export function cardsOverlap(a: readonly number[], b: readonly number[]): boolean {
  const set = new Set(a)
  return b.some((card) => set.has(card))
}
