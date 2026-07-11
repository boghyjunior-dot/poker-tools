import { useMemo, useState } from 'react'
import { PREDEFINED_RANGES, parsePredefinedRange } from '../../lib/predefinedRanges'
import {
  calculateEquity,
  formatMarginOfError,
  ITERATION_OPTIONS,
  marginOfErrorForEquity,
  worstCaseMarginOfError,
  type EquityPlayer,
  type EquityResult,
} from '../../lib/equity'
import { countRangeCombosFromStates, type RangeCellStates } from '../../lib/equityRange'
import {
  bountyAmountToChips,
  buildBountyBreakdown,
  computeShowdownPot,
  PKO_IMMEDIATE_CAPTURE,
} from '../../lib/equityBounty'
import { cellKey, type BoardCard, type RankIndex } from '../../types/poker'
import { EquityMatrix } from './EquityMatrix'
import { HoleCardPicker } from './HoleCardPicker'
import { BackToMenu } from '../BackToMenu'

type HeroMode = 'hand' | 'range'
type VillainMode = 'hand' | 'range'

interface VillainSlot {
  id: string
  mode: VillainMode
  hand: [BoardCard | null, BoardCard | null]
  range: RangeCellStates
  stack: string
  bountyAmount: string
}

const PLAYER_COLORS = ['text-blue-300', 'text-red-300', 'text-amber-300', 'text-emerald-300', 'text-purple-300']

function emptyRange(): RangeCellStates {
  return {}
}

function toggleCell(
  states: RangeCellStates,
  row: RankIndex,
  col: RankIndex,
  remove = false,
): RangeCellStates {
  const key = cellKey(row, col)
  const next = { ...states }
  if (remove || next[key] === 'in') delete next[key]
  else next[key] = 'in'
  return next
}

function newVillain(index: number): VillainSlot {
  return {
    id: `villain-${index}-${Date.now()}`,
    mode: 'range',
    hand: [null, null],
    range: emptyRange(),
    stack: '',
    bountyAmount: '',
  }
}

function parseNonNegativeNumber(raw: string, fallback: number): number {
  const normalized = raw.trim().replace(',', '.')
  if (normalized === '') return fallback
  const value = Number(normalized)
  return Number.isFinite(value) && value >= 0 ? value : fallback
}

function parsePositiveNumber(raw: string, fallback: number): number {
  const normalized = raw.trim().replace(',', '.')
  if (normalized === '') return fallback
  const value = Number(normalized)
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function formatChips(value: number): string {
  return Math.round(value).toLocaleString()
}

export function EquityPage() {
  const [heroMode, setHeroMode] = useState<HeroMode>('hand')
  const [heroHand, setHeroHand] = useState<[BoardCard | null, BoardCard | null]>([null, null])
  const [heroRange, setHeroRange] = useState<RangeCellStates>(emptyRange())
  const [villains, setVillains] = useState<VillainSlot[]>([newVillain(1)])
  const [activeVillain, setActiveVillain] = useState(0)
  const [iterations, setIterations] = useState(10_000)
  const [startingStack, setStartingStack] = useState('10000')
  const [buyIn, setBuyIn] = useState('10')
  const [heroStack, setHeroStack] = useState('')
  const [existingPot, setExistingPot] = useState('')
  const [callAmount, setCallAmount] = useState('')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<EquityResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const currentVillain = villains[activeVillain]

  const heroCombos = useMemo(() => {
    if (heroMode === 'hand') return heroHand[0] && heroHand[1] ? 1 : 0
    return countRangeCombosFromStates(heroRange)
  }, [heroMode, heroHand, heroRange])

  const selectedMargin = worstCaseMarginOfError(iterations)

  const resolvedStartingStack = parsePositiveNumber(startingStack, 10_000)
  const resolvedBuyIn = parsePositiveNumber(buyIn, 10)
  const resolvedHeroStack = parsePositiveNumber(heroStack, resolvedStartingStack)

  const playerStacks = useMemo(
    () => [
      resolvedHeroStack,
      ...villains.map((villain) => parsePositiveNumber(villain.stack, resolvedStartingStack)),
    ],
    [resolvedHeroStack, resolvedStartingStack, villains],
  )

  const derivedCallAmount = useMemo(() => Math.min(...playerStacks), [playerStacks])

  const resolvedExistingPot = parseNonNegativeNumber(existingPot, 0)
  const resolvedCallAmount =
    callAmount.trim() !== '' ? parsePositiveNumber(callAmount, derivedCallAmount) : undefined

  const showdownPreview = useMemo(
    () =>
      computeShowdownPot(playerStacks, {
        existingPot: resolvedExistingPot,
        heroCallAmount: resolvedCallAmount ?? derivedCallAmount,
      }),
    [playerStacks, resolvedExistingPot, resolvedCallAmount, derivedCallAmount],
  )

  const bountyPreview = useMemo(
    () =>
      buildBountyBreakdown(
        resolvedBuyIn,
        resolvedStartingStack,
        resolvedHeroStack,
        villains.map((villain) => ({
          stack: parsePositiveNumber(villain.stack, resolvedStartingStack),
          bountyAmount: parseNonNegativeNumber(villain.bountyAmount, 0),
        })),
      ),
    [resolvedBuyIn, resolvedStartingStack, resolvedHeroStack, villains],
  )

  const buildPlayers = (): EquityPlayer[] => {
    const players: EquityPlayer[] = []

    if (heroMode === 'hand') {
      if (!heroHand[0] || !heroHand[1]) throw new Error('Select both hero cards')
      players.push({ type: 'hand', name: 'Hero', cards: [heroHand[0], heroHand[1]] })
    } else {
      if (countRangeCombosFromStates(heroRange) === 0) throw new Error('Paint a hero range')
      players.push({ type: 'range', name: 'Hero', cellStates: heroRange })
    }

    villains.forEach((villain, index) => {
      const name = `Villain ${index + 1}`
      if (villain.mode === 'hand') {
        if (!villain.hand[0] || !villain.hand[1]) throw new Error(`Select both cards for ${name}`)
        players.push({ type: 'hand', name, cards: [villain.hand[0], villain.hand[1]] })
      } else {
        if (countRangeCombosFromStates(villain.range) === 0) throw new Error(`Paint a range for ${name}`)
        players.push({ type: 'range', name, cellStates: villain.range })
      }
    })

    return players
  }

  const runEquity = () => {
    setError(null)
    setRunning(true)
    setTimeout(() => {
      try {
        const players = buildPlayers()
        const stacks = [
          { stack: resolvedHeroStack },
          ...villains.map((villain) => ({
            stack: parsePositiveNumber(villain.stack, resolvedStartingStack),
            bountyAmount: parseNonNegativeNumber(villain.bountyAmount, 0),
          })),
        ]
        setResult(
          calculateEquity(players, {
            iterations,
            buyIn: resolvedBuyIn,
            startingStack: resolvedStartingStack,
            existingPot: resolvedExistingPot,
            callAmount: resolvedCallAmount,
            stacks,
          }),
        )
      } catch (err) {
        setResult(null)
        setError(err instanceof Error ? err.message : 'Calculation failed')
      } finally {
        setRunning(false)
      }
    }, 0)
  }

  const loadPreset = (rangeId: string, target: 'hero' | 'villain') => {
    const preset = PREDEFINED_RANGES.find((range) => range.id === rangeId)
    if (!preset) return
    const states = parsePredefinedRange(preset) as RangeCellStates
    if (target === 'hero') setHeroRange(states)
    else {
      setVillains((prev) =>
        prev.map((villain, index) =>
          index === activeVillain ? { ...villain, range: states, mode: 'range' } : villain,
        ),
      )
    }
  }

  const updateVillain = (index: number, patch: Partial<VillainSlot>) => {
    setVillains((prev) => prev.map((villain, i) => (i === index ? { ...villain, ...patch } : villain)))
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-6xl mx-auto">
      <header className="mb-6">
        <BackToMenu className="mb-2" />
        <h1 className="text-2xl font-bold text-white">Equity Calculator</h1>
        <p className="text-sm text-slate-400 mt-1">
          Preflop equity via Monte Carlo — hand vs range, stacks, and PKO bounties.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="bg-slate-900/60 rounded-lg border border-slate-800 p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">Hero</h2>
            <ModeToggle
              value={heroMode}
              onChange={setHeroMode}
            />
          </div>

          {heroMode === 'hand' ? (
            <HoleCardPicker cards={heroHand} onChange={setHeroHand} />
          ) : (
            <>
              <PresetSelect onLoad={(id) => loadPreset(id, 'hero')} />
              <EquityMatrix
                cellStates={heroRange}
                onToggle={(row, col, remove) => setHeroRange((prev) => toggleCell(prev, row, col, remove))}
                onClear={() => setHeroRange(emptyRange())}
              />
            </>
          )}
          <StackField
            label="Hero stack"
            value={heroStack}
            onChange={setHeroStack}
            placeholder={String(resolvedStartingStack)}
            hint={`Default ${formatChips(resolvedStartingStack)} if empty`}
          />
          <p className="text-xs text-slate-500">{heroCombos} combo{heroCombos === 1 ? '' : 's'}</p>
        </section>

        <section className="bg-slate-900/60 rounded-lg border border-slate-800 p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-white mr-auto">Villains</h2>
            {villains.map((villain, index) => (
              <button
                key={villain.id}
                type="button"
                onClick={() => setActiveVillain(index)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  activeVillain === index
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                V{index + 1}
              </button>
            ))}
            {villains.length < 4 && (
              <button
                type="button"
                onClick={() => {
                  setVillains((prev) => [...prev, newVillain(prev.length + 1)])
                  setActiveVillain(villains.length)
                }}
                className="px-2.5 py-1 rounded text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                + Add
              </button>
            )}
            {villains.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  setVillains((prev) => prev.filter((_, i) => i !== activeVillain))
                  setActiveVillain(Math.max(0, activeVillain - 1))
                }}
                className="px-2.5 py-1 rounded text-xs font-medium text-red-400 hover:text-red-300"
              >
                Remove
              </button>
            )}
          </div>

          {currentVillain && (
            <>
              <ModeToggle
                value={currentVillain.mode}
                onChange={(mode) => updateVillain(activeVillain, { mode })}
              />
              {currentVillain.mode === 'hand' ? (
                <HoleCardPicker
                  cards={currentVillain.hand}
                  onChange={(hand) => updateVillain(activeVillain, { hand })}
                  takenCards={heroHand[0] && heroHand[1] ? [heroHand[0], heroHand[1]] : []}
                />
              ) : (
                <>
                  <PresetSelect onLoad={(id) => loadPreset(id, 'villain')} />
                  <EquityMatrix
                    cellStates={currentVillain.range}
                    onToggle={(row, col, remove) =>
                      updateVillain(activeVillain, {
                        range: toggleCell(currentVillain.range, row, col, remove),
                      })
                    }
                    onClear={() => updateVillain(activeVillain, { range: emptyRange() })}
                  />
                </>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <StackField
                  label={`V${activeVillain + 1} stack`}
                  value={currentVillain.stack}
                  onChange={(stack) => updateVillain(activeVillain, { stack })}
                  placeholder={String(resolvedStartingStack)}
                  hint={`Default ${formatChips(resolvedStartingStack)} if empty`}
                />
                <BountyField
                  label={`V${activeVillain + 1} bounty`}
                  value={currentVillain.bountyAmount}
                  onChange={(bountyAmount) => updateVillain(activeVillain, { bountyAmount })}
                  buyIn={resolvedBuyIn}
                  startingStack={resolvedStartingStack}
                  captureChips={bountyPreview[activeVillain]?.captureChips ?? 0}
                  covered={bountyPreview[activeVillain]?.covered ?? false}
                />
              </div>
            </>
          )}
        </section>
      </div>

      <section className="mt-4 bg-slate-900/60 rounded-lg border border-slate-800 p-4 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-white mb-3">Stacks & bounties</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StackField
              label="Buy-in"
              value={buyIn}
              onChange={setBuyIn}
              placeholder="10"
              hint="Tournament buy-in used to convert bounties to chips"
            />
            <StackField
              label="Starting stack"
              value={startingStack}
              onChange={setStartingStack}
              placeholder="10000"
              hint="Starting chips at buy-in"
            />
            <StackField
              label="Existing pot"
              value={existingPot}
              onChange={setExistingPot}
              placeholder="0"
              hint="Antes + blinds already in the middle"
            />
            <StackField
              label="Call amount"
              value={callAmount}
              onChange={setCallAmount}
              placeholder={String(derivedCallAmount)}
              hint={`Chips hero must call · default ${formatChips(derivedCallAmount)}`}
            />
            <div className="flex flex-col gap-1 text-sm text-slate-300 sm:col-span-2 lg:col-span-3">
              <span>Showdown pot</span>
              <p className="rounded-md border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 tabular-nums">
                {formatChips(showdownPreview.potChips)} chips
              </p>
              <span className="text-xs text-slate-500">
                {formatChips(showdownPreview.existingPot)} existing + {formatChips(showdownPreview.playerTotal)} from players
                {' '}({showdownPreview.contributions.map((value) => formatChips(value)).join(' + ')})
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Showdown pot = existing pot + sum of all-in contributions (matched to effective stack).
            Bounty chips = bounty × (starting stack ÷ buy-in). PKO capture uses{' '}
            {Math.round(PKO_IMMEDIATE_CAPTURE * 100)}% when you cover an opponent and win outright.
            Total equity = chip equity + bounty equity (bounty EV as % of the pot).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex flex-col gap-1 text-sm text-slate-300">
            <span className="flex items-center gap-2">
              Iterations
              <select
                value={iterations}
                onChange={(e) => setIterations(Number(e.target.value))}
                className="rounded-md border border-slate-600 bg-slate-800 text-slate-200 text-sm px-2 py-1"
              >
                {ITERATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({formatMarginOfError(worstCaseMarginOfError(option.value))} max)
                  </option>
                ))}
              </select>
            </span>
            <span className="text-xs text-slate-500">
              95% confidence, worst case at 50% equity: {formatMarginOfError(selectedMargin)}
            </span>
          </label>
          <button
            type="button"
            onClick={runEquity}
            disabled={running}
            className="px-5 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {running ? 'Calculating…' : 'Calculate equity'}
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        {result && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-slate-500">
              Based on {result.iterations.toLocaleString()} simulations (
              {formatMarginOfError(worstCaseMarginOfError(result.iterations))} max error at 50% equity)
              {result.effectiveStack !== undefined && result.potChips !== undefined
                ? ` · effective stack ${formatChips(result.effectiveStack)} · showdown pot ${formatChips(result.potChips)}`
                : ''}
              {result.existingPotChips !== undefined && result.playerPotTotal !== undefined
                ? ` (${formatChips(result.existingPotChips)} + ${formatChips(result.playerPotTotal)})`
                : ''}
              {result.capturableBountyChips !== undefined && result.capturableBountyChips > 0
                ? ` · capturable bounty ${formatChips(result.capturableBountyChips)}`
                : ''}
            </p>
            {result.callEv && (
              <CallSuggestion callEv={result.callEv} />
            )}
            <div className="space-y-2">
              {result.players.map((player, index) => {
                const displayEquity = player.totalEquity ?? player.equity
                const displayMoe = marginOfErrorForEquity(displayEquity, result.iterations)
                return (
                <div key={player.name} className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className={`w-24 text-sm font-medium ${PLAYER_COLORS[index % PLAYER_COLORS.length]}`}>
                      {player.name}
                    </span>
                    <div className="flex-1 h-6 bg-slate-800 rounded overflow-hidden flex">
                      <div
                        className="h-full bg-indigo-600/80 transition-all duration-500"
                        style={{ width: `${Math.min(player.equity, 100)}%` }}
                      />
                      {index === 0 && player.bountyEquityAdd !== undefined && player.bountyEquityAdd > 0 && (
                        <div
                          className="h-full bg-amber-500/70 transition-all duration-500"
                          style={{ width: `${Math.min(player.bountyEquityAdd, 100 - player.equity)}%` }}
                        />
                      )}
                    </div>
                    <span className="w-40 text-right text-sm font-bold text-white tabular-nums">
                      {displayEquity.toFixed(1)}%
                      <span className="ml-1 text-xs font-normal text-slate-400">
                        {formatMarginOfError(displayMoe)}
                      </span>
                    </span>
                    <span className="w-28 text-right text-xs text-slate-500 tabular-nums hidden sm:block">
                      {result.combos[index]} combo{result.combos[index] === 1 ? '' : 's'}
                    </span>
                  </div>
                  {index === 0 && player.totalEquity !== undefined && (
                    <p className="text-xs text-slate-500 pl-24">
                      Chip equity {player.equity.toFixed(1)}%
                      {player.bountyEquityAdd !== undefined && player.bountyEquityAdd > 0
                        ? ` · bounty equity +${player.bountyEquityAdd.toFixed(1)}%`
                        : ''}
                      {player.bountyEvChips !== undefined && player.bountyEvChips > 0
                        ? ` (+${formatChips(player.bountyEvChips)} chips)`
                        : ''}
                    </p>
                  )}
                  {index === 0 && player.totalEvChips !== undefined && (
                    <p className="text-xs text-slate-500 pl-24">
                      Chip EV {player.chipEvChips! >= 0 ? '+' : ''}{formatChips(player.chipEvChips!)} chips
                      {player.bountyEvChips !== undefined && player.bountyEvChips > 0
                        ? ` · bounty +${formatChips(player.bountyEvChips)} chips`
                        : ''}
                      {' · total '}
                      {player.totalEvChips >= 0 ? '+' : ''}{formatChips(player.totalEvChips)} chips
                    </p>
                  )}
                </div>
                )
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function ModeToggle({
  value,
  onChange,
}: {
  value: 'hand' | 'range'
  onChange: (mode: 'hand' | 'range') => void
}) {
  return (
    <div className="flex rounded-md bg-slate-800 p-0.5">
      {(['hand', 'range'] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            value === mode ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {mode === 'hand' ? 'Specific hand' : 'Range'}
        </button>
      ))}
    </div>
  )
}

function PresetSelect({ onLoad }: { onLoad: (id: string) => void }) {
  return (
    <select
      defaultValue=""
      onChange={(e) => {
        if (e.target.value) {
          onLoad(e.target.value)
          e.target.value = ''
        }
      }}
      className="w-full rounded-md border border-slate-600 bg-slate-800 text-slate-200 text-xs px-2 py-1.5"
    >
      <option value="">Load preset range…</option>
      {PREDEFINED_RANGES.map((range) => (
        <option key={range.id} value={range.id}>
          {range.category} · {range.label}
        </option>
      ))}
    </select>
  )
}

function StackField({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  hint?: string
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-slate-300">
      <span>{label}</span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-md border border-slate-600 bg-slate-800 text-slate-200 text-sm px-2 py-1.5 tabular-nums"
      />
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

function formatEvChips(value: number): string {
  const rounded = Math.round(value)
  return `${rounded >= 0 ? '+' : ''}${formatChips(rounded)}`
}

function CallSuggestion({
  callEv,
}: {
  callEv: {
    callAmount: number
    evChips: number
    chipEvChips: number
    bountyEvChips: number
    recommendation: 'call' | 'fold'
  }
}) {
  const isCall = callEv.recommendation === 'call'
  const border = isCall ? 'border-emerald-800/60' : 'border-red-800/60'
  const badge = isCall ? 'bg-emerald-900/60 text-emerald-300' : 'bg-red-900/60 text-red-300'

  return (
    <div className={`rounded-lg border ${border} bg-slate-950/50 p-4`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className={`rounded px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${badge}`}>
          {isCall ? 'Call' : 'Fold'}
        </span>
        <p className="text-sm text-white">
          {isCall ? 'Calling is ' : 'Calling is '}
          <span className={`font-bold tabular-nums ${isCall ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatEvChips(callEv.evChips)} chips EV
          </span>
          {' '}for a {formatChips(callEv.callAmount)} chip call
        </p>
      </div>
      <p className="text-xs text-slate-500 mt-2">
        Chip EV {formatEvChips(callEv.chipEvChips)} chips
        {callEv.bountyEvChips > 0 ? ` · bounty ${formatEvChips(callEv.bountyEvChips)} chips` : ''}
        {!isCall && ' — fold is higher EV than calling.'}
      </p>
    </div>
  )
}

function BountyField({
  label,
  value,
  onChange,
  buyIn,
  startingStack,
  captureChips,
  covered,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  buyIn: number
  startingStack: number
  captureChips: number
  covered: boolean
}) {
  const amount = parseNonNegativeNumber(value, 0)
  const bountyChips = bountyAmountToChips(amount, buyIn, startingStack)

  return (
    <label className="flex flex-col gap-1 text-sm text-slate-300">
      <span>{label}</span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="rounded-md border border-slate-600 bg-slate-800 text-slate-200 text-sm px-2 py-1.5 tabular-nums"
      />
      <span className="text-xs text-slate-500">
        {amount > 0
          ? `$${amount} = ${formatChips(bountyChips)} chips`
          : 'Bounty amount in buy-in currency'}
        {amount > 0 && (
          <span className={covered ? ' text-emerald-400' : ' text-amber-400'}>
            {covered
              ? ` · capture ${formatChips(captureChips)}`
              : ' · not covered'}
          </span>
        )}
      </span>
    </label>
  )
}
