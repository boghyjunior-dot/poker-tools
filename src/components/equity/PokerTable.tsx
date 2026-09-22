import { useRef } from 'react'
import { useT } from '../../lib/i18n'
import { useNumberField } from '../../lib/numberField'
import { RANKS, type BoardCard, type SuitId } from '../../types/poker'
import {
  formatAmount,
  type AmountView,
  type Position,
  type Seat,
  type SeatAction,
  type SeatView,
} from '../../lib/tableSpot'

const ACTION_STYLE: Record<SeatAction, string> = {
  fold: 'bg-slate-800 text-slate-500',
  call: 'bg-sky-900/70 text-sky-200',
  raise: 'bg-amber-900/70 text-amber-200',
  shove: 'bg-rose-900/70 text-rose-200',
}

const SUIT_GLYPH: Record<SuitId, string> = { s: '♠', h: '♥', d: '♦', c: '♣' }

/**
 * The discs a dealer puts in front of a seat.
 *
 * The button is white and the blinds are not, the way they look on a real
 * table. They are worth drawing even though the seats are already labelled,
 * because the seat that is yours reads "You" — so without these the one spot
 * where you most need to know whether you are in the blinds is the one spot
 * that does not say.
 */
const DISCS: Partial<Record<Position, { text: string; className: string }>> = {
  BTN: { text: 'D', className: 'border-slate-300 bg-slate-100 text-slate-900' },
  SB: { text: 'SB', className: 'border-slate-500 bg-slate-700 text-slate-100' },
  BB: { text: 'BB', className: 'border-indigo-500 bg-indigo-800 text-indigo-50' },
}

/** Hero's cards on the seat card — A♠ K♥, red suits in red. */
function HandGlyphs({ hand }: { hand?: [BoardCard | null, BoardCard | null] | null }) {
  if (!hand?.[0] || !hand?.[1]) return null
  return (
    <span className="block text-[10px] font-bold leading-tight sm:text-[11px]">
      {[hand[0], hand[1]].map((card, slot) => (
        <span
          key={slot}
          className={
            card.suit === 'h' || card.suit === 'd' ? 'text-rose-300' : 'text-slate-100'
          }
        >
          {slot === 1 ? ' ' : ''}
          {RANKS[card.rank]}
          {SUIT_GLYPH[card.suit]}
        </span>
      ))}
    </span>
  )
}

const ACTION_LABEL: Record<SeatAction, string> = {
  fold: 'Fold',
  call: 'Call',
  raise: 'Raise',
  shove: 'Shove',
}

/**
 * Where something sits on the felt, at a chosen distance from the centre.
 *
 * Hero is rotated to the bottom of the table, the way every poker client puts
 * the player they belong to, so the spot reads the same whichever seat you
 * pick. Without the rotation you have to find yourself before you can read
 * the action, which is exactly the wrong order.
 */
function ringPosition(
  index: number,
  count: number,
  heroIndex: number,
  radiusX: number,
  radiusY: number,
): { x: number; y: number } {
  const anchor = heroIndex >= 0 ? heroIndex : count - 1
  const degrees = 90 + ((index - anchor) * 360) / count
  const radians = (degrees * Math.PI) / 180
  return {
    x: 50 + radiusX * Math.cos(radians),
    y: 50 + radiusY * Math.sin(radians),
  }
}

const CHIP_STYLE: Record<'call' | 'raise' | 'shove', string> = {
  call: 'border-sky-700/70 bg-sky-950/40 text-sky-300 hover:bg-sky-900/60',
  raise: 'border-amber-700/70 bg-amber-950/40 text-amber-300 hover:bg-amber-900/60',
  shove: 'border-rose-700/70 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60',
}

/**
 * The one-press version of an action.
 *
 * Stops the click where it lands, so pressing it never doubles as selecting
 * or claiming the seat underneath. Coloured like the action chip it produces,
 * so pressing one and reading the result are the same colour.
 */
function ActionChip({
  label,
  action,
  onPress,
}: {
  label: string
  action: 'call' | 'raise' | 'shove'
  onPress: () => void
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onPress()
      }}
      className={`w-full rounded border px-1 py-px text-[9px] font-semibold uppercase leading-tight transition-colors ${CHIP_STYLE[action]}`}
    >
      {label}
    </button>
  )
}

/**
 * A tiny number field that lives on a seat card.
 *
 * Carries a tag and a colour, because a selected seat holds up to three of
 * these and they are otherwise identical boxes of digits. The colours are the
 * ones the seat already uses when it is not being edited — white behind,
 * amber in front, fuchsia for the bounty — so editing a seat looks like the
 * seat it was rather than a form that replaced it.
 *
 * Chip amounts follow the chips/BB toggle, so the unit you read a stack in is
 * the unit you type it in. A bounty is money rather than chips and keeps its
 * own scale of 1 whatever the toggle says.
 */
function SeatInput({
  label,
  tag,
  tone,
  value,
  onChange,
  scale = 1,
}: {
  label: string
  /** Two or three characters, shown beside the box. */
  tag: string
  tone: string
  value: number
  onChange: (value: number) => void
  scale?: number
}) {
  const field = useNumberField(value, onChange, scale)
  return (
    <span className="flex items-center gap-0.5">
      <span
        aria-hidden
        className={`w-[15px] shrink-0 text-left text-[8px] font-bold uppercase leading-none ${tone}`}
      >
        {tag}
      </span>
      <input
        type="number"
        aria-label={label}
        {...field}
        className={`w-full min-w-0 rounded border border-slate-600 bg-slate-950/70 px-1 py-0.5 text-center text-[10px] font-semibold tabular-nums [appearance:textfield] focus:border-indigo-500 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${tone}`}
      />
    </span>
  )
}

export function PokerTable({
  seats,
  selected,
  onSelect,
  onPatch,
  onMakeHero,
  onQuickAction,
  potBeforeCall,
  heroCallAmount,
  bigBlind,
  view,
}: {
  seats: SeatView[]
  selected: number
  onSelect: (index: number) => void
  onPatch: (index: number, change: Partial<Seat>) => void
  onMakeHero: (index: number) => void
  /** Set a seat's action and carry the eye to where its range gets chosen. */
  onQuickAction: (index: number, action: 'call' | 'raise' | 'shove') => void
  potBeforeCall: number
  heroCallAmount: number
  bigBlind: number
  view: AmountView
}) {
  const t = useT()

  /**
   * Double-click is detected by hand, because the DOM one cannot work here:
   * the first click selects the seat, which swaps the button for the editing
   * card, so the second click lands on a freshly mounted element — usually
   * the stack field that appeared under the pointer. Pairing clicks by seat
   * and time survives the swap. A pair that starts inside a field is left
   * alone: that is someone selecting a number to retype, not a claim.
   */
  const lastClickRef = useRef<{ index: number; time: number } | null>(null)
  const handleSeatClick = (index: number, event: React.MouseEvent) => {
    const previous = lastClickRef.current
    // The event's own clock, so the pairing window never touches render purity.
    const now = event.timeStamp
    lastClickRef.current = null
    if (previous !== null && previous.index === index && now - previous.time < 400) {
      onMakeHero(index)
      return
    }
    if (!(event.target instanceof HTMLInputElement)) {
      lastClickRef.current = { index, time: now }
    }
    onSelect(index)
  }

  const heroIndex = seats.findIndex((seat) => seat.isHero)
  const amount = (chips: number) => formatAmount(chips, bigBlind, view)
  // What one typed unit is worth in chips, so the fields match the readouts.
  const chipScale = view === 'bb' && bigBlind > 0 ? bigBlind : 1

  return (
    <div className="relative mx-auto aspect-[3/2] w-full min-w-[300px] max-w-[560px]">
      {/* The felt. Purely decorative — every control is a seat. */}
      <div
        aria-hidden
        className="absolute inset-[14%] rounded-[50%] border-2 border-emerald-950 bg-emerald-900/25 shadow-inner"
      />

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-[9px] uppercase tracking-wider text-slate-400">{t('Pot')}</p>
        <p className="text-lg font-bold tabular-nums text-white sm:text-xl">
          {amount(potBeforeCall)}
        </p>
        {heroCallAmount > 0 && (
          <p className="mt-0.5 rounded bg-slate-950/70 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
            {t('{n} to call', { n: amount(heroCallAmount) })}
          </p>
        )}
      </div>

      {/* Button and blinds, on the felt in front of the seats that hold them. */}
      {seats.map((seat, index) => {
        const disc = DISCS[seat.position]
        if (!disc) return null
        const { x, y } = ringPosition(index, seats.length, heroIndex, 26, 24)
        return (
          <span
            key={`disc-${seat.position}`}
            aria-hidden
            style={{ left: `${x}%`, top: `${y}%` }}
            className={`absolute flex h-5 min-w-[20px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border px-1 text-[9px] font-bold shadow ${disc.className}`}
          >
            {disc.text}
          </span>
        )
      })}

      {seats.map((seat, index) => {
        const { x, y } = ringPosition(index, seats.length, heroIndex, 40, 39)
        const dimmed = !seat.isActive

        // Call and raise share a row; the shove gets its own, being the one
        // that ends the hand.
        const quickActions = (seatIndex: number) => (
          <span className="mt-0.5 block space-y-0.5">
            <span className="flex gap-0.5">
              <ActionChip
                label={t('Call')}
                action="call"
                onPress={() => onQuickAction(seatIndex, 'call')}
              />
              <ActionChip
                label={t('Raise')}
                action="raise"
                onPress={() => onQuickAction(seatIndex, 'raise')}
              />
            </span>
            <ActionChip
              label={t('All-in')}
              action="shove"
              onPress={() => onQuickAction(seatIndex, 'shove')}
            />
          </span>
        )

        const positionLabel = (
          <span
            className={`block text-[10px] font-semibold uppercase leading-tight sm:text-[11px] ${
              seat.isHero ? 'text-indigo-300' : 'text-slate-100'
            }`}
          >
            {seat.isHero ? t('You') : seat.position}
          </span>
        )

        const actionChip = !seat.isHero && (
          <span
            className={`mt-0.5 block rounded px-1 py-px text-[9px] font-semibold leading-tight ${ACTION_STYLE[seat.action]}`}
          >
            {t(ACTION_LABEL[seat.action])}
          </span>
        )

        // What this seat has in the middle, drawn the way a client draws the
        // chips in front of a player — including a folded seat, whose money
        // stays in the pot even though the seat is done with the hand.
        const inFront = seat.inFront > 0 && (
          <span
            className={`mt-0.5 block text-[10px] font-semibold tabular-nums leading-tight ${
              seat.isActive ? 'text-amber-300' : 'text-slate-500 line-through'
            }`}
          >
            {amount(seat.inFront)}
          </span>
        )

        // The seat you have picked edits in place: its stack and bounty turn
        // into fields where the numbers were. Every other seat stays a button,
        // so one click is still all it takes to move the editing somewhere
        // else.
        if (index === selected) {
          return (
            <div
              key={seat.position}
              style={{ left: `${x}%`, top: `${y}%` }}
              onClick={(event) => handleSeatClick(index, event)}
              className="absolute w-[74px] -translate-x-1/2 -translate-y-1/2 space-y-0.5 rounded-lg border border-indigo-500 bg-slate-800 px-1.5 py-1 text-center ring-2 ring-indigo-500/40 sm:w-[86px]"
            >
              {positionLabel}
              {seat.isHero && (
                <span className="block text-[9px] leading-tight text-slate-400">
                  {seat.position}
                </span>
              )}
              {seat.isHero && <HandGlyphs hand={seat.hand} />}
              <SeatInput
                label={t('Stack')}
                tag={t('Stk')}
                tone="text-slate-100"
                value={seat.stack}
                onChange={(value) => onPatch(index, { stack: value })}
                scale={chipScale}
              />
              {actionChip}
              {/* Hero edits this too: an open that gets 3-bet is the spot the
                  field exists for. */}
              <SeatInput
                label={t('Chips in')}
                tag={t('Bet')}
                tone="text-amber-300"
                value={seat.inFront}
                onChange={(value) => onPatch(index, { committed: value })}
                scale={chipScale}
              />
              {!seat.isHero && (
                <SeatInput
                  label={t('Bounty')}
                  tag="🎯"
                  tone="text-fuchsia-300"
                  value={seat.bountyAmount}
                  onChange={(value) => onPatch(index, { bountyAmount: value })}
                />
              )}
              {!seat.isHero && quickActions(index)}
            </div>
          )
        }

        return (
          <div
            key={seat.position}
            role="button"
            tabIndex={0}
            onClick={(event) => handleSeatClick(index, event)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelect(index)
              }
            }}
            style={{ left: `${x}%`, top: `${y}%` }}
            className={`absolute w-[74px] -translate-x-1/2 -translate-y-1/2 cursor-pointer select-none rounded-lg border border-slate-700 bg-slate-900 px-1.5 py-1 text-center transition-colors hover:border-slate-500 sm:w-[86px] ${
              dimmed ? 'opacity-80' : ''
            }`}
          >
            {positionLabel}
            {seat.isHero && (
              <span className="block text-[9px] leading-tight text-slate-400">{seat.position}</span>
            )}
            {seat.isHero && <HandGlyphs hand={seat.hand} />}
            <span
              className={`block text-[10px] font-semibold tabular-nums leading-tight sm:text-[11px] ${
                dimmed ? 'text-slate-300' : 'text-slate-100'
              }`}
            >
              {amount(seat.stack)}
            </span>
            {actionChip}
            {inFront}
            {seat.bountyAmount > 0 && !seat.isHero && (
              <span className="mt-0.5 block text-[9px] font-medium leading-tight text-fuchsia-300">
                🎯{' '}
                {/* Money reads as money: 2.50, not 2.5 — but 50 stays 50. */}
                {seat.bountyAmount % 1 === 0 ? seat.bountyAmount : seat.bountyAmount.toFixed(2)}
              </span>
            )}
            {!seat.isHero && quickActions(index)}
          </div>
        )
      })}
    </div>
  )
}
