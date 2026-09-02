import { formatCompact } from '../../lib/formatNumber'
import type { HistogramBin, VarianceBand, VarianceResult } from '../../lib/mttVariance'

const CHART_W = 760
const CHART_H = 340
const PAD = { top: 16, right: 16, bottom: 48, left: 62 }

const PLOT_W = CHART_W - PAD.left - PAD.right
const PLOT_H = CHART_H - PAD.top - PAD.bottom

/** Round a span up to a readable 1 / 2 / 5 x 10^n step. */
function niceStep(span: number, targetTicks: number): number {
  if (span <= 0) return 1
  const raw = span / targetTicks
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)))
  const scaled = raw / magnitude
  const step = scaled >= 5 ? 10 : scaled >= 2 ? 5 : scaled >= 1 ? 2 : 1
  return step * magnitude
}

/**
 * Fan chart: percentile bands across every sample, the median, the theoretical
 * EV line, and a handful of individual runs drawn on top.
 */
export function FanChart({ result }: { result: VarianceResult }) {
  const { checkpoints, band, samplePaths } = result

  let min = 0
  let max = 0
  const consider = (value: number) => {
    if (value < min) min = value
    if (value > max) max = value
  }
  for (const key of ['p5', 'p95', 'ev'] as (keyof VarianceBand)[]) {
    for (const value of band[key]) consider(value)
  }
  for (const path of samplePaths) for (const value of path) consider(value)

  const step = niceStep(max - min || 1, 6)
  const yMin = Math.floor(min / step) * step
  const yMax = Math.ceil(max / step) * step
  const xMax = checkpoints[checkpoints.length - 1]

  const x = (tournament: number) => PAD.left + (tournament / xMax) * PLOT_W
  const y = (profit: number) => PAD.top + PLOT_H - ((profit - yMin) / (yMax - yMin || 1)) * PLOT_H

  const line = (values: number[]) =>
    values.map((value, i) => `${i === 0 ? 'M' : 'L'}${x(checkpoints[i])},${y(value)}`).join(' ')

  const area = (upper: number[], lower: number[]) => {
    const up = upper.map((value, i) => `${i === 0 ? 'M' : 'L'}${x(checkpoints[i])},${y(value)}`).join(' ')
    const down = [...lower]
      .map((value, i) => ({ value, i }))
      .reverse()
      .map(({ value, i }) => `L${x(checkpoints[i])},${y(value)}`)
      .join(' ')
    return `${up} ${down} Z`
  }

  const yTicks: number[] = []
  for (let value = yMin; value <= yMax + step / 2; value += step) yTicks.push(value)

  const xTickCount = 6
  const xTicks = Array.from({ length: xTickCount + 1 }, (_, i) => Math.round((i * xMax) / xTickCount))

  return (
    <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full" role="img" aria-label="Simulated bankroll paths">
      {yTicks.map((tick) => (
        <g key={tick}>
          <line
            x1={PAD.left}
            x2={PAD.left + PLOT_W}
            y1={y(tick)}
            y2={y(tick)}
            stroke={tick === 0 ? '#475569' : '#1e293b'}
            strokeWidth={tick === 0 ? 1.5 : 1}
          />
          <text x={PAD.left - 8} y={y(tick) + 4} textAnchor="end" className="fill-slate-500" fontSize="11">
            {formatCompact(tick)}
          </text>
        </g>
      ))}

      {xTicks.map((tick) => (
        <text
          key={tick}
          x={x(tick)}
          y={CHART_H - 30}
          textAnchor="middle"
          className="fill-slate-500"
          fontSize="11"
        >
          {formatCompact(tick)}
        </text>
      ))}

      <path d={area(band.p95, band.p5)} fill="#6366f1" fillOpacity="0.13" />
      <path d={area(band.p75, band.p25)} fill="#6366f1" fillOpacity="0.22" />

      {samplePaths.map((path, index) => (
        <path
          key={index}
          d={line(path)}
          fill="none"
          stroke="#94a3b8"
          strokeOpacity="0.4"
          strokeWidth="1"
        />
      ))}

      <path d={line(band.p50)} fill="none" stroke="#e2e8f0" strokeWidth="2" />
      <path d={line(band.ev)} fill="none" stroke="#f59e0b" strokeWidth="1.75" strokeDasharray="5 4" />

      <text x={PAD.left + PLOT_W / 2} y={CHART_H - 8} textAnchor="middle" className="fill-slate-600" fontSize="11">
        tournaments played
      </text>
    </svg>
  )
}

/** Distribution of final results across every simulated run. */
export function ResultHistogram({ bins, breakEvenLabel }: { bins: HistogramBin[]; breakEvenLabel?: string }) {
  if (bins.length === 0) return null

  const maxCount = Math.max(...bins.map((bin) => bin.count))
  const xMin = bins[0].start
  const xMax = bins[bins.length - 1].end
  const span = xMax - xMin || 1

  const x = (value: number) => PAD.left + ((value - xMin) / span) * PLOT_W
  const barW = PLOT_W / bins.length

  const step = niceStep(span, 6)
  const ticks: number[] = []
  for (let value = Math.ceil(xMin / step) * step; value <= xMax; value += step) ticks.push(value)

  return (
    <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full" role="img" aria-label="Distribution of final results">
      <line
        x1={PAD.left}
        x2={PAD.left + PLOT_W}
        y1={PAD.top + PLOT_H}
        y2={PAD.top + PLOT_H}
        stroke="#334155"
      />

      {bins.map((bin, index) => {
        const height = (bin.count / maxCount) * PLOT_H
        const losing = bin.end <= 0
        return (
          <rect
            key={index}
            x={x(bin.start) + 0.5}
            y={PAD.top + PLOT_H - height}
            width={Math.max(0.5, barW - 1)}
            height={height}
            fill={losing ? '#f43f5e' : '#34d399'}
            fillOpacity="0.65"
          />
        )
      })}

      {xMin < 0 && xMax > 0 && (
        <>
          <line
            x1={x(0)}
            x2={x(0)}
            y1={PAD.top}
            y2={PAD.top + PLOT_H}
            stroke="#e2e8f0"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <text x={x(0)} y={PAD.top - 4} textAnchor="middle" className="fill-slate-400" fontSize="11">
            {breakEvenLabel ?? 'break even'}
          </text>
        </>
      )}

      {ticks.map((tick) => (
        <text
          key={tick}
          x={x(tick)}
          y={CHART_H - 30}
          textAnchor="middle"
          className="fill-slate-500"
          fontSize="11"
        >
          {formatCompact(tick)}
        </text>
      ))}

      <text x={PAD.left + PLOT_W / 2} y={CHART_H - 8} textAnchor="middle" className="fill-slate-600" fontSize="11">
        final profit
      </text>
    </svg>
  )
}

