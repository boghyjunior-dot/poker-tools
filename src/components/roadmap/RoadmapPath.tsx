import { useId, useMemo, useSyncExternalStore } from 'react'
import { useT } from '../../lib/i18n'
import { STAGES } from '../../lib/roadmap'

/**
 * The road itself: a winding path with a milestone per stage.
 *
 * The geometry is generated rather than hand-drawn so the curve always passes
 * exactly through the nodes — a hand-tuned `d` string drifts the moment a stage
 * is added or the viewBox changes.
 */

// Wider than it is tall per step, so the whole road fits on a phone screen
// without 800px of scrolling before the first stage detail.
const WIDTH = 400
const TOP = 50
const GAP = 115
const HEIGHT = TOP + GAP * (STAGES.length - 1) + TOP

/** Nodes alternate left and right of the centre line, which gives the bends. */
function nodeAt(index: number): { x: number; y: number } {
  const swing = index % 2 === 0 ? -1 : 1
  // The first and last sit closer to the middle so the road starts and ends calmly.
  const edge = index === 0 || index === STAGES.length - 1 ? 0.35 : 1
  return { x: WIDTH / 2 + swing * 86 * edge, y: TOP + GAP * index }
}

const NODES = STAGES.map((_, index) => nodeAt(index))

/** A smooth path through the nodes, using vertical control points. */
const ROAD = NODES.reduce((d, point, index) => {
  if (index === 0) return `M ${point.x} ${point.y}`
  const previous = NODES[index - 1]
  const midY = (previous.y + point.y) / 2
  return `${d} C ${previous.x} ${midY}, ${point.x} ${midY}, ${point.x} ${point.y}`
}, '')

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

function subscribeToMotion(onChange: () => void): () => void {
  if (typeof matchMedia !== 'function') return () => {}
  const query = matchMedia(REDUCED_MOTION)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function readMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia(REDUCED_MOTION).matches
}

/** Subscribed rather than measured in an effect, so the first paint is right. */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeToMotion, readMotion, () => false)
}

export function RoadmapPath({
  activeId,
  reachedIndex,
  onSelect,
}: {
  activeId: string
  /** Index of the stage the reader says they are on; -1 when unset. */
  reachedIndex: number
  onSelect: (id: string) => void
}) {
  const t = useT()
  const gradientId = useId()
  const glowId = useId()
  const reduced = usePrefersReducedMotion()
  // How much of the road is behind you, as a fraction of its length.
  const travelled = useMemo(() => {
    if (reachedIndex < 0) return 0
    return Math.min(1, reachedIndex / (STAGES.length - 1))
  }, [reachedIndex])

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="mx-auto h-auto w-full max-w-[400px]"
      role="img"
      aria-label={t('Six stages of understanding, from the rules to deliberate deviation')}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          {STAGES.map((stage, index) => (
            <stop
              key={stage.id}
              offset={`${(index / (STAGES.length - 1)) * 100}%`}
              stopColor={stage.color}
            />
          ))}
        </linearGradient>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* The unwalked road, drawn faintly the whole way down. */}
      <path
        d={ROAD}
        fill="none"
        stroke="#1e293b"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d={ROAD}
        fill="none"
        stroke="#334155"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="1 14"
        className={reduced ? undefined : 'roadmap-dashes'}
      />

      {/* The coloured road, revealed as far as you have travelled. */}
      <path
        d={ROAD}
        pathLength={1}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="10"
        strokeLinecap="round"
        filter={`url(#${glowId})`}
        style={{
          strokeDasharray: 1,
          strokeDashoffset: 1 - travelled,
          transition: reduced ? undefined : 'stroke-dashoffset 900ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />

      {STAGES.map((stage, index) => {
        const { x, y } = NODES[index]
        const reached = reachedIndex >= index
        const active = stage.id === activeId
        const label = `${stage.step}. ${t(stage.name)}`

        return (
          <g
            key={stage.id}
            role="button"
            tabIndex={0}
            aria-label={label}
            aria-pressed={active}
            onClick={() => onSelect(stage.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelect(stage.id)
              }
            }}
            className="cursor-pointer focus:outline-none"
            style={
              reduced
                ? undefined
                : { animation: `roadmap-pop 520ms ${180 + index * 120}ms both` }
            }
          >
            {/* A soft halo behind the stage you are standing on. */}
            {reached && index === reachedIndex && !reduced && (
              <circle cx={x} cy={y} r="20" fill={stage.color} opacity="0.25" className="roadmap-ping" />
            )}

            <circle
              cx={x}
              cy={y}
              r={active ? 20 : 16}
              fill="#0f172a"
              stroke={reached ? stage.color : '#334155'}
              strokeWidth={active ? 3.5 : 2.5}
              style={{ transition: 'r 200ms ease, stroke-width 200ms ease' }}
            />
            <text
              x={x}
              y={y + 5}
              textAnchor="middle"
              fontSize="14"
              fontWeight="700"
              fill={reached ? stage.color : '#64748b'}
            >
              {stage.step}
            </text>

            {/* Stage name, pushed to whichever side has room. */}
            <text
              x={x + (x < WIDTH / 2 ? 28 : -28)}
              y={y - 2}
              textAnchor={x < WIDTH / 2 ? 'start' : 'end'}
              fontSize="12.5"
              fontWeight={active ? 700 : 500}
              fill={active ? '#f1f5f9' : '#94a3b8'}
            >
              {t(stage.name)}
            </text>
            <text
              x={x + (x < WIDTH / 2 ? 28 : -28)}
              y={y + 13}
              textAnchor={x < WIDTH / 2 ? 'start' : 'end'}
              fontSize="10.5"
              fill="#64748b"
            >
              {t(stage.concept)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
