/**
 * The MTT Challenge standings.
 *
 * Two tables off one set of results: best ten in a month, best fifty in a
 * year. The page shows the working everywhere it can — the cutoff each player
 * is defending, the scores a total is made of, and the arithmetic of a single
 * result — because a leaderboard people pay to enter is a thing they will
 * want to check rather than trust.
 */

import { useMemo, useState } from 'react'
import { BackToMenu } from '../BackToMenu'
import { Footer } from '../Footer'
import { LocalOnlyBanner } from '../LocalOnlyBanner'
import { CHALLENGE_VARIABLE, FEATURE_CHALLENGE_PUBLISHED } from '../../lib/featureFlags'
import { useT } from '../../lib/i18n'
import {
  FORMATS,
  bountyPoints,
  countedFor,
  finishPoints,
  inMonth,
  inYear,
  monthsIn,
  pot,
  score,
  standings,
  yearsIn,
  type ChallengeResult,
  type FormatId,
} from '../../lib/leaderboard'
import { buildChallengeLog } from '../../lib/leaderboardDemo'

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-slate-800 bg-slate-900/60 p-5 ${className}`}>
      {children}
    </section>
  )
}

const points = (value: number) => Math.round(value).toLocaleString('en-US')

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function monthLabel(month: string): string {
  const index = Number(month.slice(5, 7)) - 1
  return `${MONTH_NAMES[index] ?? month} ${month.slice(0, 4)}`
}

/**
 * The mock field, built once.
 *
 * Nothing feeds this page yet, and inventing a result on every render would
 * make the standings move while you read them. One seed, one field, and the
 * same table every time it is opened.
 */
const DEMO_LOG = buildChallengeLog({ seed: 2026, from: '2026-01-01', days: 319 })

export function LeaderboardPage() {
  const t = useT()
  const [formatId, setFormatId] = useState<FormatId>('monthly')
  const results: ChallengeResult[] = DEMO_LOG

  const months = useMemo(() => monthsIn(results), [results])
  const years = useMemo(() => yearsIn(results), [results])
  const [month, setMonth] = useState(() => months[0] ?? '')
  const [year, setYear] = useState(() => years[0] ?? '')
  const [open, setOpen] = useState<string | null>(null)

  const format = FORMATS[formatId]
  const period = formatId === 'monthly' ? month : year
  const inPeriod = useMemo(
    () => (formatId === 'monthly' ? inMonth(results, month) : inYear(results, year)),
    [results, formatId, month, year],
  )
  const table = useMemo(() => standings(inPeriod, format), [inPeriod, format])
  const working = useMemo(
    () => (open ? countedFor(inPeriod, open, format) : []),
    [inPeriod, open, format],
  )

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="mx-auto w-full max-w-5xl">
        <BackToMenu className="mb-3" />
        <h1 className="text-3xl font-bold text-white">{t('MTT Challenge')}</h1>
        <p className="mb-5 max-w-2xl text-sm text-slate-400">
          {t(
            'Two races off the same results. The monthly one counts your best ten scores in the month; the yearly one counts your best fifty. Points come from how deep you ran in how big a field, with a bit on top for bounties.',
          )}
        </p>

        <LocalOnlyBanner
          published={FEATURE_CHALLENGE_PUBLISHED}
          variable={CHALLENGE_VARIABLE}
          className="mb-4"
        />

        <p className="mb-6 rounded-lg border border-indigo-900/60 bg-indigo-950/30 px-4 py-3 text-xs leading-relaxed text-indigo-200">
          {t(
            'These standings are a mock field of ten invented players, built to a fixed seed so the table is the same every time. Nothing here is anybody’s real results — the challenge has no way to collect them yet.',
          )}
        </p>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex gap-0.5 rounded-md border border-slate-800 bg-slate-950/60 p-0.5">
            {(['monthly', 'yearly'] as FormatId[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setFormatId(option)
                  setOpen(null)
                }}
                className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
                  formatId === option
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t(FORMATS[option].label)}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-500">
            {t('Period')}
            <select
              aria-label={t('Period')}
              value={period}
              onChange={(event) => {
                setOpen(null)
                if (formatId === 'monthly') setMonth(event.target.value)
                else setYear(event.target.value)
              }}
              className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200"
            >
              {(formatId === 'monthly' ? months : years).map((option) => (
                <option key={option} value={option}>
                  {formatId === 'monthly' ? monthLabel(option) : option}
                </option>
              ))}
            </select>
          </label>

          <span className="text-xs text-slate-500">
            {t('Best {n} scores · ${fee} to enter · ${pot} in the pot', {
              n: format.best,
              fee: format.fee,
              pot: pot(table.length, format),
            })}
          </span>
        </div>

        <div className="flex flex-col gap-4">
          <Panel className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 font-medium">{t('#')}</th>
                    <th className="px-2 py-3 font-medium">{t('Player')}</th>
                    <th className="px-2 py-3 text-right font-medium">{t('Points')}</th>
                    <th className="px-2 py-3 text-right font-medium">{t('Counting')}</th>
                    <th className="px-2 py-3 text-right font-medium">{t('Played')}</th>
                    <th className="px-2 py-3 text-right font-medium">{t('Best')}</th>
                    <th className="px-2 py-3 text-right font-medium">{t('Cutoff')}</th>
                    <th className="px-4 py-3 text-right font-medium">{t('Bounties')}</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  {table.map((row) => (
                    <tr
                      key={row.player}
                      onClick={() => setOpen(open === row.player ? null : row.player)}
                      className={`cursor-pointer border-b border-slate-800/60 transition-colors last:border-0 hover:bg-slate-800/40 ${
                        open === row.player ? 'bg-slate-800/50' : ''
                      }`}
                    >
                      <td
                        className={`px-4 py-2.5 tabular-nums ${
                          row.rank <= 3 ? 'font-bold text-amber-300' : 'text-slate-500'
                        }`}
                      >
                        {row.rank}
                      </td>
                      <td className="px-2 py-2.5 font-medium text-slate-100">{row.player}</td>
                      <td className="px-2 py-2.5 text-right font-bold tabular-nums text-white">
                        {points(row.points)}
                      </td>
                      <td
                        className={`px-2 py-2.5 text-right tabular-nums ${
                          row.counted < format.best ? 'text-amber-400' : 'text-slate-400'
                        }`}
                        title={
                          row.counted < format.best
                            ? t('Short of the {n} that count, so every result still adds.', {
                                n: format.best,
                              })
                            : undefined
                        }
                      >
                        {row.counted} / {format.best}
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-slate-500">
                        {row.played}
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-slate-400">
                        {points(row.best)}
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-slate-500">
                        {row.cutoff === null ? '—' : points(row.cutoff)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">
                        {row.points > 0 ? `${((row.fromBounties / row.points) * 100).toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {table.length === 0 && (
              <p className="px-4 py-6 text-sm text-slate-500">
                {t('Nothing played in this period.')}
              </p>
            )}
            <p className="border-t border-slate-800 px-4 py-3 text-[11px] leading-relaxed text-slate-600">
              {t(
                'Cutoff is the lowest score still counting: once the quota is full, a new result only moves the total if it beats that. Pick a row to see the scores behind it.',
              )}
            </p>
          </Panel>

          {open && working.length > 0 && (
            <Panel>
              <h2 className="text-sm font-semibold text-white">
                {t('{player} — the {n} scores counting', { player: open, n: working.length })}
              </h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-left text-[11px] uppercase tracking-wide text-slate-500">
                      <th className="pb-2 font-medium">{t('Date')}</th>
                      <th className="pb-2 font-medium">{t('Event')}</th>
                      <th className="pb-2 text-right font-medium">{t('Entries')}</th>
                      <th className="pb-2 text-right font-medium">{t('Place')}</th>
                      <th className="pb-2 text-right font-medium">{t('Buy-in')}</th>
                      <th className="pb-2 text-right font-medium">{t('Bounties')}</th>
                      <th className="pb-2 text-right font-medium">{t('Score')}</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300">
                    {working.map(({ result, score: value }) => (
                      <tr key={result.id} className="border-b border-slate-800/60 last:border-0">
                        <td className="py-1.5 tabular-nums text-slate-500">{result.date}</td>
                        <td className="py-1.5">{result.event}</td>
                        <td className="py-1.5 text-right tabular-nums">
                          {result.entrants.toLocaleString('en-US')}
                        </td>
                        <td className="py-1.5 text-right tabular-nums">{result.place}</td>
                        <td className="py-1.5 text-right tabular-nums text-slate-400">
                          ${result.buyIn}
                        </td>
                        <td className="py-1.5 text-right tabular-nums text-slate-400">
                          {result.bounties > 0 ? `$${result.bounties.toFixed(0)}` : '—'}
                        </td>
                        <td className="py-1.5 text-right font-semibold tabular-nums text-white">
                          {points(value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          <Panel>
            <h2 className="text-sm font-semibold text-white">{t('How a score is worked out')}</h2>
            <p className="mt-2 font-mono text-sm text-indigo-300">
              S = 100 × √(N / R) + 25 × (Bty / Bi)
            </p>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-500">
              {t(
                'N is the number of entries, R is where you finished, Bty is the bounty money you collected and Bi is the buy-in. Finishing last in the field is worth 100, because N over R is one; everything above that is how far up you got, and the square root is what stops a win in a huge field being worth a hundred times a win in a small one.',
              )}
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="pb-2 font-medium">{t('A night like this')}</th>
                    <th className="pb-2 text-right font-medium">N</th>
                    <th className="pb-2 text-right font-medium">R</th>
                    <th className="pb-2 text-right font-medium">Bty / Bi</th>
                    <th className="pb-2 text-right font-medium">{t('Finish')}</th>
                    <th className="pb-2 text-right font-medium">{t('Bounty')}</th>
                    <th className="pb-2 text-right font-medium">{t('Score')}</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  {EXAMPLES.map((example) => (
                    <tr key={example.label} className="border-b border-slate-800/60 last:border-0">
                      <td className="py-1.5 text-slate-400">{t(example.label)}</td>
                      <td className="py-1.5 text-right tabular-nums">
                        {example.entrants.toLocaleString('en-US')}
                      </td>
                      <td className="py-1.5 text-right tabular-nums">{example.place}</td>
                      <td className="py-1.5 text-right tabular-nums text-slate-500">
                        {(example.bounties / example.buyIn).toFixed(1)}
                      </td>
                      <td className="py-1.5 text-right tabular-nums text-slate-400">
                        {points(finishPoints(example.entrants, example.place))}
                      </td>
                      <td className="py-1.5 text-right tabular-nums text-slate-400">
                        {points(bountyPoints(example.bounties, example.buyIn))}
                      </td>
                      <td className="py-1.5 text-right font-semibold tabular-nums text-white">
                        {points(score({ ...example, id: example.label, player: '', date: '', event: '' }))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <Footer />
      </div>
    </div>
  )
}

/** A few results worth knowing the price of. */
const EXAMPLES = [
  { label: 'Busting last in a 1,000-runner', entrants: 1000, place: 1000, buyIn: 22, bounties: 0 },
  { label: 'A min-cash, 150th of 1,000', entrants: 1000, place: 150, buyIn: 22, bounties: 0 },
  { label: 'The same min-cash with ten buy-ins in heads', entrants: 1000, place: 150, buyIn: 22, bounties: 220 },
  { label: 'Final table, 7th of 1,000', entrants: 1000, place: 7, buyIn: 22, bounties: 0 },
  { label: 'Winning a 200-runner', entrants: 200, place: 1, buyIn: 22, bounties: 0 },
  { label: 'Winning a 1,000-runner', entrants: 1000, place: 1, buyIn: 22, bounties: 0 },
  { label: 'Winning a 10,000-runner', entrants: 10_000, place: 1, buyIn: 22, bounties: 0 },
]
