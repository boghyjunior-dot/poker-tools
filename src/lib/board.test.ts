import { describe, it, expect } from 'vitest'
import { ALL_CELLS } from './matrix'
import { getCombosInRange } from './combos'
import { computeFoldStats } from './mdf'
import {
  getStreet,
  getStreetBoundaryCrossed,
  isComboBlockedByBoard,
  shouldResetLocks,
  shouldResetStreetDecision,
} from './board'
import { cellKey, type BoardCard } from '../types/poker'
import { rangeReducer, initialState, type AppState } from '../state/rangeReducer'

describe('board', () => {
  it('derives street from board length', () => {
    expect(getStreet([])).toBe('preflop')
    expect(getStreet([{ rank: 0, suit: 's' }, { rank: 1, suit: 'h' }, { rank: 2, suit: 'd' }])).toBe('flop')
    expect(getStreet([{ rank: 0, suit: 's' }, { rank: 1, suit: 'h' }, { rank: 2, suit: 'd' }, { rank: 3, suit: 'c' }])).toBe('turn')
  })

  it('blocks combos that overlap board cards', () => {
    const aks = ALL_CELLS.find((c) => c.label === 'AKs')!
    const board: BoardCard[] = [{ rank: 0, suit: 's' }, { rank: 5, suit: 'h' }, { rank: 8, suit: 'd' }]
    expect(isComboBlockedByBoard(aks, 's', board)).toBe(true)
    expect(isComboBlockedByBoard(aks, 'h', board)).toBe(false)
  })

  it('excludes blocked combos from range math', () => {
    const aks = ALL_CELLS.find((c) => c.label === 'AKs')!
    const board: BoardCard[] = [{ rank: 0, suit: 's' }, { rank: 5, suit: 'h' }, { rank: 8, suit: 'd' }]
    expect(getCombosInRange(aks, new Set(), undefined, board)).toHaveLength(3)
  })

  it('resets street decision when flop completes', () => {
    expect(
      shouldResetStreetDecision([], [{ rank: 0, suit: 's' }, { rank: 1, suit: 'h' }, { rank: 2, suit: 'd' }]),
    ).toBe(true)
    expect(
      shouldResetStreetDecision(
        [{ rank: 0, suit: 's' }, { rank: 1, suit: 'h' }, { rank: 2, suit: 'd' }],
        [{ rank: 0, suit: 's' }, { rank: 1, suit: 'h' }, { rank: 2, suit: 'd' }],
      ),
    ).toBe(false)
  })

  it('detects flop, turn, and river boundary crossings', () => {
    const flop = [{ rank: 0, suit: 's' }, { rank: 1, suit: 'h' }, { rank: 2, suit: 'd' }] as BoardCard[]
    const turn = [...flop, { rank: 3, suit: 'c' }] as BoardCard[]
    const river = [...turn, { rank: 4, suit: 's' }] as BoardCard[]

    expect(getStreetBoundaryCrossed(flop.slice(0, 2), flop)).toBe('flop')
    expect(getStreetBoundaryCrossed(flop, turn)).toBe('turn')
    expect(getStreetBoundaryCrossed(turn, river)).toBe('river')
  })

  it('resets locks on turn and river but not flop', () => {
    const flop = [{ rank: 0, suit: 's' }, { rank: 1, suit: 'h' }, { rank: 2, suit: 'd' }] as BoardCard[]
    const turn = [...flop, { rank: 3, suit: 'c' }] as BoardCard[]
    const river = [...turn, { rank: 4, suit: 'h' }] as BoardCard[]

    expect(shouldResetLocks([], flop)).toBe(false)
    expect(shouldResetLocks(flop.slice(0, 2), flop)).toBe(false)
    expect(shouldResetLocks(flop, turn)).toBe(true)
    expect(shouldResetLocks(turn, river)).toBe(true)
  })

  it('clears rank and suit locks when turn is dealt', () => {
    const flop = [
      { rank: 0, suit: 'h' },
      { rank: 1, suit: 'c' },
      { rank: 8, suit: 'd' },
    ] as BoardCard[]

    let state: AppState = {
      ...initialState,
      board: flop,
      excludedRanks: [0],
      excludedSuits: ['s'],
      pairsLocked: true,
    }

    state = rangeReducer(state, { type: 'SET_BOARD_CARD', index: 3, card: { rank: 4, suit: 's' } })
    expect(state.excludedRanks).toEqual([])
    expect(state.excludedSuits).toEqual([])
    expect(state.pairsLocked).toBe(false)
  })

  it('keeps locks when flop completes', () => {
    let state: AppState = {
      ...initialState,
      excludedRanks: [0],
      excludedSuits: ['s'],
    }

    state = rangeReducer(state, { type: 'SET_BOARD_CARD', index: 0, card: { rank: 0, suit: 'h' } })
    state = rangeReducer(state, { type: 'SET_BOARD_CARD', index: 1, card: { rank: 1, suit: 'c' } })
    state = rangeReducer(state, { type: 'SET_BOARD_CARD', index: 2, card: { rank: 8, suit: 'd' } })

    expect(state.excludedRanks).toEqual([0])
    expect(state.excludedSuits).toEqual(['s'])
  })

  it('resets bet target when turn and river are dealt', () => {
    const aks = ALL_CELLS.find((c) => c.label === 'AKs')!
    const key = cellKey(aks.row, aks.col)
    const flop = [
      { rank: 0, suit: 'h' },
      { rank: 1, suit: 'c' },
      { rank: 8, suit: 'd' },
    ] as BoardCard[]

    let state: AppState = {
      ...initialState,
      board: flop,
      cellStates: { [key]: 'in' as const },
      betLabel: 'b100',
    }

    state = rangeReducer(state, { type: 'SET_BOARD_CARD', index: 3, card: { rank: 4, suit: 's' } })
    expect(state.betLabel).toBe('b50')

    state = { ...state, betLabel: 'b150' }
    state = rangeReducer(state, { type: 'SET_BOARD_CARD', index: 4, card: { rank: 5, suit: 'h' } })
    expect(state.betLabel).toBe('b50')
  })

  it('resets tags and bet when flop is dealt', () => {
    const aks = ALL_CELLS.find((c) => c.label === 'AKs')!
    const key = cellKey(aks.row, aks.col)
    let state: AppState = {
      ...initialState,
      cellStates: { [key]: 'in' as const },
      foldedCombos: { [key]: ['s'] },
      betLabel: 'b100',
    }
    state = rangeReducer(state, { type: 'SET_BOARD_CARD', index: 0, card: { rank: 0, suit: 'h' } })
    state = rangeReducer(state, { type: 'SET_BOARD_CARD', index: 1, card: { rank: 1, suit: 'c' } })
    state = rangeReducer(state, { type: 'SET_BOARD_CARD', index: 2, card: { rank: 8, suit: 'd' } })
    expect(state.board).toHaveLength(3)
    expect(state.foldedCombos).toEqual({})
    expect(state.calledCombos).toEqual({})
    expect(state.betLabel).toBe('b50')
    expect(state.cellStates[key]).toBe('in')
    expect(state.rangeCombos[key]).toEqual(['d'])
  })

  it('keeps locked-suit combos in range after a street', () => {
    const aks = ALL_CELLS.find((c) => c.label === 'AKs')!
    const key = cellKey(aks.row, aks.col)
    let state: AppState = {
      ...initialState,
      cellStates: { [key]: 'in' as const },
      rangeCombos: { [key]: ['s', 'd'] },
      foldedCombos: { [key]: ['s'] },
      excludedSuits: ['s'],
    }
    state = rangeReducer(state, { type: 'SET_BOARD_CARD', index: 0, card: { rank: 0, suit: 'h' } })
    state = rangeReducer(state, { type: 'SET_BOARD_CARD', index: 1, card: { rank: 1, suit: 'c' } })
    state = rangeReducer(state, { type: 'SET_BOARD_CARD', index: 2, card: { rank: 8, suit: 'd' } })

    expect(state.cellStates[key]).toBe('in')
    const continuing = getCombosInRange(
      aks,
      new Set(state.excludedSuits),
      state.rangeCombos[key],
      state.board,
    )
    expect(continuing).toContain('s')
    expect(continuing).toContain('d')
  })

  it('keeps locked-suit combos in range when blocked by board', () => {
    const aks = ALL_CELLS.find((c) => c.label === 'AKs')!
    const board: BoardCard[] = [{ rank: 0, suit: 's' }, { rank: 5, suit: 'h' }, { rank: 8, suit: 'd' }]
    const inRange = getCombosInRange(aks, new Set(['s']), ['s', 'h'], board)
    expect(inRange).toContain('s')
    expect(inRange).toContain('h')
  })

  it('removes fully folded hands from range after a street', () => {
    const aa = ALL_CELLS.find((c) => c.label === 'AA')!
    const kk = ALL_CELLS.find((c) => c.label === 'KK')!
    const aaKey = cellKey(aa.row, aa.col)
    const kkKey = cellKey(kk.row, kk.col)
    let state: AppState = {
      ...initialState,
      cellStates: {
        [aaKey]: 'fold' as const,
        [kkKey]: 'call' as const,
      },
    }

    state = rangeReducer(state, { type: 'SET_BOARD_CARD', index: 0, card: { rank: 2, suit: 's' } })
    state = rangeReducer(state, { type: 'SET_BOARD_CARD', index: 1, card: { rank: 3, suit: 'h' } })
    state = rangeReducer(state, { type: 'SET_BOARD_CARD', index: 2, card: { rank: 4, suit: 'd' } })

    expect(state.cellStates[aaKey]).toBeUndefined()
    expect(state.cellStates[kkKey]).toBe('in')
  })

  it('reduces MDF combo count when board blocks hole cards', () => {
    const aks = ALL_CELLS.find((c) => c.label === 'AKs')!
    const key = cellKey(aks.row, aks.col)
    const board: BoardCard[] = [{ rank: 0, suit: 's' }, { rank: 5, suit: 'h' }, { rank: 8, suit: 'd' }]
    const stats = computeFoldStats(
      { [key]: 'in' },
      {},
      {},
      {},
      'b50',
      board,
    )
    expect(stats.total).toBe(3)
  })
})
