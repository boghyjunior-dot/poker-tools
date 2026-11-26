/**
 * What it would take tonight.
 *
 * Every other panel here reports what happened. This one reads the standings
 * backwards: a player's cutoff is the score their next result has to beat
 * for their total to move at all, and the formula inverts cleanly, so that
 * number can be turned into the thing you actually know while you are
 * looking at a lobby — how deep you have to run.
 *
 * The depth is the honest answer and the places are the same answer made
 * concrete, because N over R is a ratio: "top 4%" holds whatever the field,
 * and a field size only turns it into a number you can aim at.
 *
 * Bounties are assumed to be nothing. A haul can only lower the bar and
 * nobody can plan one, so planning without it is the version that cannot
 * mislead anybody.
 */

import { useState } from 'react'
import { useT } from '../../lib/i18n'
import {
  depthNeeded,
  placeNeeded,
  scoreToReach,
  type Format,
  type Standing,
} from '../../lib/leaderboard'
import { profileFor, type PlayerCard } from '../../lib/playerProfiles'
import { Avatar } from './Avatar'
import { pressable } from './pressable'

/** The same rungs the lookup tables use, so the two panels read alike. */
const STAKES = [5.5, 11, 22, 33, 54, 66]

/**
 * Fields to turn the depth into a place in.
 *
 * Three rather than six: the depth is the answer and these only make it
 * concrete, so what matters is covering a small nightly field, a middling
 * one and a Sunday.
 */
const FIELDS = [1000, 2500, 10000]

const points = (value: number) => Math.round(value).toLocaleString('en-US')

/** A share of the field, written the way the lookup tables write one. */
function percent(share: number): string {
  const pct = share * 100
  if (pct >= 10) return `${pct.toFixed(0)}%`
  if (pct >= 1) return `${pct.toFixed(1)}%`
  return `${pct.toFixed(2)}%`
}

/** Which bar the targets are measured against. */
type Aim = 'cutoff' | 'lead'

export function CutoffTargets({
  table,
  format,
  cards,
  onPick,
}: {
  table: readonly Standing[]
  format: Format
  cards: readonly PlayerCard[]
  onPick: (player: string) => void
}) {
  const t = useT()
  /**
   * The Main this group plays, so the answer on screen before anybody
   * touches the control is the one most of them came for.
   */
  const [buyIn, setBuyIn] = useState(54)
  const [aim, setAim] = useState<Aim>('cutoff')

  // Level with the leader is first place, because ties share a rank: there
  // is no need to ask anybody for more than that.
  const leader = table.length > 0 ? table[0].points : 0

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-0.5 rounded-md border border-slate-800 bg-slate-950/60 p-0.5">
          {(['cutoff', 'lead'] as Aim[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setAim(option)}
              aria-pressed={aim === option}
              className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
                aim === option ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t(option === 'cutoff' ? 'To move your total' : 'To catch the leader')}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-500">{t('At a buy-in of')}</span>
        <div className="flex flex-wrap gap-0.5 rounded-md border border-slate-800 bg-slate-950/60 p-0.5">
          {STAKES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setBuyIn(option)}
              aria-pressed={buyIn === option}
              className={`rounded px-2.5 py-1 text-xs font-semibold tabular-nums transition-colors ${
                buyIn === option
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ${option}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-[11px] uppercase tracking-wide text-slate-500">
              <th className="pb-2 font-medium">{t('Player')}</th>
              <th className="pb-2 pl-3 text-right font-medium">{t('Must beat')}</th>
              <th className="pb-2 pl-3 text-right font-medium">{t('Depth')}</th>
              {FIELDS.map((field) => (
                <th key={field} className="pb-2 pl-3 text-right font-medium">
                  {t('in {field}', { field: field.toLocaleString('en-US') })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-slate-300">
            {table.map((row) => {
              const needed = aim === 'lead' ? scoreToReach(row, leader) : (row.cutoff ?? 0)
              const depth = depthNeeded(needed, buyIn)
              // Nothing to ask for: either the quota has room, so anything
              // adds, or they are already level with the leader.
              const clear = needed <= 0

              return (
                <tr
                  key={row.player}
                  {...pressable(() => onPick(row.player))}
                  className="cursor-pointer border-b border-slate-800/60 transition-colors last:border-0 hover:bg-slate-800/40 focus:outline-none focus-visible:bg-slate-800/60"
                >
                  <td className="py-2">
                    <span className="flex items-center gap-2.5">
                      <Avatar card={profileFor(row.player, cards)} size={24} />
                      <span className="font-medium text-slate-100">{row.player}</span>
                    </span>
                  </td>
                  {clear ? (
                    <>
                      <td className="py-2 pl-3 text-right tabular-nums text-slate-600">—</td>
                      <td
                        className="py-2 pl-3 text-xs italic text-emerald-400"
                        colSpan={1 + FIELDS.length}
                      >
                        {aim === 'lead'
                          ? t('Level with the lead')
                          : t('Room left, so every result adds')}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-2 pl-3 text-right font-semibold tabular-nums text-white">
                        {points(needed)}
                      </td>
                      <td className="py-2 pl-3 text-right font-semibold tabular-nums text-indigo-300">
                        {/* A whole-field share is not a depth anybody aims
                            for: at this stake the bar is below what last of
                            the field already pays. */}
                        {depth >= 1 ? t('any finish') : t('top {pct}', { pct: percent(depth) })}
                      </td>
                      {FIELDS.map((field) => {
                        const place = placeNeeded(needed, field, buyIn)
                        return (
                          <td
                            key={field}
                            className={`py-2 pl-3 text-right tabular-nums ${
                              place === null ? 'text-slate-700' : 'text-slate-200'
                            }`}
                            title={
                              place === null
                                ? t(
                                    'Out of reach in a field that size: winning it outright is worth less than the target.',
                                  )
                                : undefined
                            }
                          >
                            {place === null ? '—' : place.toLocaleString('en-US')}
                          </td>
                        )
                      })}
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {table.length === 0 && (
        <p className="mt-3 text-sm text-slate-500">{t('Nothing played in this period.')}</p>
      )}

      <p className="mt-3 max-w-3xl text-[11px] leading-relaxed text-slate-600">
        {t(
          'Depth is the real answer and it does not care how big the field is: beat that share of it and the score follows. The three columns are the same thing as a place you can aim at. A dash is a field that size being unable to get you there — winning it outright is worth less than the target, so it takes a bigger field or a dearer game.',
        )}
      </p>
      <p className="mt-2 max-w-3xl text-[11px] leading-relaxed text-slate-600">
        {t(
          'No bounties are assumed, so every figure here is the hard way round: collect heads and the bar drops by whatever the table below says they are worth. And once a player is counting their full {n}, a new score has to replace their worst one rather than join it — which is why catching somebody costs more than the gap between you.',
          { n: format.best },
        )}
      </p>
    </div>
  )
}
