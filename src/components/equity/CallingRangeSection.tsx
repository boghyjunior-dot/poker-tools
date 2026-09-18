import { useMemo } from 'react'
import { cellKey, RANKS, type RankIndex } from '../../types/poker'
import { useT } from '../../lib/i18n'
import {
  applyThreshold,
  type CallingCell,
  type HandEquityGrid,
} from '../../lib/callingRange'

/** Call, fold, or fold-without-the-bounty — the three states a cell can be in. */type CellShade = 'call' | 'bounty' | 'fold'

const SHADE_CLASS: Record<CellShade, string> = {
  call: 'bg-emerald-800/80 text-emerald-50',
  bounty: 'bg-amber-700/80 text-amber-50',
  fold: 'bg-slate-900 text-slate-600',
}

/**
 * The range that is a +EV call, read off one simulation.
 *
 * Hero's equity against the range does not depend on the price, so the grid is
 * simulated once and both thresholds are applied to it. That is what makes the
 * bounty's contribution showable as a colour rather than as a second number:
 * the amber hands are the ones the bounty pays for.
 */
export function CallingRangeSection({
  grid,
  thresholdPct,
  noBountyThresholdPct,
}: {
  grid: HandEquityGrid
  thresholdPct: number
  noBountyThresholdPct?: number
}) {
  const t = useT()
  const withBounty = useMemo(() => applyThreshold(grid, thresholdPct), [grid, thresholdPct])
  const withoutBounty = useMemo(
    () =>
      noBountyThresholdPct !== undefined && noBountyThresholdPct > thresholdPct
        ? applyThreshold(grid, noBountyThresholdPct)
        : null,
    [grid, noBountyThresholdPct, thresholdPct],
  )

  const bareCall = new Set(
    withoutBounty?.cells.filter((cell) => cell.verdict === 'call').map((cell) => cell.key) ?? [],
  )
  const shadeOf = (cell: CallingCell): CellShade => {
    if (cell.verdict !== 'call') return 'fold'
    if (withoutBounty === null || bareCall.has(cell.key)) return 'call'
    return 'bounty'
  }

  const bountyCombos = withoutBounty ? withBounty.callCombos - withoutBounty.callCombos : 0
  const byKey = new Map(withBounty.cells.map((cell) => [cell.key, cell]))

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">{t('Hands you can call with')}</h3>
        <p className="text-xs text-slate-500">
          {t('Every hand worth at least {pct}% against this range', {
            pct: thresholdPct.toFixed(1),
          })}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">{t('Calling range')}</p>
          <p className="text-2xl font-bold tabular-nums text-white">
            {withBounty.callRangePct.toFixed(1)}%
          </p>
          <p className="text-[11px] text-slate-500">
            {t('{n} of 1,326 combos', { n: withBounty.callCombos })}
          </p>
        </div>
        {withoutBounty && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              {t('The bounty adds')}
            </p>
            <p className="text-2xl font-bold tabular-nums text-amber-400">
              {bountyCombos > 0 ? '+' : ''}
              {(withBounty.callRangePct - withoutBounty.callRangePct).toFixed(1)}%
            </p>
            <p className="text-[11px] text-slate-500">
              {t('{n} more combos, from {from}% to {to}%', {
                n: bountyCombos,
                from: noBountyThresholdPct!.toFixed(1),
                to: thresholdPct.toFixed(1),
              })}
            </p>
          </div>
        )}
      </div>

      <div className="mt-3 overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-px">
            {RANKS.map((_, row) =>
              RANKS.map((__, col) => {
                const cell = byKey.get(cellKey(row as RankIndex, col as RankIndex))
                if (!cell) return null
                const shade = shadeOf(cell)
                return (
                  <div
                    key={cell.key}
                    title={`${cell.label} — ${cell.equityPct.toFixed(1)}% equity (±${cell.marginPct.toFixed(1)})`}
                    className={`flex aspect-square items-center justify-center rounded-[2px] text-[9px] font-semibold leading-none sm:text-[10px] ${SHADE_CLASS[shade]} ${
                      cell.marginal && shade !== 'fold' ? 'ring-1 ring-inset ring-white/50' : ''
                    }`}
                  >
                    {cell.label}
                  </div>
                )
              }),
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[2px] bg-emerald-800/80" />
          {t('Call on pot odds alone')}
        </span>
        {withoutBounty && (
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-amber-700/80" />
            {t('Call only because of the bounty')}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[2px] bg-slate-900 ring-1 ring-inset ring-white/50" />
          {t('Too close to separate at this sample')}
        </span>
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
        {t(
          'Equity per hand from {n} simulated hands, so the edge of the range is fuzzy: {marginal} combos sit close enough to break-even that this sample cannot call it either way. Assumes the pot is settled all-in on this street.',
          { n: grid.iterations.toLocaleString(), marginal: withBounty.marginalCombos },
        )}
      </p>
    </div>
  )
}
