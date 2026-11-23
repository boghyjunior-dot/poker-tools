/**
 * What a result is worth, looked up rather than worked out.
 *
 * The calculator answers one question at a time and the formula answers
 * none — you cannot read a fourth root and know whether tonight's $33 is
 * worth more than two $11s. This is the whole surface laid out: every
 * plausible finish against every plausible field, with the stake as the one
 * control, because the stake is a flat multiplier and changing it moves the
 * entire grid by the same factor.
 *
 * Three tables rather than one, because the formula has three independent
 * parts and mixing them in a single grid would hide what each one does.
 */

import { useState } from 'react'
import { useT } from '../../lib/i18n'
import {
  STAKE_CEILING,
  STAKE_FLOOR,
  bountyPoints,
  finishPoints,
  stakeFactor,
} from '../../lib/leaderboard'

const points = (value: number) => Math.round(value).toLocaleString('en-US')

/** The rungs people actually play inside the band. */
const STAKES = [5.5, 11, 22, 33, 54, 66]

const FIELDS = [500, 1000, 2500, 5000, 10000, 15000]

/** Absolute places, because that is the number you know on the night. */
const PLACES = [1, 3, 9, 20, 50, 100, 200, 500, 1000, 2500]

/** Depths, which turn out to pay the same whatever the field. */
const DEPTHS: { label: string; share: number }[] = [
  { label: 'Min-cash — top 15%', share: 0.15 },
  { label: 'Top 10%', share: 0.1 },
  { label: 'Top 5%', share: 0.05 },
  { label: 'Top 2%', share: 0.02 },
  { label: 'Top 1%', share: 0.01 },
  { label: 'Top 0.5%', share: 0.005 },
  { label: 'Top 0.1%', share: 0.001 },
]

/** Bounty hauls, as a multiple of the buy-in. */
const RATIOS = [0.5, 1, 2, 5, 10, 25, 50, 100]

/**
 * A wash of colour scaled to the value, log first.
 *
 * Linear shading would leave everything below a win looking identical, since
 * the top of this grid is two hundred times the bottom of it.
 */
function heat(value: number, low: number, high: number): string {
  const span = Math.log(high) - Math.log(low)
  const at = span > 0 ? (Math.log(Math.max(value, low)) - Math.log(low)) / span : 0
  return `rgba(52, 211, 153, ${(0.04 + at * 0.3).toFixed(3)})`
}

export function PointsTable() {
  const t = useT()
  const [buyIn, setBuyIn] = useState(22)
  const factor = stakeFactor(buyIn)

  const cell = (entrants: number, place: number) =>
    place > entrants ? null : finishPoints(entrants, place) * factor

  const low = finishPoints(FIELDS[0], PLACES[PLACES.length - 1]) * factor
  const high = finishPoints(FIELDS[FIELDS.length - 1], 1) * factor

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
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
        <span className="text-xs text-slate-600">
          {t('everything below is multiplied by {factor}', { factor: `×${factor.toFixed(2)}` })}
        </span>
      </div>

      <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {t('By where you finished')}
      </h3>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-right text-[11px] uppercase tracking-wide text-slate-500">
              <th className="pb-2 text-left font-medium">{t('Place')}</th>
              {FIELDS.map((field) => (
                <th key={field} className="pb-2 pl-3 font-medium">
                  {field.toLocaleString('en-US')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-slate-300">
            {PLACES.map((place) => (
              <tr key={place} className="border-b border-slate-800/60 last:border-0">
                <td className="py-1.5 font-medium text-slate-100 tabular-nums">
                  {place === 1 ? t('Won it') : place}
                </td>
                {FIELDS.map((field) => {
                  const value = cell(field, place)
                  return (
                    <td
                      key={field}
                      className="py-1.5 pl-3 text-right font-semibold tabular-nums"
                      style={value === null ? undefined : { background: heat(value, low, high) }}
                    >
                      {value === null ? <span className="text-slate-700">—</span> : points(value)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
        {t('Field size across the top. A dash is a place deeper than the field had.')}
      </p>

      <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {t('By how deep you got')}
      </h3>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-[11px] uppercase tracking-wide text-slate-500">
              <th className="pb-2 font-medium">{t('Depth')}</th>
              <th className="pb-2 pl-3 text-right font-medium">{t('Points')}</th>
              <th className="pb-2 pl-3 text-left font-medium">{t('which is')}</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            {DEPTHS.map(({ label, share }) => (
              <tr key={label} className="border-b border-slate-800/60 last:border-0">
                <td className="py-1.5 text-slate-400">{t(label)}</td>
                <td className="py-1.5 pl-3 text-right font-semibold tabular-nums text-white">
                  {points(finishPoints(1 / share, 1) * factor)}
                </td>
                <td className="py-1.5 pl-3 text-[11px] tabular-nums text-slate-600">
                  {FIELDS.map((field) => `${Math.round(field * share)} of ${field / 1000 >= 1 ? `${field / 1000}k` : field}`).join(' · ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 max-w-2xl text-[11px] leading-relaxed text-slate-600">
        {t('One number each, because a depth pays the same whatever the field: N over R is a ratio, so 150th of 1,000 and 2,250th of 15,000 are the same result. A bigger field is worth more only once you get absolutely deeper than a small one lets you.')}
      </p>

      <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {t('What the bounties add')}
      </h3>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-[11px] uppercase tracking-wide text-slate-500">
              <th className="pb-2 font-medium">{t('Collected')}</th>
              <th className="pb-2 pl-3 text-right font-medium">Bty / Bi</th>
              <th className="pb-2 pl-3 text-right font-medium">{t('Points')}</th>
              <th className="pb-2 pl-3 text-left font-medium">{t('about the same as')}</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            {RATIOS.map((ratio) => {
              const added = bountyPoints(ratio * buyIn, buyIn) * factor
              // What depth that many points would have bought on its own.
              const share = 1 / Math.pow(added / (100 * factor), 2)
              return (
                <tr key={ratio} className="border-b border-slate-800/60 last:border-0">
                  <td className="py-1.5 tabular-nums text-slate-400">
                    ${Math.round(ratio * buyIn).toLocaleString('en-US')}
                  </td>
                  <td className="py-1.5 pl-3 text-right tabular-nums text-slate-500">
                    {ratio.toFixed(1)}
                  </td>
                  <td className="py-1.5 pl-3 text-right font-semibold tabular-nums text-white">
                    {points(added)}
                  </td>
                  <td className="py-1.5 pl-3 text-[11px] text-slate-600">
                    {added < 100 * factor
                      ? t('less than turning up')
                      : t('finishing in the top {pct}', {
                          pct:
                            share * 100 >= 1
                              ? `${(share * 100).toFixed(share * 100 >= 10 ? 0 : 1)}%`
                              : `${(share * 100).toFixed(2)}%`,
                        })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 max-w-2xl text-[11px] leading-relaxed text-slate-600">
        {t('Bounties are a ratio to the buy-in, so a knockout schedule scores the same at ${low} as at ${high} for the same effort. Ordinary bounty play sits in the first two rows; the bottom of this table is a mystery hit, and it is worth knowing how far down it reaches.', {
          low: STAKE_FLOOR,
          high: STAKE_CEILING,
        })}
      </p>
    </div>
  )
}
