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
 * one, because points arrive on the night a tournament finished and
 * pretending they accrued gently in between would be drawing something that
 * never happened.
 */

import { useState } from 'react'
import { niceBounds } from '../../lib/chartScale'
import { formatCompact } from '../../lib/formatNumber'
import { useT } from '../../lib/i18n'
import { playerColour } from '../../lib/playerColours'
import { everLed, runners, type RaceStep } from '../../lib/racePath'

const W = 760
const H = 300
const PAD = { top: 16, right: 16, bottom: 44, left: 62 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

const day = (date: string) => Math.floor(Date.parse(`${date}T12:00:00Z`) / 86_400_000)

/** Day before month, which is how a date is written here. */
const dayMonth = (date: string) => `${date.slice(8)}-${date.slice(5, 7)}`
const points = (value: number) => Math.round(value).toLocaleString('en-US')

export function RaceChart({ steps, roster }: { steps: RaceStep[]; roster: readonly string[] }) {
  const t = useT()
  const [hovered, setHovered] = useState<string | null>(null)
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
    let previous = 0
    steps.forEach((step, index) => {
      const value = step.points.get(player) ?? 0
      if (index === 0) parts.push(`M${x(step.date)},${y(value)}`)
      else {
        parts.push(`L${x(step.date)},${y(previous)}`)
        parts.push(`L${x(step.date)},${y(value)}`)
      }
      previous = value
    })
    return parts.join(' ')
  }

  const leaders = everLed(steps)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((at) => steps[Math.round(at * (steps.length - 1))])
  const labelled = [...new Set(ticks.map((step) => step.date))]
  const finalOf = (player: string) => steps[steps.length - 1].points.get(player) ?? 0

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={t('Points over time, one line per player')}
        onMouseLeave={() => setHovered(null)}
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

        {field.map((player) => {
          const dimmed = hovered !== null && hovered !== player
          return (
            <g key={player} opacity={dimmed ? 0.25 : 1}>
              <path
                d={line(player)}
                fill="none"
                stroke={playerColour(player, roster)}
                strokeWidth={hovered === player ? 3.25 : 2}
                strokeLinejoin="round"
              />
              <circle
                cx={x(steps[steps.length - 1].date)}
                cy={y(finalOf(player))}
                r={hovered === player ? 4.5 : 3}
                fill={playerColour(player, roster)}
              />
            </g>
          )
        })}

        {/*
          A fat transparent copy of each line, purely to be hovered. A 2px
          stroke is a hard thing to put a mouse on, and widening the visible
          line to catch the pointer would be solving the wrong problem.
        */}
        {field.map((player) => (
          <path
            key={`hit-${player}`}
            d={line(player)}
            fill="none"
            stroke="transparent"
            strokeWidth="14"
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHovered(player)}
          >
            <title>{`${player} — ${points(finalOf(player))}`}</title>
          </path>
        ))}

        {labelled.map((date) => (
          <text
            key={date}
            x={x(date)}
            y={H - 24}
            textAnchor="middle"
            className="fill-slate-500"
            fontSize="11"
          >
            {dayMonth(date)}
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
          <button
            key={player}
            type="button"
            onMouseEnter={() => setHovered(player)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(player)}
            onBlur={() => setHovered(null)}
            className={`inline-flex items-center gap-1.5 rounded px-1 py-0.5 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              hovered !== null && hovered !== player ? 'opacity-50' : ''
            }`}
          >
            <span
              aria-hidden
              className="h-0.5 w-4 rounded"
              style={{ background: playerColour(player, roster) }}
            />
            <span className="text-slate-300">{player}</span>
            <span className="tabular-nums text-slate-500">{points(finalOf(player))}</span>
          </button>
        ))}
      </div>

      <p className="mt-2 min-h-[1.25rem] text-[11px] leading-relaxed text-slate-500">
        {hovered
          ? t('{player} — {n} points at the end of this period.', {
              player: hovered,
              n: points(finalOf(hovered)),
            })
          : leaders.length > 1
            ? t('{n} players have led this period: {names}.', {
                n: leaders.length,
                names: leaders.join(t(', then ')),
              })
            : t('Hover a line to pick a player out of it.')}
      </p>
    </div>
  )
}
