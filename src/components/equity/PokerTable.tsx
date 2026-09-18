import { formatMoney } from '../../lib/formatNumber'
import { useT } from '../../lib/i18n'
import type { SeatAction, SeatView } from '../../lib/tableSpot'

const ACTION_STYLE: Record<SeatAction, string> = {
  fold: 'bg-slate-800 text-slate-500',
  call: 'bg-sky-900/70 text-sky-300',
  raise: 'bg-amber-900/70 text-amber-300',
  shove: 'bg-rose-900/70 text-rose-300',
}

const ACTION_LABEL: Record<SeatAction, string> = {
  fold: 'Fold',
  call: 'Call',
  raise: 'Raise',
  shove: 'Shove',
}

/**
 * Where a seat sits on the felt.
 *
 * Hero is rotated to the bottom of the table, the way every poker client puts
 * the player they belong to, so the spot reads the same whichever seat you
 * pick. Without the rotation you have to find yourself before you can read the
 * action, which is exactly the wrong order.
 */
function seatPosition(index: number, count: number, heroIndex: number): { x: number; y: number } {
  const anchor = heroIndex >= 0 ? heroIndex : count - 1
  const degrees = 90 + ((index - anchor) * 360) / count
  const radians = (degrees * Math.PI) / 180
  return {
    x: 50 + 40 * Math.cos(radians),
    y: 50 + 39 * Math.sin(radians),
  }
}

export function PokerTable({
  seats,
  selected,
  onSelect,
  potBeforeCall,
  heroCallAmount,
}: {
  seats: SeatView[]
  selected: number
  onSelect: (index: number) => void
  potBeforeCall: number
  heroCallAmount: number
}) {
  const t = useT()
  const heroIndex = seats.findIndex((seat) => seat.isHero)

  return (
    <div className="relative mx-auto aspect-[3/2] w-full min-w-[300px] max-w-[560px]">
      {/* The felt. Purely decorative — every control is a seat button. */}
      <div
        aria-hidden
        className="absolute inset-[14%] rounded-[50%] border-2 border-emerald-950 bg-emerald-900/25 shadow-inner"
      />

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-[9px] uppercase tracking-wider text-slate-500">{t('Pot')}</p>
        <p className="text-lg font-bold tabular-nums text-white sm:text-xl">
          {formatMoney(potBeforeCall)}
        </p>
        {heroCallAmount > 0 && (
          <p className="mt-0.5 rounded bg-slate-950/70 px-2 py-0.5 text-[10px] font-medium text-amber-300">
            {t('{n} to call', { n: formatMoney(heroCallAmount) })}
          </p>
        )}
      </div>

      {seats.map((seat, index) => {
        const { x, y } = seatPosition(index, seats.length, heroIndex)
        const isSelected = index === selected
        const dimmed = !seat.isActive
        return (
          <button
            key={seat.position}
            type="button"
            onClick={() => onSelect(index)}
            aria-pressed={isSelected}
            style={{ left: `${x}%`, top: `${y}%` }}
            className={`absolute w-[74px] -translate-x-1/2 -translate-y-1/2 rounded-lg border px-1.5 py-1 text-center transition-colors sm:w-[84px] ${
              isSelected
                ? 'border-indigo-500 bg-slate-800 ring-2 ring-indigo-500/40'
                : 'border-slate-700 bg-slate-900 hover:border-slate-500'
            } ${dimmed ? 'opacity-55' : ''}`}
          >
            <span
              className={`block text-[10px] font-semibold uppercase leading-tight sm:text-[11px] ${
                seat.isHero ? 'text-indigo-300' : 'text-slate-300'
              }`}
            >
              {seat.isHero ? t('You') : seat.position}
            </span>
            {seat.isHero && (
              <span className="block text-[9px] leading-tight text-slate-500">{seat.position}</span>
            )}
            <span className="block text-[10px] tabular-nums leading-tight text-slate-400">
              {formatMoney(seat.stack)}
            </span>
            {!seat.isHero && (
              <span
                className={`mt-0.5 block rounded px-1 py-px text-[9px] font-medium leading-tight ${ACTION_STYLE[seat.action]}`}
              >
                {t(ACTION_LABEL[seat.action])}
                {seat.action === 'raise' && seat.raiseTo > 0 ? ` ${formatMoney(seat.raiseTo)}` : ''}
              </span>
            )}
            {seat.bountyAmount > 0 && !seat.isHero && (
              <span className="mt-0.5 block text-[9px] leading-tight text-fuchsia-400">
                🎯 {seat.bountyAmount}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
