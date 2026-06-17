import { useState } from 'react'
import { RangeProvider, useRange } from '../../state/RangeContext'
import { HandMatrix } from '../HandMatrix'
import { ComboPanel } from '../ComboPanel'
import { StatsBar } from '../StatsBar'
import { MdfTargetDisplay } from '../MdfTargetDisplay'
import { Legend } from '../Legend'
import { BackToMenu } from '../BackToMenu'
import { PlayingCard } from '../PlayingCard'
import { pruneFoldedCombosFromRange } from '../../lib/combos'
import {
  buildStreetScore,
  feedbackMessage,
  formatBoardLine,
  nextStreet,
  randomBetLabel,
  randomBoardCards,
  STREET_LABEL,
  type PracticeStreet,
  type StreetScore,
} from '../../lib/practice'
import {
  getPredefinedRange,
  getPredefinedRangeCategories,
  PREDEFINED_RANGES,
  parsePredefinedRange,
} from '../../lib/predefinedRanges'
import { MDF_BETS, type BoardCard } from '../../types/poker'

type Phase = 'menu' | 'playing' | 'feedback' | 'complete'

function betDescription(label: string): string {
  const bet = MDF_BETS.find((b) => b.label === label)
  return bet ? `${label} (${bet.foldPct}% fold target)` : label
}

export function PracticePage() {
  return (
    <RangeProvider persist={false}>
      <PracticeGame />
    </RangeProvider>
  )
}

function PracticeGame() {
  const { state, dispatch, stats } = useRange()
  const [phase, setPhase] = useState<Phase>('menu')
  const [rangeId, setRangeId] = useState(PREDEFINED_RANGES[0]?.id ?? '')
  const [useRandomRange, setUseRandomRange] = useState(false)
  const [street, setStreet] = useState<PracticeStreet>('flop')
  const [scores, setScores] = useState<StreetScore[]>([])
  const [feedback, setFeedback] = useState<StreetScore | null>(null)
  const categories = getPredefinedRangeCategories()

  const totalPoints = scores.reduce((sum, s) => sum + s.points, 0)
  const maxPoints = scores.length * 3

  const startSession = (pickedRangeId: string) => {
    const range = getPredefinedRange(pickedRangeId)
    if (!range) return

    const board = randomBoardCards(3)
    const betLabel = randomBetLabel()

    dispatch({
      type: 'LOAD_STATE',
      state: {
        cellStates: parsePredefinedRange(range),
        foldedCombos: {},
        calledCombos: {},
        rangeCombos: {},
        board,
        betLabel,
        mode: 'selectCombos',
        excludedRanks: [],
        excludedSuits: [],
        pairsLocked: false,
        selectedCell: null,
        customBet: '',
        customPot: '',
      },
    })

    setStreet('flop')
    setScores([])
    setFeedback(null)
    setPhase('playing')
  }

  const handleStart = () => {
    const id = useRandomRange
      ? PREDEFINED_RANGES[Math.floor(Math.random() * PREDEFINED_RANGES.length)].id
      : rangeId
    setRangeId(id)
    startSession(id)
  }

  const handleSubmit = () => {
    if (stats.untagged > 0) return
    const result = buildStreetScore(street, state.betLabel, stats.currentPct)
    setScores((prev) => [...prev, result])
    setFeedback(result)
    setPhase('feedback')
  }

  const handleContinue = () => {
    const upcoming = nextStreet(street)
    if (!upcoming) {
      setPhase('complete')
      return
    }

    const pruned = pruneFoldedCombosFromRange(
      state.cellStates,
      state.foldedCombos,
      state.calledCombos,
      state.rangeCombos,
      new Set(state.excludedSuits),
      state.board,
    )

    const [newCard] = randomBoardCards(1, state.board)

    dispatch({
      type: 'LOAD_STATE',
      state: {
        cellStates: pruned.cellStates,
        rangeCombos: pruned.rangeCombos,
        board: [...state.board, newCard],
        foldedCombos: {},
        calledCombos: {},
        betLabel: randomBetLabel(),
        mode: 'selectCombos',
        selectedCell: null,
      },
    })

    setStreet(upcoming)
    setFeedback(null)
    setPhase('playing')
  }

  const activeRange = getPredefinedRange(rangeId)

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-7xl mx-auto">
      <header className="mb-6">
        <BackToMenu className="mb-2" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">MDF Practice</h1>
            <p className="text-sm text-slate-400">
              Defend a preset range on flop, turn, and river vs random bet sizes.
            </p>
          </div>
          {phase !== 'menu' && (
            <div className="rounded-lg border border-indigo-700/50 bg-indigo-950/30 px-4 py-2 text-right">
              <p className="text-[10px] uppercase tracking-wider text-indigo-300/80">Score</p>
              <p className="text-2xl font-bold text-white tabular-nums">
                {totalPoints}
                <span className="text-sm text-slate-400"> / {phase === 'complete' ? 9 : maxPoints || '—'}</span>
              </p>
            </div>
          )}
        </div>
      </header>

      {phase === 'menu' && (
        <section className="max-w-md mx-auto rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">New session</h2>
          <p className="text-sm text-slate-400">
            You will face three streets. Tag combos as fold or call to match the MDF target each time.
          </p>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={useRandomRange}
              onChange={(e) => setUseRandomRange(e.target.checked)}
              className="rounded border-slate-600"
            />
            Random preset range
          </label>

          {!useRandomRange && (
            <select
              value={rangeId}
              onChange={(e) => setRangeId(e.target.value)}
              className="w-full rounded-md border border-slate-600 bg-slate-800 text-slate-200 text-sm px-3 py-2"
            >
              {categories.map((category) => (
                <optgroup key={category} label={category.replace('MTT · 40BB · ', '')}>
                  {PREDEFINED_RANGES.filter((r) => r.category === category).map((range) => (
                    <option key={range.id} value={range.id}>
                      {range.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={handleStart}
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            Start practice
          </button>
        </section>
      )}

      {phase !== 'menu' && (
        <div className="space-y-4">
          <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Street</p>
                <p className="text-lg font-bold text-white">{STREET_LABEL[street]}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Board</p>
                <div className="flex items-center gap-1.5">
                  {state.board.map((card: BoardCard, i: number) => (
                    <PlayingCard key={`${card.rank}-${card.suit}-${i}`} card={card} size="sm" variant="board" />
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-1 sm:hidden">{formatBoardLine(state.board)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Villain bet</p>
                <p className="text-lg font-bold text-amber-300">{betDescription(state.betLabel)}</p>
              </div>
              {activeRange && phase === 'playing' && (
                <div className="ml-auto text-right">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Range</p>
                  <p className="text-sm text-slate-300">{activeRange.category} · {activeRange.label}</p>
                </div>
              )}
            </div>
          </section>

          {phase === 'playing' && (
            <>
              <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                <StatsBar />
              </section>

              <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-sm text-slate-400 mb-4">
                  Click a hand, then tag each combo <span className="text-red-400 font-medium">F</span> fold or{' '}
                  <span className="text-emerald-400 font-medium">C</span> call. Match the target fold %.
                </p>
                <div className="flex flex-col xl:flex-row gap-4 xl:gap-6 items-start">
                  <div className="shrink-0">
                    <HandMatrix />
                  </div>
                  <div className="w-full xl:flex-1 xl:min-w-0 border-t xl:border-t-0 xl:border-l border-slate-700 pt-4 xl:pt-0 xl:pl-6">
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
                      <div className="flex-1 min-w-0 w-full">
                        <h2 className="text-sm font-semibold text-slate-300 mb-3">Combo detail</h2>
                        <ComboPanel />
                      </div>
                      <div className="shrink-0 sm:ml-auto w-full sm:w-auto">
                        <MdfTargetDisplay compact />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <Legend />
                </div>
              </section>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={stats.untagged > 0 || stats.total === 0}
                  className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Submit {STREET_LABEL[street].toLowerCase()} defense
                </button>
                {stats.untagged > 0 && (
                  <p className="text-sm text-amber-400">
                    Tag all {stats.untagged} remaining combo{stats.untagged === 1 ? '' : 's'} before submitting.
                  </p>
                )}
              </div>
            </>
          )}

          {phase === 'feedback' && feedback && (
            <section className="rounded-xl border border-slate-700 bg-slate-900/80 p-6 max-w-lg mx-auto text-center space-y-4">
              <p className="text-sm uppercase tracking-wider text-slate-400">{STREET_LABEL[feedback.street]} result</p>
              <p className="text-4xl font-bold text-white tabular-nums">
                +{feedback.points}
                <span className="text-lg text-slate-400"> / 3</span>
              </p>
              <p className="text-slate-300">
                You folded <span className="font-semibold text-white">{feedback.actualPct.toFixed(1)}%</span>
                {' '}vs target <span className="font-semibold text-white">{feedback.targetPct.toFixed(0)}%</span>
                {' '}({betDescription(feedback.betLabel)})
              </p>
              <p className="text-sm text-slate-400">{feedbackMessage(feedback)}</p>
              <button
                type="button"
                onClick={handleContinue}
                className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
              >
                {nextStreet(street) ? `Continue to ${STREET_LABEL[nextStreet(street)!]}` : 'See final score'}
              </button>
            </section>
          )}

          {phase === 'complete' && (
            <section className="rounded-xl border border-slate-700 bg-slate-900/80 p-6 max-w-lg mx-auto text-center space-y-5">
              <h2 className="text-xl font-bold text-white">Session complete</h2>
              <p className="text-5xl font-bold text-indigo-300 tabular-nums">{totalPoints} / 9</p>
              <div className="space-y-2 text-left">
                {scores.map((s) => (
                  <div key={s.street} className="flex justify-between text-sm border-b border-slate-800 pb-2">
                    <span className="text-slate-400">{STREET_LABEL[s.street]}</span>
                    <span className="text-slate-200">
                      {s.actualPct.toFixed(1)}% vs {s.targetPct.toFixed(0)}% · +{s.points} pts
                    </span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setPhase('menu')}
                className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
              >
                Play again
              </button>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
