import { Fragment, useEffect, useRef } from 'react'
import { RANKS, cellKey, type RankIndex } from '../../types/poker'
import { ALL_CELLS } from '../../lib/matrix'
import { MatrixCell } from '../MatrixCell'
import type { RangeCellStates } from '../../lib/equityRange'

interface EquityMatrixProps {
  cellStates: RangeCellStates
  onToggle: (row: RankIndex, col: RankIndex, remove?: boolean) => void
  onClear: () => void
}

export function EquityMatrix({ cellStates, onToggle, onClear }: EquityMatrixProps) {
  const dragRef = useRef(false)

  useEffect(() => {
    const endDrag = () => {
      dragRef.current = false
    }
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)
    return () => {
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
    }
  }, [])

  const comboCount = ALL_CELLS.reduce((total, cell) => {
    const key = cellKey(cell.row, cell.col)
    return cellStates[key] === 'in' ? total + cell.combos : total
  }, 0)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-slate-400">{comboCount} combos</span>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-slate-400 hover:text-white transition-colors"
        >
          Clear
        </button>
      </div>
      <div className="overflow-x-auto">
        <div
          className="inline-grid gap-0.5"
          style={{ gridTemplateColumns: 'repeat(14, minmax(24px, 1fr))' }}
        >
          <div className="w-6 h-6" />
          {RANKS.map((rank) => (
            <div
              key={`col-${rank}`}
              className="w-6 h-6 flex items-center justify-center text-[10px] font-bold text-slate-500"
            >
              {rank}
            </div>
          ))}

          {RANKS.map((rowRank, row) => (
            <Fragment key={`row-${rowRank}`}>
              <div className="w-6 h-6 flex items-center justify-center text-[10px] font-bold text-slate-500">
                {rowRank}
              </div>
              {RANKS.map((_, col) => {
                const cell = ALL_CELLS.find((c) => c.row === row && c.col === col)!
                const key = cellKey(row as RankIndex, col as RankIndex)
                const inRange = cellStates[key] === 'in'
                return (
                  <MatrixCell
                    key={key}
                    label={cell.label}
                    state={inRange ? 'in' : 'out'}
                    onPointerDown={() => {
                      dragRef.current = true
                      onToggle(row as RankIndex, col as RankIndex)
                    }}
                    onPointerEnter={() => {
                      if (dragRef.current) onToggle(row as RankIndex, col as RankIndex)
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      onToggle(row as RankIndex, col as RankIndex, true)
                    }}
                  />
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>
      <p className="text-[10px] text-slate-500">Click or drag to paint. Right-click to remove.</p>
    </div>
  )
}
