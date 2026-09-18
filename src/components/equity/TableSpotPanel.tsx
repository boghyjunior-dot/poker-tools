import { useMemo, useState } from 'react'
import { EquityMatrix } from './EquityMatrix'
import { PokerTable } from './PokerTable'
import { CallingRangeSection } from './CallingRangeSection'
import { EQUITY_PRESET_RANGES, parsePredefinedRange } from '../../lib/predefinedRanges'
import { calculateEquity, marginOfErrorForEquity, type EquityResult } from '../../lib/equity'
import { handEquities, type HandEquityGrid } from '../../lib/callingRange'
import { countRangeCombosFromStates, type RangeCellStates } from '../../lib/equityRange'
import { useT } from '../../lib/i18n'
import { cellKey, type RankIndex } from '../../types/poker'
import {
  deriveSpot,
  formatAmount,
  newSeat,
  seatsForTable,
  type AmountView,
  type Blinds,
  type Seat,
  type SeatAction,
  type TableSize,
} from '../../lib/tableSpot'

const ACTIONS: SeatAction[] = ['fold', 'call', 'raise', 'shove']
const ACTION_LABEL: Record<SeatAction, string> = {
  fold: 'Fold',
  call: 'Call',
  raise: 'Raise',
  shove: 'Shove',
}

const DEFAULT_BLINDS: Blinds = { smallBlind: 500, bigBlind: 1000, ante: 0, bigBlindAnte: 1000 }
const DEFAULT_STACK = 25_000

/** An opening table: everyone folded to the big blind, who is you. */
function startingSeats(size: TableSize): Seat[] {
  const seats = seatsForTable(size).map((position) => newSeat(position, DEFAULT_STACK))
  seats[seats.length - 1].isHero = true
  return seats
}

function Num({
  label,
  value,
  onChange,
  hint,
  className = '',
}: {
  label: string
  value: number
  onChange: (value: number) => void
  hint?: string
  className?: string
}) {
  const t = useT()
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-[10px] uppercase tracking-wider text-slate-500">
        {t(label)}
      </span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-sm tabular-nums text-slate-200 focus:border-indigo-600 focus:outline-none"
      />
      {hint && <span className="mt-0.5 block text-[10px] text-slate-600">{t(hint)}</span>}
    </label>
  )
}

function Stat({ label, value, tone = 'text-white', hint }: { label: string; value: string; tone?: string; hint?: string }) {
  const t = useT()
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{t(label)}</p>
      <p className={`text-lg font-bold tabular-nums ${tone}`}>{value}</p>
      {hint && <p className="text-[10px] text-slate-500">{hint}</p>}
    </div>
  )
}

/**
 * Build the spot from the table, then price it.
 *
 * The seats are the only input. Pot, dead money, what it costs hero to call
 * and the equity that call needs all fall out of the actions, so the price can
 * never drift out of step with the story of the hand.
 */
export function TableSpotPanel({
  buyIn,
  startingStack,
  iterations,
  onBuyIn,
  onStartingStack,
}: {
  buyIn: number
  startingStack: number
  iterations: number
  onBuyIn: (value: number) => void
  onStartingStack: (value: number) => void
}) {
  const t = useT()
  const [size, setSize] = useState<TableSize>(8)
  const [seats, setSeats] = useState<Seat[]>(() => startingSeats(8))
  const [blinds, setBlinds] = useState<Blinds>(DEFAULT_BLINDS)
  const [view, setView] = useState<AmountView>('chips')
  const [selected, setSelected] = useState(() => startingSeats(8).length - 1)
  const [result, setResult] = useState<EquityResult | null>(null)
  const [grid, setGrid] = useState<HandEquityGrid | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)

  const spot = useMemo(
    () => deriveSpot(seats, blinds, buyIn, startingStack),
    [seats, blinds, buyIn, startingStack],
  )

  const seat = seats[Math.min(selected, seats.length - 1)]

  const patch = (index: number, change: Partial<Seat>) =>
    setSeats((prev) => prev.map((item, i) => (i === index ? { ...item, ...change } : item)))

  const changeSize = (next: TableSize) => {
    setSize(next)
    setSeats(startingSeats(next))
    setSelected(seatsForTable(next).length - 1)
    setResult(null)
    setGrid(null)
  }

  const makeHero = (index: number) =>
    setSeats((prev) => prev.map((item, i) => ({ ...item, isHero: i === index })))

  const toggleCell = (row: RankIndex, col: RankIndex, remove?: boolean) => {
    const key = cellKey(row, col)
    patch(selected, {
      range: { ...seat.range, [key]: remove ? 'out' : 'in' },
    })
  }

  const run = () => {
    setError(null)
    setRunning(true)
    setTimeout(() => {
      try {
        const hero = spot.hero
        if (!hero) throw new Error('Pick which seat is yours.')
        if (spot.activeVillains.length === 0) throw new Error('Nobody is in the hand with you.')

        const players = [
          { type: 'range' as const, name: t('You'), cellStates: hero.range },
          ...spot.activeVillains.map((villain) => ({
            type: 'range' as const,
            name: villain.position,
            cellStates: villain.range,
          })),
        ]
        const effectiveStack = Math.min(
          hero.stack,
          ...spot.activeVillains.map((villain) => villain.stack),
        )
        const matched =
          spot.heroCallAmount +
          spot.activeVillains.reduce(
            (sum, villain) => sum + Math.min(villain.stack, effectiveStack),
            0,
          )

        setResult(
          calculateEquity(players, {
            iterations,
            buyIn,
            startingStack,
            existingPot: Math.max(0, spot.finalPot - matched),
            callAmount: spot.heroCallAmount,
            stacks: [
              { stack: hero.stack },
              ...spot.activeVillains.map((villain) => ({
                stack: villain.stack,
                bountyAmount: villain.bountyAmount,
              })),
            ],
          }),
        )
        setGrid(
          spot.activeVillains.length === 1 ? handEquities(spot.activeVillains[0].range) : null,
        )
      } catch (err) {
        setResult(null)
        setGrid(null)
        setError(err instanceof Error ? err.message : 'Calculation failed')
      } finally {
        setRunning(false)
      }
    }, 0)
  }

  const heroCombos = spot.hero ? countRangeCombosFromStates(spot.hero.range) : 0
  const ready = spot.problems.length === 0 && heroCombos > 0
  // One view for every number derived in chips; inputs stay in chips.
  const amount = (chips: number) => formatAmount(chips, blinds.bigBlind, view)

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-white">{t('The table')}</h2>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1" role="group" aria-label={t('Show amounts as')}>
              {(['chips', 'bb'] as AmountView[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setView(option)}
                  aria-pressed={view === option}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    view === option
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {option === 'chips' ? t('Chips') : 'BB'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
            {([6, 8, 9] as TableSize[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => changeSize(option)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  size === option
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {option}-max
              </button>
            ))}
            </div>
          </div>
        </div>

        <PokerTable
          seats={spot.seats}
          selected={selected}
          onSelect={setSelected}
          potBeforeCall={spot.potBeforeCall}
          heroCallAmount={spot.heroCallAmount}
          bigBlind={blinds.bigBlind}
          view={view}
        />

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Num label="Small blind" value={blinds.smallBlind} onChange={(v) => setBlinds({ ...blinds, smallBlind: v })} />
          <Num label="Big blind" value={blinds.bigBlind} onChange={(v) => setBlinds({ ...blinds, bigBlind: v })} />
          <Num label="BB ante" value={blinds.bigBlindAnte} onChange={(v) => setBlinds({ ...blinds, bigBlindAnte: v })} hint="Posted by the big blind" />
          <Num label="Ante each" value={blinds.ante} onChange={(v) => setBlinds({ ...blinds, ante: v })} hint="Posted by every seat" />
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Num label="Buy-in" value={buyIn} onChange={onBuyIn} hint="Prices bounties in chips" />
          <Num
            label="Starting stack"
            value={startingStack}
            onChange={onStartingStack}
            hint="Chips at buy-in"
          />
        </div>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-white">
            {seat.isHero ? t('You — {position}', { position: seat.position }) : seat.position}
          </h2>
          {!seat.isHero && (
            <button
              type="button"
              onClick={() => makeHero(selected)}
              className="rounded-md border border-slate-600 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700"
            >
              {t('This seat is mine')}
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Num label="Stack" value={seat.stack} onChange={(v) => patch(selected, { stack: v })} />
          {!seat.isHero && (
            <>
              <Num label="Bounty" value={seat.bountyAmount} onChange={(v) => patch(selected, { bountyAmount: v })} hint="In buy-in currency" />
              {seat.action === 'raise' && (
                <Num label="Raise to" value={seat.raiseTo} onChange={(v) => patch(selected, { raiseTo: v })} />
              )}
            </>
          )}
        </div>

        {!seat.isHero && (
          <div className="mt-3">
            <span className="mb-1 block text-[10px] uppercase tracking-wider text-slate-500">
              {t('Action')}
            </span>
            <div className="flex flex-wrap gap-1">
              {ACTIONS.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => patch(selected, { action })}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    seat.action === action
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {t(ACTION_LABEL[action])}
                </button>
              ))}
            </div>
          </div>
        )}

        {(seat.isHero || seat.action !== 'fold') && (
          <div className="mt-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <select
                value=""
                onChange={(event) => {
                  const preset = EQUITY_PRESET_RANGES.find((r) => r.id === event.target.value)
                  if (preset) patch(selected, { range: parsePredefinedRange(preset) as RangeCellStates })
                }}
                className="rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1 text-xs text-slate-300 focus:outline-none"
              >
                <option value="">{t('Load preset range…')}</option>
                {EQUITY_PRESET_RANGES.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-500">
                {t('{n} combos', { n: countRangeCombosFromStates(seat.range) })}
              </span>
            </div>
            <EquityMatrix
              cellStates={seat.range}
              onToggle={toggleCell}
              onClear={() => patch(selected, { range: {} })}
            />
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="mb-3 text-sm font-semibold text-white">{t('The price')}</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Pot" value={amount(spot.finalPot)} hint={t('{n} dead', { n: amount(spot.deadChips) })} />
          <Stat label="To call" value={amount(spot.heroCallAmount)} tone="text-amber-300" hint={spot.potOdds} />
          <Stat
            label="Equity you need"
            value={`${spot.requiredEquityPct.toFixed(1)}%`}
            hint={t('on pot odds alone')}
          />
          <Stat
            label="With the bounty"
            value={`${spot.requiredEquityWithBountyPct.toFixed(1)}%`}
            tone={spot.capturableBountyChips > 0 ? 'text-emerald-400' : 'text-slate-500'}
            hint={
              spot.capturableBountyChips > 0
                ? t('{n} capturable', { n: amount(spot.capturableBountyChips) })
                : t('no bounty you can win')
            }
          />
        </div>

        {spot.problems.length > 0 && (
          <ul className="mt-3 space-y-1">
            {spot.problems.map((problem) => (
              <li key={problem} className="text-xs text-amber-400">
                {t(problem)}
              </li>
            ))}
          </ul>
        )}
        {spot.problems.length === 0 && heroCombos === 0 && (
          <p className="mt-3 text-xs text-amber-400">{t('Give your own seat a range first.')}</p>
        )}

        <button
          type="button"
          onClick={run}
          disabled={!ready || running}
          className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
        >
          {running ? t('Running…') : t('Work out the equity')}
        </button>
        {error && <p className="mt-2 text-xs text-red-400">{t(error)}</p>}
      </section>

      {result && (
        <section className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold text-white">{t('Equity')}</h2>
          <div className="space-y-1.5">
            {result.players.map((player) => (
              <div key={player.name} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-xs font-medium text-slate-300">
                  {player.name}
                </span>
                <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full bg-indigo-500"
                    style={{ width: `${Math.min(100, Math.max(0, player.equity))}%` }}
                  />
                  {player.bountyEquityAdd !== undefined && player.bountyEquityAdd > 0 && (
                    <div
                      className="h-full bg-amber-500/80"
                      style={{
                        width: `${Math.min(player.bountyEquityAdd, Math.max(0, 100 - player.equity))}%`,
                      }}
                    />
                  )}
                </div>
                <span className="w-28 shrink-0 text-right text-sm font-semibold tabular-nums text-white">
                  {player.equity.toFixed(1)}%
                  <span className="ml-1 text-[10px] font-normal text-slate-500">
                    ±{marginOfErrorForEquity(player.equity, result.iterations).toFixed(1)}
                  </span>
                </span>
              </div>
            ))}
            {result.players[0]?.bountyEquityAdd !== undefined &&
              result.players[0].bountyEquityAdd > 0 && (
                <p className="pt-1 text-xs text-amber-400">
                  {t('Bounties are worth another {pct}% of this pot to you', {
                    pct: result.players[0].bountyEquityAdd.toFixed(1),
                  })}
                </p>
              )}
          </div>
          {result.callEv && (
            <p className="text-sm text-slate-300">
              {t('Calling is')}{' '}
              <span
                className={`font-bold tabular-nums ${
                  result.callEv.evChips >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {result.callEv.evChips >= 0 ? '+' : ''}
                {amount(result.callEv.evChips)}
                {view === 'chips' ? ` ${t('chips')}` : ''}
              </span>
            </p>
          )}
          {grid && (
            <CallingRangeSection
              grid={grid}
              thresholdPct={spot.requiredEquityWithBountyPct}
              noBountyThresholdPct={spot.requiredEquityPct}
            />
          )}
        </section>
      )}
    </div>
  )
}
