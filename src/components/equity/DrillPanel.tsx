import { useMemo, useState } from 'react'
import { PlayingCard } from '../PlayingCard'
import { formatMoney } from '../../lib/formatNumber'
import { useT } from '../../lib/i18n'
import { countRangeCombosFromStates } from '../../lib/equityRange'
import {
  DRILL_SPOTS,
  parseCardToken,
  priceOf,
  requiredEquityFor,
  solveDrill,
  villainRangeOf,
  type DrillSolution,
  type DrillSpot,
} from '../../lib/equityDrill'

/** A figure with its label, the way the rest of the page states one. */
function Stat({ label, value, tone = 'text-white' }: { label: string; value: string; tone?: string }) {
  const t = useT()
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{t(label)}</p>
      <p className={`text-lg font-bold tabular-nums ${tone}`}>{value}</p>
    </div>
  )
}

/**
 * Guess first, then be told.
 *
 * The spot is laid out in full — hand, range, pot, price — and the only
 * thing withheld is the equity, because that is the thing being practised.
 * It is not computed until you have answered, so there is nothing on screen
 * to read the answer off before committing to one.
 */
export function DrillPanel() {
  const t = useT()
  const [index, setIndex] = useState(0)
  const [answered, setAnswered] = useState<{ said: boolean; solution: DrillSolution } | null>(null)
  const [score, setScore] = useState({ right: 0, wrong: 0 })

  const spot: DrillSpot | undefined = DRILL_SPOTS[index]
  const villain = useMemo(() => (spot ? villainRangeOf(spot) : null), [spot])

  if (!spot || !villain) {
    return (
      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        <p className="text-sm text-slate-400">{t('Nothing to drill.')}</p>
      </section>
    )
  }

  const needed = requiredEquityFor(spot)
  const cards = spot.hand.map(parseCardToken)
  const done = index >= DRILL_SPOTS.length - 1 && answered !== null

  const answer = (said: boolean) => {
    if (answered) return
    const solution = solveDrill(spot)
    setAnswered({ said, solution })
    setScore((prev) =>
      said === solution.enough
        ? { ...prev, right: prev.right + 1 }
        : { ...prev, wrong: prev.wrong + 1 },
    )
  }

  const next = () => {
    setAnswered(null)
    setIndex((i) => i + 1)
  }

  const restart = () => {
    setAnswered(null)
    setIndex(0)
    setScore({ right: 0, wrong: 0 })
  }

  const correct = answered !== null && answered.said === answered.solution.enough

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-white">
            {t('Spot {n} of {total}', { n: index + 1, total: DRILL_SPOTS.length })}
          </h2>
          <p className="text-xs text-slate-500">
            {t('{right} right · {wrong} wrong', { right: score.right, wrong: score.wrong })}
          </p>
        </div>

        <p className="text-sm text-slate-400">{t(spot.blurb)}</p>

        <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-3">
          <div>
            <span className="mb-1 block text-[10px] uppercase tracking-wider text-slate-500">
              {t('Your hand')}
            </span>
            <div className="flex gap-1">
              {cards.map((card, i) => (
                <PlayingCard key={i} card={card} size="md" variant="board" />
              ))}
            </div>
          </div>
          <div>
            <span className="mb-1 block text-[10px] uppercase tracking-wider text-slate-500">
              {t('Against')}
            </span>
            <p className="text-sm font-semibold text-slate-200">{villain.label}</p>
            <p className="text-[11px] text-slate-500">
              {t('{n} combos', { n: countRangeCombosFromStates(villain.cellStates) })}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Pot" value={formatMoney(spot.pot)} />
          <Stat label="To call" value={formatMoney(spot.call)} tone="text-amber-300" />
          <Stat label="Price" value={priceOf(spot)} tone="text-slate-300" />
          <Stat label="You need" value={`${needed.toFixed(1)}%`} tone="text-slate-300" />
        </div>

        {answered === null ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => answer(true)}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
            >
              {t('Enough equity')}
            </button>
            <button
              type="button"
              onClick={() => answer(false)}
              className="rounded-lg bg-rose-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
            >
              {t('Not enough')}
            </button>
          </div>
        ) : (
          <div
            className={`mt-4 rounded-md border px-3 py-3 ${
              correct ? 'border-emerald-800 bg-emerald-950/40' : 'border-rose-900 bg-rose-950/30'
            }`}
          >
            <p
              className={`text-sm font-bold ${correct ? 'text-emerald-300' : 'text-rose-300'}`}
            >
              {correct ? t('Right') : t('Wrong')}
            </p>
            <p className="mt-1 text-sm text-slate-200">
              {t('You have {equity}% against that range, and the price asks for {needed}%.', {
                equity: answered.solution.equity.toFixed(1),
                needed: needed.toFixed(1),
              })}{' '}
              <span className={answered.solution.enough ? 'text-emerald-300' : 'text-rose-300'}>
                {answered.solution.enough ? t('Call.') : t('Fold.')}
              </span>
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              {t('±{margin} over {n} hands.', {
                margin: answered.solution.margin.toFixed(2),
                n: answered.solution.iterations.toLocaleString(),
              })}
            </p>

            <div className="mt-3 flex gap-2">
              {done ? (
                <button
                  type="button"
                  onClick={restart}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
                >
                  {t('Start again')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={next}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
                >
                  {t('Next spot')}
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      <p className="text-[11px] leading-relaxed text-slate-500">
        {t(
          'Every answer is worked out by the same simulation the calculator runs, not read off a table, so a spot here can never disagree with the spot you build yourself.',
        )}
      </p>
    </div>
  )
}
