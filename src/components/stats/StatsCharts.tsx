/**
 * The Stats page, drawn.
 *
 * Four pictures, each answering something a table cannot. A results table
 * tells you the ROI; it cannot tell you whether that ROI arrived steadily or
 * in one night, and those want different bankrolls. Every chart here is plain
 * SVG against the same axis arithmetic as the variance tool, so two charts on
 * one page never round differently and appear to disagree.
 */

import { niceBounds } from '../../lib/chartScale'
import { formatCompact } from '../../lib/formatNumber'
import { useT } from '../../lib/i18n'
import { READABLE_SAMPLE } from '../../lib/stats'
import type { CurvePoint, DayRhythm, ReturnBucket, RollingPoint } from '../../lib/statsSeries'

const W = 760
const GREEN = '#34d399'
const RED = '#f43f5e'
const INDIGO = '#6366f1'
const GRID = '#1e293b'
const ZERO = '#475569'
const LABEL = 'fill-slate-500'

export type CurveUnit = 'money' | 'buyIns'

/**
 * Cumulative profit, in money or in buy-ins.
 *
 * The shaded red is the drawdown: the distance between where the line is and
 * the highest it has ever been. A log is underwater far more of the time than
 * anybody remembers, and seeing how wide those stretches are is worth more
 * than the single worst-drawdown figure it reduces to.
 */
export function ProfitCurve({
  curve,
  unit,
  format,
}: {
  curve: CurvePoint[]
  unit: CurveUnit
  format: (value: number) => string
}) {
  const t = useT()
  if (curve.length < 2) return null

  const H = 282
  const PAD = { top: 16, right: 16, bottom: 38, left: 62 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const valueOf = (point: CurvePoint) => (unit === 'money' ? point.money : point.buyIns)
  const peakOf = (point: CurvePoint) => (unit === 'money' ? point.moneyPeak : point.buyInsPeak)

  const values = curve.map(valueOf)
  const bounds = niceBounds(Math.min(...values), Math.max(...values), 5)
  const last = curve.length - 1
  const up = values[last] >= 0

  const x = (index: number) => PAD.left + (index / last) * plotW
  const y = (value: number) =>
    PAD.top + plotH - ((value - bounds.min) / (bounds.max - bounds.min)) * plotH

  const line = curve
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${x(index)},${y(valueOf(point))}`)
    .join(' ')
  const area = `${line} L${x(last)},${y(0)} L${x(0)},${y(0)} Z`

  const underwater = curve.some((point) => valueOf(point) < peakOf(point))
  const drawdown = underwater
    ? `${curve.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(index)},${y(peakOf(point))}`).join(' ')} ${curve
        .map((point, index) => ({ point, index }))
        .reverse()
        .map(({ point, index }) => `L${x(index)},${y(valueOf(point))}`)
        .join(' ')} Z`
    : null

  const xTicks = Array.from({ length: 7 }, (_, i) => Math.round((i * last) / 6))

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label={t('Cumulative profit over every tournament played')}
    >
      {bounds.ticks.map((tick) => (
        <g key={tick}>
          <line
            x1={PAD.left}
            x2={PAD.left + plotW}
            y1={y(tick)}
            y2={y(tick)}
            stroke={tick === 0 ? ZERO : GRID}
            strokeWidth={tick === 0 ? 1.5 : 1}
          />
          <text x={PAD.left - 8} y={y(tick) + 4} textAnchor="end" className={LABEL} fontSize="11">
            {format(tick)}
          </text>
        </g>
      ))}

      {drawdown && <path d={drawdown} fill={RED} fillOpacity="0.1" />}
      <path d={area} fill={up ? GREEN : RED} fillOpacity="0.12" />
      <path d={line} fill="none" stroke={up ? GREEN : RED} strokeWidth="2" />

      {xTicks.map((tick) => (
        <text
          key={tick}
          x={x(tick)}
          y={H - 20}
          textAnchor="middle"
          className={LABEL}
          fontSize="11"
        >
          {formatCompact(tick)}
        </text>
      ))}
      <text x={PAD.left + plotW / 2} y={H - 4} textAnchor="middle" className="fill-slate-600" fontSize="11">
        {t('tournaments played')}
      </text>
    </svg>
  )
}

/**
 * ROI over a sliding window, so form is visible rather than inferred.
 *
 * The line crossing zero does not mean anything has changed about your game;
 * on this sample size it means a cash landed inside the window or fell out of
 * the back of it. What is worth reading is the level it keeps returning to.
 */
export function RollingRoiChart({ points, window }: { points: RollingPoint[]; window: number }) {
  const t = useT()
  if (points.length < 2) return null

  const H = 220
  const PAD = { top: 16, right: 16, bottom: 38, left: 62 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const values = points.map((point) => point.roiPct)
  const bounds = niceBounds(Math.min(...values), Math.max(...values), 4)
  const last = points.length - 1

  const x = (index: number) => PAD.left + (index / last) * plotW
  const y = (value: number) =>
    PAD.top + plotH - ((value - bounds.min) / (bounds.max - bounds.min)) * plotH

  const line = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${x(index)},${y(point.roiPct)}`)
    .join(' ')
  const area = `${line} L${x(last)},${y(0)} L${x(0)},${y(0)} Z`

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label={t('ROI over a rolling window of {n} tournaments', { n: window })}
    >
      <defs>
        <clipPath id="roi-above">
          <rect x={PAD.left} y={PAD.top} width={plotW} height={Math.max(0, y(0) - PAD.top)} />
        </clipPath>
        <clipPath id="roi-below">
          <rect
            x={PAD.left}
            y={y(0)}
            width={plotW}
            height={Math.max(0, PAD.top + plotH - y(0))}
          />
        </clipPath>
      </defs>

      {bounds.ticks.map((tick) => (
        <g key={tick}>
          <line
            x1={PAD.left}
            x2={PAD.left + plotW}
            y1={y(tick)}
            y2={y(tick)}
            stroke={tick === 0 ? ZERO : GRID}
            strokeWidth={tick === 0 ? 1.5 : 1}
          />
          <text x={PAD.left - 8} y={y(tick) + 4} textAnchor="end" className={LABEL} fontSize="11">
            {`${tick > 0 ? '+' : ''}${Math.round(tick)}%`}
          </text>
        </g>
      ))}

      <path d={area} fill={GREEN} fillOpacity="0.16" clipPath="url(#roi-above)" />
      <path d={area} fill={RED} fillOpacity="0.16" clipPath="url(#roi-below)" />
      <path d={line} fill="none" stroke="#e2e8f0" strokeWidth="1.75" />

      {[0, Math.round(last / 2), last].map((index) => (
        <text
          key={index}
          x={x(index)}
          y={H - 20}
          textAnchor={index === 0 ? 'start' : index === last ? 'end' : 'middle'}
          className={LABEL}
          fontSize="11"
        >
          {points[index].date}
        </text>
      ))}
      <text x={PAD.left + plotW / 2} y={H - 4} textAnchor="middle" className="fill-slate-600" fontSize="11">
        {t('each point is the {n} tournaments ending there', { n: window })}
      </text>
    </svg>
  )
}

/**
 * How often each kind of result happens, and what each kind is worth.
 *
 * Two panels on one axis rather than one clever chart, because the whole
 * point is the mismatch between them: the tall bar on the left is where
 * almost every tournament ends, and the money that pays for all of it comes
 * out of bands so thin you can barely see them up there.
 */
export function ReturnChart({ buckets }: { buckets: ReturnBucket[] }) {
  const t = useT()
  if (buckets.length === 0) return null

  const H = 330
  const PAD = { left: 62, right: 16 }
  const plotW = W - PAD.left - PAD.right
  const COUNT = { top: 18, height: 104 }
  const PROFIT = { top: 166, height: 104 }

  const slot = plotW / buckets.length
  const barW = Math.max(4, slot * 0.6)
  const centre = (index: number) => PAD.left + slot * (index + 0.5)

  const counts = niceBounds(0, Math.max(...buckets.map((bucket) => bucket.count)), 3)
  const countY = (value: number) =>
    COUNT.top + COUNT.height - (value / (counts.max || 1)) * COUNT.height

  const profits = niceBounds(
    Math.min(...buckets.map((bucket) => bucket.profit)),
    Math.max(...buckets.map((bucket) => bucket.profit)),
    3,
  )
  const profitY = (value: number) =>
    PROFIT.top +
    PROFIT.height -
    ((value - profits.min) / (profits.max - profits.min)) * PROFIT.height

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label={t('How often each kind of result happens, and what it is worth')}
    >
      <text x={PAD.left} y={10} className="fill-slate-400" fontSize="11">
        {t('tournaments')}
      </text>
      {counts.ticks.map((tick) => (
        <g key={`c${tick}`}>
          <line
            x1={PAD.left}
            x2={PAD.left + plotW}
            y1={countY(tick)}
            y2={countY(tick)}
            stroke={tick === 0 ? ZERO : GRID}
          />
          <text
            x={PAD.left - 8}
            y={countY(tick) + 4}
            textAnchor="end"
            className={LABEL}
            fontSize="11"
          >
            {formatCompact(tick)}
          </text>
        </g>
      ))}
      {buckets.map((bucket, index) => (
        <g key={`count-${bucket.label}`}>
          <title>{`${bucket.count} × ${bucket.label} (${bucket.sharePct.toFixed(1)}%)`}</title>
          <rect
            x={centre(index) - barW / 2}
            y={countY(bucket.count)}
            width={barW}
            height={Math.max(0, COUNT.top + COUNT.height - countY(bucket.count))}
            fill={INDIGO}
            fillOpacity="0.7"
          />
          {bucket.count > 0 && (
            <text
              x={centre(index)}
              y={countY(bucket.count) - 5}
              textAnchor="middle"
              className="fill-slate-400"
              fontSize="10"
            >
              {bucket.count}
            </text>
          )}
        </g>
      ))}

      <text x={PAD.left} y={PROFIT.top - 8} className="fill-slate-400" fontSize="11">
        {t('profit from them')}
      </text>
      {profits.ticks.map((tick) => (
        <g key={`p${tick}`}>
          <line
            x1={PAD.left}
            x2={PAD.left + plotW}
            y1={profitY(tick)}
            y2={profitY(tick)}
            stroke={tick === 0 ? ZERO : GRID}
            strokeWidth={tick === 0 ? 1.5 : 1}
          />
          <text
            x={PAD.left - 8}
            y={profitY(tick) + 4}
            textAnchor="end"
            className={LABEL}
            fontSize="11"
          >
            {formatCompact(tick)}
          </text>
        </g>
      ))}
      {buckets.map((bucket, index) => {
        const top = Math.min(profitY(bucket.profit), profitY(0))
        const height = Math.abs(profitY(bucket.profit) - profitY(0))
        return (
          <g key={`profit-${bucket.label}`}>
            <title>{`${bucket.label}: ${bucket.profit >= 0 ? '+' : '−'}${formatCompact(Math.abs(bucket.profit))}`}</title>
            <rect
              x={centre(index) - barW / 2}
              y={top}
              width={barW}
              height={Math.max(bucket.count > 0 ? 1 : 0, height)}
              fill={bucket.profit >= 0 ? GREEN : RED}
              fillOpacity="0.75"
            />
          </g>
        )
      })}

      {buckets.map((bucket, index) => (
        <text
          key={`label-${bucket.label}`}
          x={centre(index)}
          y={H - 16}
          textAnchor="middle"
          className={LABEL}
          fontSize="11"
        >
          {bucket.short}
        </text>
      ))}
      <text x={PAD.left + plotW / 2} y={H - 2} textAnchor="middle" className="fill-slate-600" fontSize="11">
        {t('what came back, as a multiple of what the seat cost')}
      </text>
    </svg>
  )
}

/**
 * Volume by day of the week, coloured by whether the day pays.
 *
 * Height is where the hours go and colour is what came of them, which is the
 * comparison worth having: a Sunday that is a quarter of your volume and red
 * is a much more expensive habit than a red Tuesday you barely play.
 */
export function WeekdayChart({ days }: { days: DayRhythm[] }) {
  const t = useT()
  const busiest = Math.max(...days.map((day) => day.count))
  if (busiest === 0) return null

  const H = 240
  const PAD = { left: 48, right: 16, top: 20 }
  const plotW = W - PAD.left - PAD.right
  const plotH = 140

  const counts = niceBounds(0, busiest, 3)
  const slot = plotW / days.length
  const barW = Math.max(6, slot * 0.52)
  const centre = (index: number) => PAD.left + slot * (index + 0.5)
  const y = (value: number) => PAD.top + plotH - (value / (counts.max || 1)) * plotH

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label={t('Volume and result by day of the week')}
    >
      {counts.ticks.map((tick) => (
        <g key={tick}>
          <line
            x1={PAD.left}
            x2={PAD.left + plotW}
            y1={y(tick)}
            y2={y(tick)}
            stroke={tick === 0 ? ZERO : GRID}
          />
          <text x={PAD.left - 8} y={y(tick) + 4} textAnchor="end" className={LABEL} fontSize="11">
            {formatCompact(tick)}
          </text>
        </g>
      ))}

      {days.map((day, index) => (
        <g key={day.label}>
          <title>{`${day.label}: ${day.count} played, ROI ${day.roiPct >= 0 ? '+' : ''}${day.roiPct.toFixed(1)}%`}</title>
          <rect
            x={centre(index) - barW / 2}
            y={y(day.count)}
            width={barW}
            height={Math.max(0, PAD.top + plotH - y(day.count))}
            fill={day.count === 0 ? GRID : day.profit >= 0 ? GREEN : RED}
            fillOpacity="0.7"
          />
          <text
            x={centre(index)}
            y={PAD.top + plotH + 18}
            textAnchor="middle"
            className="fill-slate-300"
            fontSize="12"
          >
            {t(day.short)}
          </text>
          <text
            x={centre(index)}
            y={PAD.top + plotH + 36}
            textAnchor="middle"
            className={LABEL}
            fontSize="11"
          >
            {day.count}
          </text>
          {day.count > 0 && (
            <text
              x={centre(index)}
              y={PAD.top + plotH + 54}
              textAnchor="middle"
              fill={
                day.count >= READABLE_SAMPLE ? (day.roiPct >= 0 ? GREEN : RED) : '#475569'
              }
              fontSize="11"
            >
              {`${day.roiPct >= 0 ? '+' : ''}${day.roiPct.toFixed(0)}%`}
            </text>
          )}
        </g>
      ))}

      <text x={PAD.left + plotW / 2} y={H - 4} textAnchor="middle" className="fill-slate-600" fontSize="11">
        {t('played · ROI — dimmed under {n} tournaments', { n: READABLE_SAMPLE })}
      </text>
    </svg>
  )
}
