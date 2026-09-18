import { useT } from '../../lib/i18n'
import { formatAmount, type AmountView, type SeatAction, type SeatView } from '../../lib/tableSpot'

const ACTION_STYLE: Record<SeatAction, string> = {
  fold: 'bg-slate-800 text-slate-500',
  call: 'bg-sky-900/70 text-sky-200',
  raise: 'bg-amber-900/70 text-amber-200',
  shove: 'bg-rose-900/70 text-rose-200',
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

export function PokerTable({
  seats,
  selected,
  onSelect,
  potBeforeCall,
  heroCallAmount,
  bigBlind,
  view,
}: {
  seats: SeatView[]
  selected: number
  onSelect: (index: number) => void
  potBeforeCall: number
  heroCallAmount: number
  bigBlind: number
  view: AmountView
}) {
  const t = useT()
  const heroIndex = seats.findIndex((seat) => seat.isHero)
  const buttonIndex = seats.findIndex((seat) => seat.position === 'BTN')
  const dealerDisc =
    buttonIndex >= 0 ? ringPosition(buttonIndex, seats.length, heroIndex, 26, 24) : null
  const amount = (chips: number) => formatAmount(chips, bigBlind, view)

  return (
    <div className="relative mx-auto aspect-[3/2] w-full min-w-[300px] max-w-[560px]">
      {/* The felt. Purely decorative — every control is a seat button. */}
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

      {/* The dealer button, sitting on the felt in front of the BTN seat. */}
      {dealerDisc && (
        <span
          aria-hidden
          style={{ left: `${dealerDisc.x}%`, top: `${dealerDisc.y}%` }}
          className="absolute flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-[10px] font-bold text-slate-900 shadow"
        >
          D
        </span>
      )}

      {seats.map((seat, index) => {
        const { x, y } = ringPosition(index, seats.length, heroIndex, 40, 39)
        const isSelected = index === selected
        const dimmed = !seat.isActive
        return (
          <button
            key={seat.position}
            type="button"
            onClick={() => onSelect(index)}
            aria-pressed={isSelected}
            style={{ left: `${x}%`, top: `${y}%` }}
            className={`absolute w-[74px] -translate-x-1/2 -translate-y-1/2 rounded-lg border px-1.5 py-1 text-center transition-colors sm:w-[86px] ${
              isSelected
                ? 'border-indigo-500 bg-slate-800 ring-2 ring-indigo-500/40'
                : 'border-slate-700 bg-slate-900 hover:border-slate-500'
            } ${dimmed ? 'opacity-80' : ''}`}
          >
            <span
              className={`block text-[10px] font-semibold uppercase leading-tight sm:text-[11px] ${
                seat.isHero ? 'text-indigo-300' : 'text-slate-100'
              }`}
            >
              {seat.isHero ? t('You') : seat.position}
            </span>
            {seat.isHero && (
              <span className="block text-[9px] leading-tight text-slate-400">{seat.position}</span>
            )}
            <span
              className={`block text-[10px] font-semibold tabular-nums leading-tight sm:text-[11px] ${
                dimmed ? 'text-slate-300' : 'text-slate-100'
              }`}
            >
              {amount(seat.stack)}
            </span>
            {!seat.isHero && (
              <span
                className={`mt-0.5 block rounded px-1 py-px text-[9px] font-semibold leading-tight ${ACTION_STYLE[seat.action]}`}
              >
                {t(ACTION_LABEL[seat.action])}
                {seat.action === 'raise' && seat.raiseTo > 0 ? ` ${amount(seat.raiseTo)}` : ''}
              </span>
            )}
            {seat.bountyAmount > 0 && !seat.isHero && (
              <span className="mt-0.5 block text-[9px] font-medium leading-tight text-fuchsia-300">
                🎯 {seat.bountyAmount}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
