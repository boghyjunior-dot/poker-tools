/**
 * The race, drawn.
 *
 * One line per player, points up the side and the calendar across the
 * bottom. The table says who is ahead; this says who has been, when the lead
 * changed hands and whether the gap is closing — none of which a single
 * column of totals can show.
 *
 * Spaced by the calendar rather than by result, so a fortnight nobody played
 * looks like a fortnight nobody played. A step chart rather than a smooth
 * one, because points arrive on the night a tournament finished and pretending
 * they accrued gently in between would be drawing something that never
 * happened.
 */

import { niceBounds } from '../../lib/chartScale'
import { formatCompact } from '../../lib/formatNumber'
import { useT } from '../../lib/i18n'
import { avatarTone } from '../../lib/playerProfiles'
import { everLed, runners, type RaceStep } from '../../lib/racePath'

const W = 760
const H = 300
const PAD = { top: 16, right: 16, bottom: 44, left: 62 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

const day = (date: string) => Math.floor(Date.parse(`${date}T12:00:00Z`) / 86_400_000)

/** A player's line takes the colour their avatar already uses. */
const colourOf = (player: string) => avatarTone(player).text

export function RaceChart({ steps }: { steps: RaceStep[] }) {
  const t = useT()
  const field = runners(steps)
  if (steps.length === 0 || field.length === 0) return null

  const days = steps.map((step) => day(step.date))
  const first = days[0]
  const last = days[days.length - 1]
  const span = Math.max(1, last - first)

  let top = 0
  for (const step of steps) for (const value of step.points.values()) top = Math.max(top, value)
  const bounds = niceBounds(0, top, 4)

  const x = (date: string) => PAD.left + ((day(date) - first) / span) * PLOT_W
  const y = (value: number) =>
    PAD.top + PLOT_H - ((value - bounds.min) / (bounds.max - bounds.min)) * PLOT_H

  /** Held flat until the night it moved, which is when it actually moved. */
  const line = (player: string) => {
    const parts: string[] = []
    let previous: number | null = null
    steps.forEach((step, index) => {
      const value = step.points.get(player) ?? 0
      if (index === 0) parts.push(`M${x(step.date)},${y(value)}`)
      else {
        parts.push(`L${x(step.date)},${y(previous ?? 0)}`)
        parts.push(`L${x(step.date)},${y(value)}`)
      }
      previous = value
    })
    return parts.join(' ')
  }

  const leaders = everLed(steps)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((at) => steps[Math.round(at * (steps.length - 1))])
  const labelled = [...new Set(ticks.map((step) => step.date))]

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={t('Points over time, one line per player')}
      >
        {bounds.ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={PAD.left + PLOT_W}
              y1={y(tick)}
              y2={y(tick)}
              stroke={tick === 0 ? '#475569' : '#1e293b'}
            />
            <text
              x={PAD.left - 8}
              y={y(tick) + 4}
              textAnchor="end"
              className="fill-slate-500"
              fontSize="11"
            >
              {formatCompact(tick)}
            </text>
          </g>
        ))}

        {field.map((player) => (
          <path
            key={player}
            d={line(player)}
            fill="none"
            stroke={colourOf(player)}
            strokeWidth="2"
            strokeLinejoin="round"
          >
            <title>{player}</title>
          </path>
        ))}

        {/* A dot on the last point, so a player with one result is visible. */}
        {field.map((player) => {
          const value = steps[steps.length - 1].points.get(player) ?? 0
          return (
            <circle
              key={player}
              cx={x(steps[steps.length - 1].date)}
              cy={y(value)}
              r="3"
              fill={colourOf(player)}
            />
          )
        })}

        {labelled.map((date) => (
          <text
            key={date}
            x={x(date)}
            y={H - 24}
            textAnchor="middle"
            className="fill-slate-500"
            fontSize="11"
          >
            {date.slice(5)}
          </text>
        ))}
        <text
          x={PAD.left + PLOT_W / 2}
          y={H - 6}
          textAnchor="middle"
          className="fill-slate-600"
          fontSize="11"
        >
          {t('points as the table stood that evening')}
        </text>
      </svg>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
        {[...field].reverse().map((player) => (
          <span key={player} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-0.5 w-4 rounded"
              style={{ background: colourOf(player) }}
            />
            <span className="text-slate-300">{player}</span>
          </span>
        ))}
      </div>

      {leaders.length > 1 && (
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
          {t('{n} players have led this period: {names}.', {
            n: leaders.length,
            names: leaders.join(', then '),
          })}
        </p>
      )}
    </div>
  )
}
