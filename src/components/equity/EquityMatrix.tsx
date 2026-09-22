import { Fragment, useEffect, useRef } from 'react'
import { RANKS, cellKey, type RankIndex } from '../../types/poker'
import { ALL_CELLS } from '../../lib/matrix'
import {
  cellWeight,
  countRangeCombosFromStates,
  nextWeight,
  type RangeCellStates,
} from '../../lib/equityRange'

interface EquityMatrixProps {
  cellStates: RangeCellStates
  /** Set how often this hand is in the range, 0–100. */
  onSetWeight: (row: RankIndex, col: RankIndex, weight: number) => void
  onClear: () => void
}

/**
 * One hand in the grid, filled from the bottom by how often it is played.
 *
 * The fill is what makes a mixed range readable at a glance — a column of
 * part-filled cells reads as a frequency where a number in every cell would
 * just be noise. The number appears only where the hand is partial, since a
 * hand at 100% has nothing to say that the solid fill does not.
 */
function WeightedCell({
  label,
  weight,
  onPointerDown,
  onPointerEnter,
  onContextMenu,
}: {
  label: string
  weight: number
  onPointerDown: () => void
  onPointerEnter: () => void
  onContextMenu: (event: React.MouseEvent) => void
}) {
  const empty = weight <= 0
  return (
    <button
      type="button"
      onPointerDown={(event) => {
        event.preventDefault()
        onPointerDown()
      }}
      onPointerEnter={onPointerEnter}
      onContextMenu={onContextMenu}
      aria-label={`${label} ${weight}%`}
      className={`relative flex aspect-square w-full min-w-0 select-none items-center justify-center overflow-hidden rounded-sm border text-[9px] font-semibold leading-none transition-colors sm:text-[10px] ${
        empty
          ? 'border-slate-700 bg-slate-800 text-slate-500'
          : 'border-blue-600 bg-slate-900 text-blue-50'
      }`}
    >
      {!empty && (
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 bg-blue-700"
          style={{ height: `${weight}%` }}
        />
      )}
      <span className="relative">{label}</span>
      {!empty && weight < 100 && (
        <span
          aria-hidden
          className="absolute right-0 top-0 px-px text-[7px] font-bold text-blue-100/90"
        >
          {weight}
        </span>
      )}
    </button>
  )
}

export function EquityMatrix({ cellStates, onSetWeight, onClear }: EquityMatrixProps) {
  // A drag paints one frequency rather than cycling every cell it crosses:
  // the weight the first cell landed on is the weight the whole stroke gets.
  const paintRef = useRef<number | null>(null)

  useEffect(() => {
    const endDrag = () => {
      paintRef.current = null
    }
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)
    return () => {
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
    }
  }, [])

  const comboCount = countRangeCombosFromStates(cellStates)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-slate-400">{comboCount} combos</span>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-slate-400 transition-colors hover:text-white"
        >
          Clear
        </button>
      </div>
      <div className="overflow-x-auto">
        <div
          className="inline-grid gap-0.5"
          style={{ gridTemplateColumns: 'repeat(14, minmax(24px, 1fr))' }}
        >
          <div className="h-6 w-6" />
          {RANKS.map((rank) => (
            <div
              key={`col-${rank}`}
              className="flex h-6 w-6 items-center justify-center text-[10px] font-bold text-slate-500"
            >
              {rank}
            </div>
          ))}

          {RANKS.map((rowRank, row) => (
            <Fragment key={`row-${rowRank}`}>
              <div className="flex h-6 w-6 items-center justify-center text-[10px] font-bold text-slate-500">
                {rowRank}
              </div>
              {RANKS.map((_, col) => {
                const cell = ALL_CELLS.find((c) => c.row === row && c.col === col)!
                const key = cellKey(row as RankIndex, col as RankIndex)
                const weight = cellWeight(cellStates, key)
                return (
                  <WeightedCell
                    key={key}
                    label={cell.label}
                    weight={weight}
                    onPointerDown={() => {
                      const painted = nextWeight(weight)
                      paintRef.current = painted
                      onSetWeight(row as RankIndex, col as RankIndex, painted)
                    }}
                    onPointerEnter={() => {
                      if (paintRef.current !== null) {
                        onSetWeight(row as RankIndex, col as RankIndex, paintRef.current)
                      }
                    }}
                    onContextMenu={(event) => {
                      event.preventDefault()
                      onSetWeight(row as RankIndex, col as RankIndex, 0)
                    }}
                  />
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>
      <p className="text-[10px] text-slate-500">
        Click to cycle 100 → 75 → 50 → 25 → 0. Drag to paint, right-click to remove.
      </p>
    </div>
  )
}
