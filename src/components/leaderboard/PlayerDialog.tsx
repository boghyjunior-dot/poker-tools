/**
 * One player, in front of everything else.
 *
 * The standings answer "who is winning" and this answers "who is that" —
 * the face, the line they wrote, every figure the two competitions produce
 * about them, and the scores the total is actually made of. It is a window
 * rather than a panel further down the page because it is a detour: you are
 * reading the table, you want to know about one row, and you want to be back
 * in the table afterwards without having lost your place in it.
 *
 * Built on the native <dialog>, which brings the things a hand-rolled
 * overlay always forgets: focus moves in and is trapped, Escape closes,
 * the page behind goes inert, and focus returns to whatever opened it.
 */

import { useEffect, useRef } from 'react'
import { formatMoney } from '../../lib/formatNumber'
import { useT } from '../../lib/i18n'
import {
  type ChallengeResult,
  type Format,
  type LastLongerStanding,
  type Standing,
} from '../../lib/leaderboard'
import { profileFor, type PlayerCard } from '../../lib/playerProfiles'
import { Avatar } from './Avatar'

const points = (value: number) => Math.round(value).toLocaleString('en-US')

function Figure({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  const t = useT()
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{t(label)}</p>
      <p className={`text-lg font-bold tabular-nums ${muted ? 'text-slate-500' : 'text-white'}`}>
        {value}
      </p>
    </div>
  )
}

export function PlayerDialog({
  player,
  standing,
  lastLonger,
  counted,
  payout,
  prize,
  cards,
  format,
  onClose,
}: {
  /** Whose window this is, or null for none open. */
  player: string | null
  standing: Standing | undefined
  lastLonger: LastLongerStanding | undefined
  counted: { result: ChallengeResult; score: number }[]
  /** What they are owed out of the pot, if they are in the money. */
  payout: number | undefined
  /** Prize money won over the period, across every result. */
  prize: number | undefined
  cards: readonly PlayerCard[]
  format: Format
  onClose: () => void
}) {
  const t = useT()
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (player && !dialog.open) dialog.showModal()
    if (!player && dialog.open) dialog.close()
  }, [player])

  const card = player ? profileFor(player, cards) : null

  return (
    <dialog
      ref={ref}
      // Escape and the close button both end up here, so the page's idea of
      // what is open can never drift from the dialog's.
      onClose={onClose}
      onClick={(event) => {
        // The backdrop is the dialog element itself; anything inside is a
        // child, so this closes on a click outside the card and nowhere else.
        if (event.target === ref.current) onClose()
      }}
      aria-label={player ?? undefined}
      className="fixed inset-0 m-auto h-fit max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[46rem] rounded-xl border border-slate-700 bg-slate-900 p-0 text-slate-300 shadow-2xl backdrop:bg-slate-950/80 open:backdrop:backdrop-blur-sm"
    >
      {player && card && (
        <div className="max-h-[85vh] overflow-y-auto p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <Avatar card={card} size={76} lazy={false} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <h2 className="truncate text-2xl font-bold text-white">{player}</h2>
                {standing && (
                  <span
                    className={`shrink-0 text-sm font-bold tabular-nums ${
                      standing.rank <= 3 ? 'text-amber-300' : 'text-slate-500'
                    }`}
                  >
                    #{standing.rank}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm italic leading-relaxed text-slate-400">
                {card.description
                  ? t(card.description)
                  : t('No description yet — still scores all the same.')}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('Close')}
              className="-mr-1 -mt-1 shrink-0 rounded p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
                <path d="m4 4 8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>

          {standing && (
            <>
              <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                {t('{label} race', { label: t(format.label) })}
              </h3>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Figure label="Points" value={points(standing.points)} />
                <Figure
                  label="Counting"
                  value={`${standing.counted} / ${format.best}`}
                  muted={standing.counted < format.best}
                />
                <Figure label="Played" value={String(standing.played)} />
                <Figure label="Best score" value={points(standing.best)} />
                <Figure
                  label="Cutoff"
                  value={standing.cutoff === null ? '—' : points(standing.cutoff)}
                  muted={standing.cutoff === null}
                />
                <Figure
                  label="Prize"
                  value={prize === undefined ? '—' : `$${formatMoney(prize)}`}
                  muted={!prize}
                />
                <Figure
                  label="Payout"
                  value={payout === undefined ? '—' : `$${formatMoney(payout)}`}
                  muted={payout === undefined}
                />
                <Figure
                  label="From bounties"
                  value={
                    standing.points > 0
                      ? `${((standing.fromBounties / standing.points) * 100).toFixed(1)}%`
                      : '—'
                  }
                />
              </div>
            </>
          )}

          <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t('Last Longer')}
          </h3>
          {lastLonger ? (
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Figure label="Won" value={String(lastLonger.won)} muted={lastLonger.won === 0} />
              <Figure label="Nights" value={String(lastLonger.played)} />
              <Figure label="Win rate" value={`${lastLonger.winPct.toFixed(0)}%`} />
              <Figure
                label="Deepest"
                value={lastLonger.bestPlace === null ? '—' : String(lastLonger.bestPlace)}
              />
              <Figure
                label="Cashed"
                value={`$${formatMoney(lastLonger.cashFromWins)}`}
                muted={lastLonger.cashFromWins === 0}
              />
            </div>
          ) : (
            <p className="mt-2 text-xs text-slate-500">
              {t('Has not contested the Daily Main in this period.')}
            </p>
          )}

          <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t('The {n} scores counting', { n: counted.length })}
          </h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="pb-2 font-medium">{t('Date')}</th>
                  <th className="pb-2 font-medium">{t('Event')}</th>
                  <th className="pb-2 pl-3 text-right font-medium">{t('Entries')}</th>
                  <th className="pb-2 pl-3 text-right font-medium">{t('Place')}</th>
                  <th className="pb-2 pl-3 text-right font-medium">{t('Buy-in')}</th>
                  <th className="pb-2 pl-3 text-right font-medium">{t('Bounties')}</th>
                  <th className="pb-2 pl-3 text-right font-medium">{t('Score')}</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {counted.map(({ result, score }) => (
                  <tr key={result.id} className="border-b border-slate-800/60 last:border-0">
                    <td className="py-1.5 tabular-nums text-slate-500">{result.date}</td>
                    <td className="py-1.5">{result.event}</td>
                    <td className="py-1.5 pl-3 text-right tabular-nums">
                      {result.entrants.toLocaleString('en-US')}
                    </td>
                    <td className="py-1.5 pl-3 text-right tabular-nums">{result.place}</td>
                    <td className="py-1.5 pl-3 text-right tabular-nums text-slate-400">
                      ${result.buyIn}
                    </td>
                    <td className="py-1.5 pl-3 text-right tabular-nums text-slate-400">
                      {result.bounties > 0 ? `$${result.bounties.toFixed(0)}` : '—'}
                    </td>
                    <td className="py-1.5 pl-3 text-right font-semibold tabular-nums text-white">
                      {points(score)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {counted.length === 0 && (
            <p className="mt-2 text-xs text-slate-500">{t('Nothing played in this period.')}</p>
          )}
        </div>
      )}
    </dialog>
  )
}
