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
  }
}

export function EquityPage() {
  const [heroMode, setHeroMode] = useState<HeroMode>('hand')
  const [heroHand, setHeroHand] = useState<[BoardCard | null, BoardCard | null]>([null, null])
  const [heroRange, setHeroRange] = useState<RangeCellStates>(emptyRange())
  const [villains, setVillains] = useState<VillainSlot[]>([newVillain(1)])
  const [activeVillain, setActiveVillain] = useState(0)
  const [iterations, setIterations] = useState(10_000)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<EquityResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const currentVillain = villains[activeVillain]

  const heroCombos = useMemo(() => {
    if (heroMode === 'hand') return heroHand[0] && heroHand[1] ? 1 : 0
    return countRangeCombosFromStates(heroRange)
  }, [heroMode, heroHand, heroRange])

  const selectedMargin = worstCaseMarginOfError(iterations)

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
        setResult(calculateEquity(players, { iterations }))
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
          Preflop equity via Monte Carlo — hand vs range or multiple ranges.
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
            </>
          )}
        </section>
      </div>

      <section className="mt-4 bg-slate-900/60 rounded-lg border border-slate-800 p-4">
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
            </p>
            <div className="space-y-2">
              {result.players.map((player, index) => {
                const moe = marginOfErrorForEquity(player.equity, result.iterations)
                return (
                <div key={player.name} className="flex items-center gap-3">
                  <span className={`w-24 text-sm font-medium ${PLAYER_COLORS[index % PLAYER_COLORS.length]}`}>
                    {player.name}
                  </span>
                  <div className="flex-1 h-6 bg-slate-800 rounded overflow-hidden">
                    <div
                      className="h-full bg-indigo-600/80 transition-all duration-500"
                      style={{ width: `${player.equity}%` }}
                    />
                  </div>
                  <span className="w-28 text-right text-sm font-bold text-white tabular-nums">
                    {player.equity.toFixed(1)}%
                    <span className="ml-1 text-xs font-normal text-slate-400">
                      {formatMarginOfError(moe)}
                    </span>
                  </span>
                  <span className="w-28 text-right text-xs text-slate-500 tabular-nums hidden sm:block">
                    {result.combos[index]} combo{result.combos[index] === 1 ? '' : 's'}
                  </span>
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
