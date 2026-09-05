import { useMemo } from 'react'
import { ALL_CELLS } from '../../lib/matrix'
import { COLOR_CLASSES, resolveChart, type PreflopChart } from '../../lib/preflopCharts'

const GRID = 'grid grid-cols-[repeat(13,minmax(0,1fr))] gap-px'

/**
 * The 13x13 preflop grid, filled with each layer's colour.
 *
 * `size` "sm" is a thumbnail for the library cards — no text, just the shape
 * of the range, which is what you actually recognise at a glance.
 */
export function ChartMatrix({
  chart,
  highlight,
  size = 'md',
}: {
  chart: PreflopChart
  /** Hand label to ring, e.g. the hand being drilled. */
  highlight?: string
  size?: 'sm' | 'md'
}) {
  const resolved = useMemo(() => resolveChart(chart), [chart])

  return (
    <div className={GRID} role="img" aria-label={`${chart.position} ${chart.stackBb}bb ${chart.action} range`}>
      {ALL_CELLS.map((cell) => {
        const owner = resolved.owner.get(cell.label)
        const mixed = owner?.frequency !== undefined
        const fill = owner && !mixed ? COLOR_CLASSES[owner.color].cell : 'text-white'
        const base = owner ? '' : 'bg-slate-900 text-slate-600'
        const ringed = highlight === cell.label

        const stripes = mixed
          ? {
              backgroundImage: `repeating-linear-gradient(45deg, ${COLOR_CLASSES[owner!.color].hex} 0 5px, #0f172a 5px 10px)`,
            }
          : undefined

        const title = owner
          ? `${cell.label} — ${owner.label}${mixed ? ` ${owner.frequency}% of the time` : ''}`
          : `${cell.label} — fold`

        return (
          <div
            key={cell.label}
            title={title}
            style={stripes}
            className={`relative flex items-center justify-center rounded-[2px] ${fill} ${base} ${
              size === 'sm' ? 'aspect-square' : 'aspect-square text-[9px] font-medium sm:text-[10px]'
            } ${ringed ? 'z-10 ring-2 ring-white ring-offset-1 ring-offset-slate-900' : ''}`}
          >
            {size === 'md' && cell.label}
          </div>
        )
      })}
    </div>
  )
}

/** Colour key plus each layer's share of the deck. */
export function ChartLegend({ chart }: { chart: PreflopChart }) {
  const resolved = useMemo(() => resolveChart(chart), [chart])

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-400">
      {resolved.layers.map(({ layer, combos, pct }) => (
        <span key={layer.id} className="inline-flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-sm ${COLOR_CLASSES[layer.color].swatch}`} />
          <span className="text-slate-300">
            {layer.label}
            {layer.frequency !== undefined && (
              <span className="ml-1 text-slate-500">{layer.frequency}%</span>
            )}
          </span>
          <span className="tabular-nums text-slate-500">
            {pct.toFixed(1)}% · {combos} combos
          </span>
        </span>
      ))}
      <span className="tabular-nums text-slate-500">
        Total {resolved.pct.toFixed(1)}% · {resolved.combos} combos
      </span>
    </div>
  )
}
