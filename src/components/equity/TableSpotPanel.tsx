import { useEffect, useMemo, useRef, useState } from 'react'
import { EquityMatrix } from './EquityMatrix'
import { HoleCardPicker } from './HoleCardPicker'
import { PokerTable } from './PokerTable'
import { CallingRangeSection } from './CallingRangeSection'
import { EQUITY_PRESET_RANGES, parsePredefinedRange } from '../../lib/predefinedRanges'
import { calculateEquity, marginOfErrorForEquity, type EquityResult } from '../../lib/equity'
import { handEquities, type HandEquityGrid } from '../../lib/callingRange'
import { countRangeCombosFromStates, type RangeCellStates } from '../../lib/equityRange'
import { formatMoney } from '../../lib/formatNumber'
import { useT } from '../../lib/i18n'
import { cellKey, type BoardCard, type RankIndex } from '../../types/poker'
import {
  defaultBounty,
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

/**
 * An opening table: everyone folded to the big blind, who is you, and every
 * seat carrying the bounty the buy-in implies.
 */
function startingSeats(size: TableSize, buyIn: number): Seat[] {
  const seats = seatsForTable(size).map((position) =>
    newSeat(position, DEFAULT_STACK, defaultBounty(buyIn)),
  )
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
 * One line of shown working: the name of the step, the sum, and its answer.
 *
 * The sum is spelled out with the actual numbers substituted rather than as
 * symbols, because the point is to let someone check the figure on the card
 * above — a formula they still have to fill in themselves proves nothing.
 */
function Work({
  label,
  sum,
  result,
  tone = 'text-slate-100',
}: {
  label: string
  sum: string
  result: string
  tone?: string
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-slate-800/60 py-1 last:border-0">
      <span className="w-full text-[10px] uppercase tracking-wider text-slate-500 sm:w-40 sm:shrink-0">
        {label}
      </span>
      <span className="font-mono text-[11px] text-slate-400">{sum}</span>
      <span className={`ml-auto font-mono text-xs font-semibold tabular-nums ${tone}`}>
        {result}
      </span>
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
  const [seats, setSeats] = useState<Seat[]>(() => startingSeats(8, buyIn))
  const [blinds, setBlinds] = useState<Blinds>(DEFAULT_BLINDS)
  const [view, setView] = useState<AmountView>('chips')
  const [selected, setSelected] = useState(() => seatsForTable(8).length - 1)
  const [result, setResult] = useState<EquityResult | null>(null)
  const [grid, setGrid] = useState<HandEquityGrid | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)

  const spot = useMemo(
    () => deriveSpot(seats, blinds, buyIn, startingStack),
    [seats, blinds, buyIn, startingStack],
  )

  const seat = seats[Math.min(selected, seats.length - 1)]
  const heroIndex = seats.findIndex((item) => item.isHero)

  const patch = (index: number, change: Partial<Seat>) =>
    setSeats((prev) => prev.map((item, i) => (i === index ? { ...item, ...change } : item)))

  const changeSize = (next: TableSize) => {
    setSize(next)
    setSeats(startingSeats(next, buyIn))
    setSelected(seatsForTable(next).length - 1)
    setResult(null)
    setGrid(null)
  }

  /**
   * A new buy-in re-derives the bounty on every seat still carrying the old
   * default. A bounty someone typed by hand is theirs and stays put.
   */
  const changeBuyIn = (value: number) => {
    const previous = defaultBounty(buyIn)
    const next = defaultBounty(value)
    setSeats((prev) =>
      prev.map((item) => (item.bountyAmount === previous ? { ...item, bountyAmount: next } : item)),
    )
    onBuyIn(value)
  }

  const makeHero = (index: number) =>
    setSeats((prev) => prev.map((item, i) => ({ ...item, isHero: i === index })))

  /**
   * The all-in shortcut on a seat is only half an instruction — a shove
   * without a range prices nothing. So pressing it sets the action, selects
   * the seat, and carries the eye down to where the range gets chosen.
   */
  const editorRef = useRef<HTMLElement | null>(null)
  const presetRef = useRef<HTMLSelectElement | null>(null)
  const [rangeJump, setRangeJump] = useState(0)
  useEffect(() => {
    if (rangeJump === 0) return
    editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    presetRef.current?.focus({ preventScroll: true })
  }, [rangeJump])

  const allIn = (index: number) => {
    patch(index, { action: 'shove' })
    setSelected(index)
    setRangeJump((count) => count + 1)
  }

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
        const heroCards = hero.hand
        if (!heroCards?.[0] || !heroCards?.[1]) throw new Error('Pick your two cards first.')

        const players = [
          {
            type: 'hand' as const,
            name: t('You'),
            cards: [heroCards[0], heroCards[1]] as [BoardCard, BoardCard],
          },
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

  const heroHandComplete = Boolean(spot.hero?.hand?.[0] && spot.hero?.hand?.[1])
  const ready = spot.problems.length === 0 && heroHandComplete
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
          onPatch={patch}
          onMakeHero={makeHero}
          onAllIn={allIn}
          potBeforeCall={spot.potBeforeCall}
          heroCallAmount={spot.heroCallAmount}
          bigBlind={blinds.bigBlind}
          view={view}
        />

        <p className="mt-1 text-center text-[11px] text-slate-500">
          {t('Click a seat to edit it. Double-click to make it yours.')}
        </p>

        <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-3">
          {heroIndex >= 0 && (
            <div>
              <span className="mb-1 block text-[10px] uppercase tracking-wider text-slate-500">
                {t('Your hand')}
              </span>
              <HoleCardPicker
                cards={seats[heroIndex].hand ?? [null, null]}
                onChange={(cards) => patch(heroIndex, { hand: cards })}
              />
            </div>
          )}
          <div className="flex flex-col gap-1 pb-1">
            <button
              type="button"
              onClick={run}
              disabled={!ready || running}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
            >
              {running ? t('Running…') : t('Work out the equity')}
            </button>
            {error && <p className="text-xs text-red-400">{t(error)}</p>}
          </div>
        </div>

        {/* Whatever is stopping the run, said next to the button that runs. */}
        {spot.problems.length > 0 && (
          <ul className="mt-2 space-y-1">
            {spot.problems.map((problem) => (
              <li key={problem} className="text-xs text-amber-400">
                {t(problem)}
              </li>
            ))}
          </ul>
        )}
        {spot.problems.length === 0 && !heroHandComplete && (
          <p className="mt-2 text-xs text-amber-400">{t('Pick your two cards first.')}</p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Num label="Small blind" value={blinds.smallBlind} onChange={(v) => setBlinds({ ...blinds, smallBlind: v })} />
          <Num label="Big blind" value={blinds.bigBlind} onChange={(v) => setBlinds({ ...blinds, bigBlind: v })} />
          <Num label="BB ante" value={blinds.bigBlindAnte} onChange={(v) => setBlinds({ ...blinds, bigBlindAnte: v })} hint="Posted by the big blind" />
          <Num label="Ante each" value={blinds.ante} onChange={(v) => setBlinds({ ...blinds, ante: v })} hint="Posted by every seat" />
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Num label="Buy-in" value={buyIn} onChange={changeBuyIn} hint="Prices bounties in chips" />
          <Num
            label="Starting stack"
            value={startingStack}
            onChange={onStartingStack}
            hint="Chips at buy-in"
          />
        </div>
      </section>

      <section ref={editorRef} className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
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

        {!seat.isHero && seat.action !== 'fold' && (
          <div className="mt-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <select
                ref={presetRef}
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

        <div className="mt-3 rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2">
          <p className="mb-1 text-[10px] uppercase tracking-wider text-slate-500">
            {t('How that is worked out')}
          </p>

          {spot.capturableBountyAmount > 0 && (
            <>
              <Work
                label={t('Bounty in chips')}
                sum={`${spot.capturableBountyAmount} × (${formatMoney(startingStack)} ÷ ${buyIn})`}
                result={`${formatMoney(spot.capturableBountyAmount * (startingStack / buyIn))} ${t('chips')}`}
              />
              <Work
                label={t('Paid on the knockout')}
                sum={`${formatMoney(spot.capturableBountyAmount * (startingStack / buyIn))} × 50%`}
                result={`${formatMoney(spot.capturableBountyChips)} ${t('chips')}`}
              />
              <Work
                label={t('Bounty in big blinds')}
                sum={`${formatMoney(spot.capturableBountyChips)} ÷ ${formatMoney(blinds.bigBlind)}`}
                result={`${spot.capturableBountyBB.toFixed(1)} BB`}
                tone="text-emerald-400"
              />
            </>
          )}

          <Work
            label={t('Equity you need')}
            sum={`${formatMoney(spot.heroCallAmount)} ÷ ${formatMoney(spot.finalPot)}`}
            result={`${spot.requiredEquityPct.toFixed(1)}%`}
          />
          {spot.capturableBountyChips > 0 && (
            <Work
              label={t('With the bounty')}
              sum={`${formatMoney(spot.heroCallAmount)} ÷ (${formatMoney(spot.finalPot)} + ${formatMoney(spot.capturableBountyChips)})`}
              result={`${spot.requiredEquityWithBountyPct.toFixed(1)}%`}
              tone="text-emerald-400"
            />
          )}
          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
            {t(
              'A call breaks even when your share of the pot covers what you put in, so the bar is what you call divided by what the pot pays. A bounty is extra reward on exactly the branch where you win, so it joins the pot on the bottom of that fraction and pulls the bar down.',
            )}
          </p>
        </div>
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
          {result.callEv && result.potChips !== undefined && (
            <div className="rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2">
              <p className="mb-1 text-[10px] uppercase tracking-wider text-slate-500">
                {t('How that is worked out')}
              </p>
              <Work
                label={t('Share of the pot')}
                sum={`${result.players[0].equity.toFixed(1)}% × ${formatMoney(result.potChips)}`}
                result={formatMoney((result.players[0].equity / 100) * result.potChips)}
              />
              <Work
                label={t('Less what you call')}
                sum={`− ${formatMoney(result.callEv.callAmount)}`}
                result={`${result.callEv.chipEvChips >= 0 ? '+' : ''}${formatMoney(result.callEv.chipEvChips)}`}
                tone={result.callEv.chipEvChips >= 0 ? 'text-emerald-400' : 'text-red-400'}
              />
              {result.callEv.bountyEvChips > 0 && (
                <Work
                  label={t('Bounty, when you win it')}
                  sum={`${result.players[0].winPct.toFixed(1)}% × ${formatMoney(spot.capturableBountyChips)}`}
                  result={`+${formatMoney(result.callEv.bountyEvChips)}`}
                  tone="text-amber-400"
                />
              )}
              <Work
                label={t('Calling is worth')}
                sum={
                  result.callEv.bountyEvChips > 0
                    ? `${formatMoney(result.callEv.chipEvChips)} + ${formatMoney(result.callEv.bountyEvChips)}`
                    : t('chips won, less the call')
                }
                result={`${result.callEv.evChips >= 0 ? '+' : ''}${amount(result.callEv.evChips)}`}
                tone={result.callEv.evChips >= 0 ? 'text-emerald-400' : 'text-red-400'}
              />
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
                {t(
                  'Your equity is the share of the pot you win on average, measured by dealing this spot {n} times. The bounty is added only on the runs you win outright, which is why it is multiplied by how often that happens rather than by your equity.',
                  { n: result.iterations.toLocaleString() },
                )}
              </p>
            </div>
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
