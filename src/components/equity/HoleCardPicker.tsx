import { useEffect, useMemo, useState } from 'react'
import { RANKS, SUITS, SUIT_FOUR_COLOR, type BoardCard, type RankIndex, type SuitId } from '../../types/poker'
import { boardCardId } from '../../lib/board'
import { cardFromRankSuit, PlayingCard } from '../PlayingCard'

interface HoleCardPickerProps {
  cards: [BoardCard | null, BoardCard | null]
  onChange: (cards: [BoardCard | null, BoardCard | null]) => void
  takenCards?: BoardCard[]
}

export function HoleCardPicker({ cards, onChange, takenCards = [] }: HoleCardPickerProps) {
  const [activeSlot, setActiveSlot] = useState<0 | 1 | null>(null)
  const takenIds = useMemo(() => new Set(takenCards.map(boardCardId)), [takenCards])

  const isTaken = (card: BoardCard, slot: 0 | 1 | null) => {
    const id = boardCardId(card)
    if (takenIds.has(id)) return true
    const otherSlot = slot === 0 ? 1 : 0
    const other = slot !== null ? cards[otherSlot] : null
    return other !== null && boardCardId(other) === id
  }

  const closePicker = () => setActiveSlot(null)

  const selectCard = (rank: RankIndex, suit: SuitId) => {
    if (activeSlot === null) return
    const card = cardFromRankSuit(rank, suit)
    if (isTaken(card, activeSlot)) return

    const otherSlot = activeSlot === 0 ? 1 : 0
    const otherCard = cards[otherSlot]
    const next: [BoardCard | null, BoardCard | null] = [cards[0], cards[1]]
    next[activeSlot] = card
    onChange(next)
    setActiveSlot(otherCard ? null : otherSlot)
  }

  useEffect(() => {
    if (activeSlot === null) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePicker()
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [activeSlot])

  return (
    <>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          {([0, 1] as const).map((slot) => {
            const card = cards[slot]
            if (card) {
              return (
                <PlayingCard
                  key={slot}
                  card={card}
                  size="lg"
                  variant="board"
                  onClick={() => setActiveSlot(slot)}
                  title={`Change card ${slot + 1}`}
                />
              )
            }
            return (
              <button
                key={slot}
                type="button"
                onClick={() => setActiveSlot(slot)}
                className="min-w-[3.5rem] rounded-lg border-2 border-dashed border-slate-600 bg-slate-800/40 px-4 py-3 text-center transition-all hover:border-slate-500 sm:min-w-[5.5rem] sm:h-[5rem]"
              >
                <span className="text-base font-medium text-slate-500">Card {slot + 1}</span>
              </button>
            )
          })}
          {(cards[0] || cards[1]) && (
            <button
              type="button"
              onClick={() => {
                onChange([null, null])
                closePicker()
              }}
              className="text-sm text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {!cards[0] && !cards[1] && (
          <p className="text-sm text-slate-500">Tap a card slot to open the picker.</p>
        )}
      </div>

      {activeSlot !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Pick card ${activeSlot + 1}`}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close picker"
            onClick={closePicker}
          />

          <div className="relative z-10 w-full max-w-3xl rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-200">
                Pick card {activeSlot + 1}
              </span>
              <button
                type="button"
                onClick={closePicker}
                className="rounded-md px-2 py-1 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                Close
              </button>
            </div>

            <div
              className="grid gap-1.5"
              style={{ gridTemplateColumns: `repeat(${RANKS.length}, minmax(0, 1fr))` }}
            >
              {RANKS.map((rank) => (
                <div
                  key={rank}
                  className="flex h-8 items-center justify-center text-sm font-bold text-slate-400"
                >
                  {rank}
                </div>
              ))}
              {SUITS.map((suit) =>
                RANKS.map((_, rankIdx) => {
                  const card = cardFromRankSuit(rankIdx as RankIndex, suit.id)
                  const taken = isTaken(card, activeSlot)
                  const isCurrent =
                    cards[activeSlot] !== null &&
                    boardCardId(cards[activeSlot]!) === boardCardId(card)
                  const colors = SUIT_FOUR_COLOR[suit.id]
                  return (
                    <button
                      key={`${suit.id}-${rankIdx}`}
                      type="button"
                      disabled={taken}
                      onClick={() => selectCard(rankIdx as RankIndex, suit.id)}
                      className={`flex h-10 items-center justify-center rounded-md border text-base font-bold transition-colors sm:h-11 sm:text-lg ${
                        taken
                          ? 'cursor-not-allowed border-slate-800 bg-slate-900 opacity-30'
                          : isCurrent
                            ? 'border-blue-400 bg-white ring-2 ring-blue-400/50'
                            : `${colors.deckBg} ${colors.deckBorder} ${colors.text} hover:brightness-125`
                      }`}
                    >
                      {RANKS[rankIdx]}
                      {suit.symbol}
                    </button>
                  )
                }),
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
