import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useMemo,
  type Dispatch,
  type ReactNode,
} from 'react'
import {
  rangeReducer,
  initialState,
  loadState,
  saveState,
  type AppAction,
  type AppState,
} from './rangeReducer'
import { computeFoldStats } from '../lib/mdf'
import type { FoldStats, RankIndex, SuitId } from '../types/poker'

interface RangeContextValue {
  state: AppState
  dispatch: Dispatch<AppAction>
  stats: FoldStats
  excludedRankSet: Set<RankIndex>
  excludedSuitSet: Set<SuitId>
}

const RangeContext = createContext<RangeContextValue | null>(null)

export function RangeProvider({
  children,
  persist = true,
}: {
  children: ReactNode
  persist?: boolean
}) {
  const [state, dispatch] = useReducer(rangeReducer, initialState, (init) => {
    if (!persist) return init
    const saved = loadState()
    return saved ? { ...init, ...saved } : init
  })

  useEffect(() => {
    if (!persist) return
    saveState(state)
  }, [
    state.cellStates,
    state.foldedCombos,
    state.calledCombos,
    state.rangeCombos,
    state.board,
    state.betLabel,
    state.customPot,
    state.customBet,
    state.excludedRanks,
    state.excludedSuits,
    state.pairsLocked,
    state.mode,
  ])

  const excludedRankSet = useMemo(
    () => new Set(state.excludedRanks),
    [state.excludedRanks],
  )

  const excludedSuitSet = useMemo(
    () => new Set(state.excludedSuits),
    [state.excludedSuits],
  )

  const stats = useMemo(
    () =>
      computeFoldStats(
        state.cellStates,
        state.foldedCombos,
        state.calledCombos,
        state.rangeCombos,
        state.betLabel,
        state.board,
        state.customBet,
        state.customPot,
        excludedSuitSet,
      ),
    [
      state.cellStates,
      state.foldedCombos,
      state.calledCombos,
      state.rangeCombos,
      state.betLabel,
      state.board,
      state.customBet,
      state.customPot,
      excludedSuitSet,
    ],
  )

  return (
    <RangeContext.Provider value={{ state, dispatch, stats, excludedRankSet, excludedSuitSet }}>
      {children}
    </RangeContext.Provider>
  )
}

export function useRange(): RangeContextValue {
  const ctx = useContext(RangeContext)
  if (!ctx) throw new Error('useRange must be used within RangeProvider')
  return ctx
}
