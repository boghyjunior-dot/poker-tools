import {
  cellKey,
  type BoardCard,
  type CellState,
  type ComboDisposition,
  type InteractionMode,
  type RankIndex,
  type SuitId,
} from '../types/poker'
import {
  getCombosInRange,
  getEligibleCellComboKeys,
  getExpandedComboSets,
  pruneFoldedCombosFromRange,
  serializeComboSets,
  setsFromDisposition,
} from '../lib/combos'
import { isCellLocked, isComboLocked } from '../lib/filters'
import { isBoardCardTaken, shouldResetLocks, shouldResetStreetDecision } from '../lib/board'
import { getPredefinedRange, parsePredefinedRange } from '../lib/predefinedRanges'
import { ALL_CELLS } from '../lib/matrix'

const STORAGE_KEY = 'poker-tools-mdf-state'
const LEGACY_STORAGE_KEY = 'mdf-range-tool-state'

export interface SelectedCell {
  row: RankIndex
  col: RankIndex
}

export interface AppState {
  cellStates: Record<string, CellState>
  foldedCombos: Record<string, string[]>
  calledCombos: Record<string, string[]>
  rangeCombos: Record<string, string[]>
  board: BoardCard[]
  mode: InteractionMode
  betLabel: string
  customPot: string
  customBet: string
  excludedRanks: RankIndex[]
  excludedSuits: SuitId[]
  pairsLocked: boolean
  selectedCell: SelectedCell | null
  isDragging: boolean
}

export type AppAction =
  | { type: 'SET_CELL'; row: RankIndex; col: RankIndex; inverse?: boolean }
  | { type: 'ERASE_CELL'; row: RankIndex; col: RankIndex }
  | { type: 'SET_MODE'; mode: InteractionMode }
  | { type: 'SET_BET'; betLabel: string }
  | { type: 'SET_CUSTOM_SIZES'; customPot?: string; customBet?: string }
  | { type: 'SET_BOARD_CARD'; index: number; card: BoardCard | null }
  | { type: 'CLEAR_BOARD' }
  | { type: 'TOGGLE_RANK'; rank: RankIndex }
  | { type: 'TOGGLE_PAIRS_LOCK' }
  | { type: 'TOGGLE_EXCLUDED_SUIT'; suit: SuitId }
  | { type: 'SET_COMBO_DISPOSITION'; row: RankIndex; col: RankIndex; comboKey: string; disposition: ComboDisposition }
  | { type: 'SET_ALL_COMBO_DISPOSITIONS'; row: RankIndex; col: RankIndex; disposition: ComboDisposition }
  | { type: 'SELECT_CELL'; row: RankIndex; col: RankIndex } | { type: 'CLEAR_SELECTED_CELL' }
  | { type: 'CLEAR_RANGE' }
  | { type: 'LOAD_PREDEFINED_RANGE'; rangeId: string }
  | { type: 'SET_DRAGGING'; isDragging: boolean }
  | { type: 'LOAD_STATE'; state: Partial<AppState> }

export const initialState: AppState = {
  cellStates: {},
  foldedCombos: {},
  calledCombos: {},
  rangeCombos: {},
  board: [],
  mode: 'selectCombos',
  betLabel: 'b50',
  customPot: '',
  customBet: '',
  excludedRanks: [],
  excludedSuits: [],
  pairsLocked: false,
  selectedCell: null,
  isDragging: false,
}

function getCell(row: RankIndex, col: RankIndex) {
  return ALL_CELLS.find((c) => c.row === row && c.col === col)!
}

function clearCellDispositionTags(
  foldedCombos: Record<string, string[]>,
  calledCombos: Record<string, string[]>,
  key: string,
): Pick<ReturnType<typeof clearCellComboTags>, 'foldedCombos' | 'calledCombos'> {
  let nextFolded = foldedCombos
  let nextCalled = calledCombos

  if (key in foldedCombos) {
    nextFolded = { ...foldedCombos }
    delete nextFolded[key]
  }
  if (key in calledCombos) {
    nextCalled = { ...calledCombos }
    delete nextCalled[key]
  }

  return { foldedCombos: nextFolded, calledCombos: nextCalled }
}

function clearCellComboTags(
  foldedCombos: Record<string, string[]>,
  calledCombos: Record<string, string[]>,
  rangeCombos: Record<string, string[]>,
  key: string,
): {
  foldedCombos: Record<string, string[]>
  calledCombos: Record<string, string[]>
  rangeCombos: Record<string, string[]>
} {
  let nextFolded = foldedCombos
  let nextCalled = calledCombos
  let nextRange = rangeCombos

  if (key in foldedCombos) {
    nextFolded = { ...foldedCombos }
    delete nextFolded[key]
  }
  if (key in calledCombos) {
    nextCalled = { ...calledCombos }
    delete nextCalled[key]
  }
  if (key in rangeCombos) {
    nextRange = { ...rangeCombos }
    delete nextRange[key]
  }

  return { foldedCombos: nextFolded, calledCombos: nextCalled, rangeCombos: nextRange }
}

function applyModeToCell(current: CellState, mode: InteractionMode, inverse = false): CellState {
  switch (mode) {
    case 'selectCombos':
      return current
    case 'erase':
      return inverse ? (current === 'out' ? 'out' : 'in') : 'out'
    case 'paint':
      return inverse ? 'out' : 'in'
    case 'call':
      if (current === 'out') return 'out'
      return inverse ? 'fold' : 'call'
    case 'fold':
      if (current === 'out') return 'out'
      return inverse ? 'call' : 'fold'
  }
}

function paintCell(
  state: AppState,
  row: RankIndex,
  col: RankIndex,
): Pick<AppState, 'cellStates' | 'foldedCombos' | 'calledCombos' | 'rangeCombos'> {
  const key = cellKey(row, col)
  const current = state.cellStates[key]
  const cell = getCell(row, col)
  const eligible = getEligibleCellComboKeys(cell, new Set())
  if (eligible.length === 0) {
    return {
      cellStates: state.cellStates,
      foldedCombos: state.foldedCombos,
      calledCombos: state.calledCombos,
      rangeCombos: state.rangeCombos,
    }
  }

  if (current === 'in' || current === 'call' || current === 'fold') {
    return {
      cellStates: state.cellStates,
      foldedCombos: state.foldedCombos,
      calledCombos: state.calledCombos,
      rangeCombos: state.rangeCombos,
    }
  }

  const cleared = clearCellComboTags(state.foldedCombos, state.calledCombos, state.rangeCombos, key)
  const rangeCombos = { ...cleared.rangeCombos }
  delete rangeCombos[key]

  return {
    cellStates: { ...state.cellStates, [key]: 'in' },
    foldedCombos: cleared.foldedCombos,
    calledCombos: cleared.calledCombos,
    rangeCombos,
  }
}

function setCellState(
  state: AppState,
  row: RankIndex,
  col: RankIndex,
  mode: InteractionMode,
  inverse = false,
): Pick<AppState, 'cellStates' | 'foldedCombos' | 'calledCombos' | 'rangeCombos'> {
  if (mode === 'paint' && !inverse) {
    return paintCell(state, row, col)
  }

  const { cellStates, foldedCombos, calledCombos, rangeCombos } = state
  const key = cellKey(row, col)
  const current = cellStates[key] ?? 'out'
  const next = applyModeToCell(current, mode, inverse)

  if (next === current) {
    return { cellStates, foldedCombos, calledCombos, rangeCombos }
  }

  const updated = { ...cellStates }

  if (next === 'out') {
    delete updated[key]
    return { cellStates: updated, ...clearCellComboTags(foldedCombos, calledCombos, rangeCombos, key) }
  }

  updated[key] = next

  if (mode === 'call' || mode === 'fold') {
    return {
      cellStates: updated,
      ...clearCellDispositionTags(foldedCombos, calledCombos, key),
      rangeCombos,
    }
  }

  return {
    cellStates: updated,
    ...clearCellComboTags(foldedCombos, calledCombos, rangeCombos, key),
  }
}

function applyStreetTransition(
  state: AppState,
  board: BoardCard[],
): Pick<AppState, 'cellStates' | 'rangeCombos' | 'foldedCombos' | 'calledCombos' | 'betLabel'> {
  const pruned = pruneFoldedCombosFromRange(
    state.cellStates,
    state.foldedCombos,
    state.calledCombos,
    state.rangeCombos,
    new Set(state.excludedSuits),
    board,
  )

  return {
    ...pruned,
    foldedCombos: {},
    calledCombos: {},
    betLabel: 'b50',
  }
}

function applyBoardCard(
  board: BoardCard[],
  index: number,
  card: BoardCard | null,
): BoardCard[] | null {
  if (index < 0 || index > 4) return null

  if (card === null) {
    return board.slice(0, index)
  }

  if (index > board.length) return null

  const next = board.slice(0, index)
  if (isBoardCardTaken(next, index, card)) return null
  next.push(card)
  return next
}

function applyComboDispositions(
  state: AppState,
  row: RankIndex,
  col: RankIndex,
  update: (folded: Set<string>, called: Set<string>, eligible: string[]) => {
    folded: Set<string>
    called: Set<string>
  },
): Pick<AppState, 'foldedCombos' | 'calledCombos' | 'cellStates'> {
  const key = cellKey(row, col)
  const cellState = state.cellStates[key] ?? 'out'
  if (cellState === 'out') {
    return {
      foldedCombos: state.foldedCombos,
      calledCombos: state.calledCombos,
      cellStates: state.cellStates,
    }
  }

  const cell = getCell(row, col)
  const eligible = getCombosInRange(
    cell,
    new Set(state.excludedSuits),
    state.rangeCombos[key],
    state.board,
  )
  if (eligible.length === 0) {
    return {
      foldedCombos: state.foldedCombos,
      calledCombos: state.calledCombos,
      cellStates: state.cellStates,
    }
  }

  const lockedSuits = new Set(state.excludedSuits)
  const expanded = getExpandedComboSets(
    cellState,
    new Set(state.foldedCombos[key] ?? []),
    new Set(state.calledCombos[key] ?? []),
    eligible,
    lockedSuits,
  )

  const next = update(expanded.folded, expanded.called, eligible)
  const serialized = serializeComboSets(eligible, next.folded, next.called)

  const foldedCombos = { ...state.foldedCombos }
  const calledCombos = { ...state.calledCombos }

  if (serialized.foldedCombos) foldedCombos[key] = serialized.foldedCombos
  else delete foldedCombos[key]

  if (serialized.calledCombos) calledCombos[key] = serialized.calledCombos
  else delete calledCombos[key]

  const cellStates = { ...state.cellStates, [key]: 'in' as const }

  return { foldedCombos, calledCombos, cellStates }
}

export function rangeReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_CELL': {
      const result = setCellState(
        state,
        action.row,
        action.col,
        state.mode,
        action.inverse ?? false,
      )
      return {
        ...state,
        ...result,
        selectedCell: { row: action.row, col: action.col },
      }
    }
    case 'ERASE_CELL': {
      const key = cellKey(action.row, action.col)
      if (!(key in state.cellStates)) return state
      const updated = { ...state.cellStates }
      delete updated[key]
      const cleared = clearCellComboTags(
        state.foldedCombos,
        state.calledCombos,
        state.rangeCombos,
        key,
      )
      return {
        ...state,
        cellStates: updated,
        ...cleared,
        selectedCell:
          state.selectedCell?.row === action.row && state.selectedCell?.col === action.col
            ? null
            : state.selectedCell,
      }
    }
    case 'SET_MODE':
      return { ...state, mode: action.mode }
    case 'SET_BET':
      return { ...state, betLabel: action.betLabel, customPot: '', customBet: '' }
    case 'SET_CUSTOM_SIZES':
      return {
        ...state,
        customPot: action.customPot ?? state.customPot,
        customBet: action.customBet ?? state.customBet,
      }
    case 'SET_BOARD_CARD': {
      const newBoard = applyBoardCard(state.board, action.index, action.card)
      if (!newBoard) return state
      const reset = shouldResetStreetDecision(state.board, newBoard)
      if (!reset) {
        return { ...state, board: newBoard }
      }

      const transition = applyStreetTransition(state, newBoard)
      const selectedKey = state.selectedCell
        ? cellKey(state.selectedCell.row, state.selectedCell.col)
        : null
      const clearLocks = shouldResetLocks(state.board, newBoard)

      return {
        ...state,
        board: newBoard,
        ...transition,
        ...(clearLocks ? { excludedRanks: [], excludedSuits: [], pairsLocked: false } : {}),
        selectedCell:
          selectedKey && selectedKey in transition.cellStates ? state.selectedCell : null,
      }
    }
    case 'CLEAR_BOARD':
      if (state.board.length === 0) return state
      return {
        ...state,
        board: [],
        foldedCombos: {},
        calledCombos: {},
        betLabel: 'b50',
      }
    case 'TOGGLE_RANK': {
      const excluded = new Set(state.excludedRanks)
      if (excluded.has(action.rank)) {
        excluded.delete(action.rank)
      } else {
        excluded.add(action.rank)
      }
      return { ...state, excludedRanks: [...excluded] }
    }
    case 'TOGGLE_PAIRS_LOCK':
      return { ...state, pairsLocked: !state.pairsLocked }
    case 'TOGGLE_EXCLUDED_SUIT': {
      const excluded = new Set(state.excludedSuits)
      if (excluded.has(action.suit)) {
        excluded.delete(action.suit)
      } else {
        excluded.add(action.suit)
      }
      return { ...state, excludedSuits: [...excluded] }
    }
    case 'SET_COMBO_DISPOSITION': {
      const cell = getCell(action.row, action.col)
      if (isCellLocked(cell, new Set(state.excludedRanks), state.pairsLocked)) return state
      if (isComboLocked(action.comboKey, new Set(state.excludedSuits))) return state
      return {
        ...state,
        ...applyComboDispositions(state, action.row, action.col, (folded, called) =>
          setsFromDisposition(folded, called, action.comboKey, action.disposition),
        ),
        selectedCell: { row: action.row, col: action.col },
      }
    }
    case 'SET_ALL_COMBO_DISPOSITIONS': {
      const key = cellKey(action.row, action.col)
      const cellState = state.cellStates[key] ?? 'out'
      if (cellState === 'out') return state

      if (action.disposition === 'in') {
        return {
          ...state,
          cellStates: { ...state.cellStates, [key]: 'in' },
          ...clearCellDispositionTags(state.foldedCombos, state.calledCombos, key),
          selectedCell: { row: action.row, col: action.col },
        }
      }

      if (action.disposition === 'fold') {
        return {
          ...state,
          cellStates: { ...state.cellStates, [key]: 'fold' },
          ...clearCellDispositionTags(state.foldedCombos, state.calledCombos, key),
          selectedCell: { row: action.row, col: action.col },
        }
      }

      return {
        ...state,
        cellStates: { ...state.cellStates, [key]: 'call' },
        ...clearCellDispositionTags(state.foldedCombos, state.calledCombos, key),
        selectedCell: { row: action.row, col: action.col },
      }
    }
    case 'SELECT_CELL':
      return { ...state, selectedCell: { row: action.row, col: action.col } }
    case 'CLEAR_SELECTED_CELL':
      return { ...state, selectedCell: null }
    case 'CLEAR_RANGE':
      return {
        ...state,
        cellStates: {},
        foldedCombos: {},
        calledCombos: {},
        rangeCombos: {},
        selectedCell: null,
      }
    case 'LOAD_PREDEFINED_RANGE': {
      const range = getPredefinedRange(action.rangeId)
      if (!range) return state
      return {
        ...state,
        cellStates: parsePredefinedRange(range),
        foldedCombos: {},
        calledCombos: {},
        rangeCombos: {},
        board: [],
        selectedCell: null,
      }
    }
    case 'SET_DRAGGING':
      return { ...state, isDragging: action.isDragging }
    case 'LOAD_STATE':
      return { ...state, ...action.state }
    default:
      return state
  }
}

export interface PersistedState {
  cellStates: Record<string, CellState>
  foldedCombos: Record<string, string[]>
  calledCombos: Record<string, string[]>
  rangeCombos: Record<string, string[]>
  board: BoardCard[]
  betLabel: string
  customPot: string
  customBet: string
  excludedRanks: RankIndex[]
  excludedSuits: SuitId[]
  pairsLocked: boolean
  mode: InteractionMode
}

export function saveState(state: AppState): void {
  const persisted: PersistedState = {
    cellStates: state.cellStates,
    foldedCombos: state.foldedCombos,
    calledCombos: state.calledCombos,
    rangeCombos: state.rangeCombos,
    board: state.board,
    betLabel: state.betLabel,
    customPot: state.customPot,
    customBet: state.customBet,
    excludedRanks: state.excludedRanks,
    excludedSuits: state.excludedSuits,
    pairsLocked: state.pairsLocked,
    mode: state.mode,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))
}

export function loadState(): Partial<AppState> | null {
  try {
    let raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      raw = localStorage.getItem(LEGACY_STORAGE_KEY)
      if (raw) {
        localStorage.setItem(STORAGE_KEY, raw)
        localStorage.removeItem(LEGACY_STORAGE_KEY)
      }
    }
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AppState> & { mode?: string }
    const savedMode = parsed.mode as string | undefined
    const mode: InteractionMode | undefined =
      savedMode === 'foldSuit' ? 'selectCombos' : (parsed.mode as InteractionMode | undefined)
    return {
      ...parsed,
      mode,
      foldedCombos: parsed.foldedCombos ?? {},
      calledCombos: parsed.calledCombos ?? {},
      rangeCombos: parsed.rangeCombos ?? {},
      board: parsed.board ?? [],
      customPot: parsed.customPot ?? '',
      customBet: parsed.customBet ?? '',
      pairsLocked: parsed.pairsLocked ?? false,
    }
  } catch {
    return null
  }
}
