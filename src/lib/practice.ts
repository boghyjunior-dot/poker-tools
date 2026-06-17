import { formatBoardCard } from './board'
import { getTargetFoldPct } from './mdf'
import { MDF_BETS, SUITS, type BoardCard, type RankIndex, type SuitId } from '../types/poker'

export type PracticeStreet = 'flop' | 'turn' | 'river'

export interface StreetScore {
  street: PracticeStreet
  betLabel: string
  targetPct: number
  actualPct: number
  delta: number
  points: number
}

const ALL_BOARD_CARDS: BoardCard[] = SUITS.flatMap((suit) =>
  Array.from({ length: 13 }, (_, rank) => ({
    rank: rank as RankIndex,
    suit: suit.id as SuitId,
  })),
)

function cardId(card: BoardCard): string {
  return `${card.rank}-${card.suit}`
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

export function randomBetLabel(): string {
  return MDF_BETS[Math.floor(Math.random() * MDF_BETS.length)].label
}

export function randomBoardCards(count: number, existing: BoardCard[] = []): BoardCard[] {
  const used = new Set(existing.map(cardId))
  const deck = shuffle(ALL_BOARD_CARDS.filter((card) => !used.has(cardId(card))))
  return deck.slice(0, count)
}

export function formatBoardLine(board: BoardCard[]): string {
  return board.map(formatBoardCard).join('  ')
}

export function scoreStreet(actualPct: number, targetPct: number): Pick<StreetScore, 'delta' | 'points'> {
  const delta = actualPct - targetPct
  const abs = Math.abs(delta)
  let points = 0
  if (abs <= 1) points = 3
  else if (abs <= 3) points = 2
  else if (abs <= 5) points = 1
  return { delta, points }
}

export function buildStreetScore(
  street: PracticeStreet,
  betLabel: string,
  actualPct: number,
): StreetScore {
  const targetPct = getTargetFoldPct(betLabel)
  const { delta, points } = scoreStreet(actualPct, targetPct)
  return { street, betLabel, targetPct, actualPct, delta, points }
}

export function feedbackMessage(score: StreetScore): string {
  if (score.points === 3) return 'Perfect — within 1% of target.'
  if (score.points === 2) return 'Close — within 3% of target.'
  if (score.points === 1) return 'OK — within 5% of target.'
  return 'Off target — review which combos to fold.'
}

export function nextStreet(street: PracticeStreet): PracticeStreet | null {
  if (street === 'flop') return 'turn'
  if (street === 'turn') return 'river'
  return null
}

export const STREET_ORDER: PracticeStreet[] = ['flop', 'turn', 'river']

export const STREET_LABEL: Record<PracticeStreet, string> = {
  flop: 'Flop',
  turn: 'Turn',
  river: 'River',
}
