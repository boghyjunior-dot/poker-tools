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
import { DeployedViewSwitch } from '../DeployedViewSwitch'
import { showing, useDeployedView } from '../../lib/deployedView'
import {
  csvName,
  downloadCsv,
  lastLongerCsv,
  standingsCsv,
} from '../../lib/leaderboardCsv'
import { racePath } from '../../lib/racePath'
import { BAND_TEXT, BAND_TEXT_SOFT, band } from '../../lib/metricBand'
import {
  CHALLENGE_VARIABLE,
  CUTOFF_VARIABLE,
  FEATURE_CHALLENGE_PUBLISHED,
  FEATURE_CUTOFF_ENABLED,
  FEATURE_CUTOFF_PUBLISHED,
  FEATURE_LAST_LONGER_ENABLED,
  FEATURE_LAST_LONGER_PUBLISHED,
} from '../../lib/featureFlags'
import { formatMoney } from '../../lib/formatNumber'
import { useT, type TranslateFn } from '../../lib/i18n'
import {
  DAILY_MAIN,
  FORMATS,
  countedFor,
  CHALLENGE_NAME,
  STAKE_CEILING,
  STAKE_FLOOR,
  cashByPlayer,
  eligible,
  history,
  inMonth,
  inYear,
  ineligible,
  isPlaceholder,
  lastLongerRounds,
  lastLongerStandings,
  monthlyQualifiers,
  PRIZE_SHARES,
  openingMonth,
  openingYear,
  payouts,
  pot,
  seasonMonths,
  seasonYears,
  stakeFactor,
  standings,
  type ChallengeResult,
  type FormatId,
} from '../../lib/leaderboard'
import { CHALLENGE_PLAYERS, ROSTER } from '../../content/challengePlayers'
import { CHALLENGE_RESULTS } from '../../content/challengeResults'
import { profileFor } from '../../lib/playerProfiles'
import { Avatar } from './Avatar'
import { CutoffTargets } from './CutoffTargets'
import { PlayerDialog } from './PlayerDialog'
import { PointsTable } from './PointsTable'
import { RaceChart } from './RaceChart'
import { pressable } from './pressable'

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

function monthLabel(month: string, t: TranslateFn): string {
  const index = Number(month.slice(5, 7)) - 1
  const name = MONTH_NAMES[index]
  return name ? `${t(name)} ${month.slice(0, 4)}` : month
}


export function LeaderboardPage() {
  const t = useT()
  /**
   * Which of the three competitions is on screen.
   *
   * The last longer is not a points race — no best-of, no entry fee, no
   * formula — so it is a view rather than another Format. It still answers
   * the same question the tabs are asking, which is "who is winning what",
   * and that is what makes it belong in the same row of buttons.
   */
  const pretending = useDeployedView()
  const lastLongerOn = showing(
    FEATURE_LAST_LONGER_ENABLED,
    FEATURE_LAST_LONGER_PUBLISHED,
    pretending,
  )

  const cutoffOn = showing(FEATURE_CUTOFF_ENABLED, FEATURE_CUTOFF_PUBLISHED, pretending)

  const [picked, setPicked] = useState<ViewId>('monthly')
  // Falling back rather than remembering: flipping the preview switch while
  // standing on the last longer should not leave the page on a tab that is
  // no longer there.
  const view: ViewId = picked === 'lastLonger' && !lastLongerOn ? 'monthly' : picked
  const setView = setPicked
  const formatId: FormatId = view === 'monthly' ? 'monthly' : 'yearly'
  const results: ChallengeResult[] = CHALLENGE_RESULTS
  const madeUp = isPlaceholder(results)

  const months = useMemo(() => seasonMonths(results), [results])
  const years = useMemo(() => seasonYears(results), [results])
  // Opens on the newest month anybody has played, not on an empty December.
  const [month, setMonth] = useState(() => openingMonth(results))
  const [year, setYear] = useState(() => openingYear(results))
  /** Whose window is open, if any. */
  const [open, setOpen] = useState<string | null>(null)
  const pick = (player: string) => setOpen(player)

  const format = FORMATS[formatId]
  // The last longer is counted over the season, like the yearly race.
  const byMonth = view === 'monthly'
  const period = byMonth ? month : year
  const everything = useMemo(
    () => (byMonth ? inMonth(results, month) : inYear(results, year)),
    [results, byMonth, month, year],
  )
  /**
   * Only what the band allows, filtered once and in one place.
   *
   * Everything downstream — the tables, the last longer, the profiles —
   * reads this rather than the raw log, so there is no path by which an
   * out-of-band result can quietly score.
   */
  const inPeriod = useMemo(() => eligible(everything), [everything])
  const skipped = useMemo(() => ineligible(everything).length, [everything])
  /**
   * What the points race is scored over.
   *
   * The monthly race counts the month. The yearly one counts the scores that
   * made a monthly top ten, pooled — so a result has to earn its place
   * twice, and the months are the qualifiers rather than a separate contest.
   * The last longer reads `inPeriod` instead: every night of the Main was
   * contested whether or not the result made anybody's ten.
   */
  const scoring = useMemo(
    () => (byMonth ? inPeriod : monthlyQualifiers(inPeriod, FORMATS.monthly.best)),
    [inPeriod, byMonth],
  )
  const table = useMemo(() => standings(scoring, format, ROSTER), [scoring, format])
  // The pot is what the entrants put in, which is everybody on the roster
  // whether or not they have played yet.
  const paid = useMemo(() => payouts(table, format, ROSTER.length), [table, format])
  /**
   * The table on every night of the period.
   *
   * Qualified up to each date rather than over the period as a whole, so the
   * line is what the standings said that evening instead of what hindsight
   * makes of it.
   */
  const race = useMemo(
    () =>
      racePath(inPeriod, format, ROSTER, (rows) =>
        byMonth ? rows : monthlyQualifiers(rows, FORMATS.monthly.best),
      ),
    [inPeriod, format, byMonth],
  )
  // Over every result in the period, not only the scoring ones: a figure
  // that moved when a score fell out of somebody's top ten would be one
  // nobody could reconcile against their own records.
  const won = useMemo(() => cashByPlayer(inPeriod), [inPeriod])

  /**
   * Each column's figures, so a cell can be coloured against its own column.
   *
   * Gathered once rather than per cell: a band is a comparison against every
   * other row, and recomputing that inside the render of each row would turn
   * a table into a quadratic.
   */
  const columns = useMemo(
    () => ({
      points: table.map((row) => row.points),
      counted: table.map((row) => row.counted),
      best: table.map((row) => row.best),
      cutoff: table.map((row) => row.cutoff ?? 0),
      prize: table.map((row) => won.get(row.player) ?? 0),
    }),
    [table, won],
  )
  const working = useMemo(
    () => (open ? countedFor(scoring, open, format) : []),
    [scoring, open, format],
  )
  const nights = useMemo(() => lastLongerRounds(inPeriod, DAILY_MAIN), [inPeriod])
  const lastLonger = useMemo(() => lastLongerStandings(inPeriod, DAILY_MAIN), [inPeriod])
  const llColumns = useMemo(
    () => ({
      won: lastLonger.map((row) => row.won),
      played: lastLonger.map((row) => row.played),
      winPct: lastLonger.map((row) => row.winPct),
      best: lastLonger.map((row) => row.bestPlace ?? Number.POSITIVE_INFINITY),
      cash: lastLonger.map((row) => row.cashFromWins),
    }),
    [lastLonger],
  )
  const [allNights, setAllNights] = useState(false)
  // The history shows everything entered for the period, band or no band:
  // a result that scored nothing is still a thing somebody wrote down.
  const entered = useMemo(() => history(everything), [everything])
  const [allEntries, setAllEntries] = useState(false)

  /** The table on screen, as a file. Figures handed over, never recomputed. */
  const exportCsv = () => {
    const csv =
      view === 'lastLonger'
        ? lastLongerCsv(lastLonger)
        : standingsCsv(
            table,
            format,
            (player) => won.get(player) ?? 0,
            (player) => paid.get(player),
          )
    downloadCsv(csvName(view === 'lastLonger' ? 'last-longer' : view, period), csv)
  }
  const shownEntries = allEntries ? entered.length : RECENT_ENTRIES
  const shown = allNights ? nights : nights.slice(0, RECENT_NIGHTS)

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="mx-auto w-full max-w-5xl">
        <BackToMenu className="mb-3" />

        <h1 className="text-3xl font-bold text-white">
          {t(CHALLENGE_NAME)}
        </h1>
        <p className="mb-5 max-w-2xl text-sm text-slate-400">
          {t(
            'The monthly race counts your best ten scores in the month. The yearly one counts your best fifty of those — only a score that made a monthly top ten is in it, so the months are the qualifiers. Points come from how deep you ran in how big a field, with a bit on top for bounties.',
          )}
        </p>

        {madeUp && (
          <p className="mb-5 rounded-lg border border-amber-900/60 bg-amber-950/30 px-4 py-3 text-sm leading-relaxed text-amber-200">
            <span className="font-semibold">{t('These results are made up.')}</span>{' '}
            {t(
              'Every figure on this page is invented, so the challenge can be looked at before it starts. Nothing here happened, and it all goes the moment the first real result is entered.',
            )}
          </p>
        )}

        <LocalOnlyBanner
          published={FEATURE_CHALLENGE_PUBLISHED}
          variable={CHALLENGE_VARIABLE}
          className="mb-4"
        />


        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex gap-0.5 rounded-md border border-slate-800 bg-slate-950/60 p-0.5">
            {(['monthly', 'yearly', ...(lastLongerOn ? (['lastLonger'] as const) : [])] as ViewId[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setView(option)
                  setOpen(null)
                }}
                className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
                  view === option
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t(VIEW_LABELS[option])}
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
                if (byMonth) setMonth(event.target.value)
                else setYear(event.target.value)
              }}
              className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200"
            >
              {(byMonth ? months : years).map((option) => (
                <option key={option} value={option}>
                  {byMonth ? monthLabel(option, t) : option}
                </option>
              ))}
            </select>
          </label>

          <a
            href="./calculator.html"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-xs font-semibold text-indigo-400 transition-colors hover:border-indigo-700 hover:text-indigo-300"
          >
            {t('Open Calculator')}
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3" aria-hidden>
              <path d="m6 4 4 4-4 4" />
            </svg>
          </a>

          {view !== 'lastLonger' && (
          <span className="text-xs text-slate-500">
            {t('Best {n} scores · ${fee} to enter · ${pot} in the pot, paid {split}', {
              n: format.best,
              fee: format.fee,
              pot: pot(ROSTER.length, format),
              split: PRIZE_SHARES.map((share) => `${share * 100}%`).join(' / '),
            })}
          </span>
          )}

          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-3.5 w-3.5" aria-hidden>
              <path d="M8 2v8M5 7l3 3 3-3M3 13h10" />
            </svg>
            {t('Export CSV')}
          </button>

          <span className="rounded border border-slate-800 bg-slate-950/60 px-2 py-1 text-[11px] text-slate-400">
            {t('${low}–${high} buy-ins only', { low: STAKE_FLOOR, high: STAKE_CEILING })}
            {skipped > 0 && (
              <span className="text-slate-600">
                {' '}
                {t('· {n} results outside it are not counted', { n: skipped })}
              </span>
            )}
          </span>
        </div>

        <div className="flex flex-col gap-4">
          {lastLongerOn && view === 'lastLonger' ? (
            <Panel>
              <h2 className="text-sm font-semibold text-white">{t('Last Longer')}</h2>
              <p className="mt-0.5 max-w-2xl text-xs text-slate-500">
                {t(
                  'A side contest in the $54 Daily Main on GGPoker: everybody in it plays the same tournament, and whoever busts last takes the night. No formula and no argument — you know who won before you go to bed.',
                )}
              </p>

              {nights.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  {t('Nobody has contested the Main in this period. A night with one entrant is not a last longer, so it is not counted.')}
                </p>
              ) : (
                <>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[560px] text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 text-left text-[11px] uppercase tracking-wide text-slate-500">
                          <th className="pb-2 font-medium">{t('#')}</th>
                          <th className="pb-2 font-medium">{t('Player')}</th>
                          <th className="pb-2 text-right font-medium">{t('Won')}</th>
                          <th className="pb-2 pr-4 text-right font-medium">{t('Played')}</th>
                          <th className="pb-2 pr-4 text-right font-medium">{t('Win rate')}</th>
                          <th className="pb-2 text-right font-medium">{t('Deepest')}</th>
                          <th className="pb-2 text-right font-medium">{t('Cashed')}</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-300">
                        {lastLonger.map((row) => (
                          <tr
                          key={row.player}
                          {...pressable(() => pick(row.player))}
                          className="cursor-pointer border-b border-slate-800/60 transition-colors last:border-0 hover:bg-slate-800/40 focus:outline-none focus-visible:bg-slate-800/60"
                        >
                            <td
                              className={`py-2 tabular-nums ${
                                row.won > 0 && row.rank === 1 ? 'font-bold text-amber-300' : 'text-slate-500'
                              }`}
                            >
                              {row.rank}
                            </td>
                            <td className="py-2">
                            <span className="flex items-center gap-2.5">
                              <Avatar card={profileFor(row.player, CHALLENGE_PLAYERS)} size={24} />
                              <span className="font-medium text-slate-100">{row.player}</span>
                            </span>
                          </td>
                            <td
                              className={`py-2 text-right font-bold tabular-nums ${
                                BAND_TEXT[band(row.won, llColumns.won)]
                              }`}
                            >
                              {row.won}
                            </td>
                            <td className="py-2 pr-4 text-right tabular-nums text-slate-500">
                              {row.played}
                            </td>
                            <td
                              className={`py-2 pr-4 text-right tabular-nums ${
                                BAND_TEXT_SOFT[band(row.winPct, llColumns.winPct)]
                              }`}
                            >
                              {row.winPct.toFixed(0)}%
                            </td>
                            <td
                              className={`py-2 text-right tabular-nums ${
                                row.bestPlace === null
                                  ? 'text-slate-600'
                                  : BAND_TEXT_SOFT[band(row.bestPlace, llColumns.best, false)]
                              }`}
                            >
                              {row.bestPlace ?? '—'}
                            </td>
                            <td
                              className={`py-2 text-right font-semibold tabular-nums ${
                                BAND_TEXT_SOFT[band(row.cashFromWins, llColumns.cash)]
                              }`}
                            >
                              ${formatMoney(row.cashFromWins)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {t('{n} nights contested', { n: nights.length })}
                  </h3>
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full min-w-[560px] text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 text-left text-[11px] uppercase tracking-wide text-slate-500">
                          <th className="pb-2 font-medium">{t('Date')}</th>
                          <th className="pb-2 text-right font-medium">{t('Field')}</th>
                          <th className="pb-2 pr-5 text-right font-medium">{t('In it')}</th>
                          <th className="pb-2 font-medium">{t('Lasted longest')}</th>
                          <th className="pb-2 text-right font-medium">{t('Position')}</th>
                          <th className="pb-2 text-right font-medium">{t('Cashed')}</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-300">
                        {shown.map((night) => (
                          <tr key={night.date} className="border-b border-slate-800/60 last:border-0">
                            <td className="py-1.5 tabular-nums text-slate-500">{night.date}</td>
                            <td className="py-1.5 text-right tabular-nums text-slate-400">
                              {night.entrants.toLocaleString('en-US')}
                            </td>
                            <td className="py-1.5 pr-5 text-right tabular-nums text-slate-500">
                              {night.contested}
                            </td>
                            <td className="py-1.5 font-medium text-slate-100">
                              {night.winners.map((winner, index) => (
                                <span key={winner}>
                                  {index > 0 && <span className="text-slate-500"> & </span>}
                                  <button
                                    type="button"
                                    onClick={() => pick(winner)}
                                    aria-haspopup="dialog"
                                    className="rounded underline-offset-2 transition-colors hover:text-white hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                  >
                                    {winner}
                                  </button>
                                </span>
                              ))}
                            </td>
                            <td className="py-1.5 text-right tabular-nums text-amber-300">
                              {night.place}
                            </td>
                            <td
                              className={`py-1.5 text-right font-semibold tabular-nums ${
                                night.cash > 0 ? 'text-emerald-400' : 'text-slate-600'
                              }`}
                            >
                              ${formatMoney(night.cash)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {nights.length > RECENT_NIGHTS && (
                    <button
                      type="button"
                      onClick={() => setAllNights(!allNights)}
                      className="mt-3 text-xs font-semibold text-indigo-400 transition-colors hover:text-indigo-300"
                    >
                      {allNights
                        ? t('Show the last {n}', { n: RECENT_NIGHTS })
                        : t('Show all {n} nights', { n: nights.length })}
                    </button>
                  )}
                  <p className="mt-3 text-[11px] leading-relaxed text-slate-600">
                    {t(
                      'Position is where the winner finished in the Main itself, and the money is what the prize pool paid them for it: cashes only, with the buy-in not taken off and the bounties counted separately. The last longer is its own competition, but the night still counts towards the points tables.',
                    )}
                  </p>
                </>
              )}
            </Panel>

          ) : (
            <>
            <Panel className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-left text-[11px] uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3 font-medium">{t('#')}</th>
                      <th className="px-2 py-3 font-medium">{t('Player')}</th>
                      <th className="px-2 py-3 text-right font-medium">{t('Points')}</th>
                      <th className="px-2 py-3 text-right font-medium">{t('Counting')}</th>
                      <th className="px-2 py-3 text-right font-medium">{t('Best')}</th>
                      <th className="px-2 py-3 text-right font-medium">{t('Cutoff')}</th>
                      <th className="px-2 py-3 text-right font-medium">{t('Prize')}</th>
                      <th className="px-4 py-3 text-right font-medium">{t('Payout')}</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300">
                    {table.map((row) => (
                      <tr
                        key={row.player}
                        {...pressable(() => pick(row.player))}
                        className={`cursor-pointer border-b border-slate-800/60 transition-colors last:border-0 hover:bg-slate-800/40 focus:outline-none focus-visible:bg-slate-800/60 ${
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
                        <td className="px-2 py-2.5">
                          <span className="flex items-center gap-2.5">
                            <Avatar card={profileFor(row.player, CHALLENGE_PLAYERS)} size={28} />
                            <span className="font-medium text-slate-100">{row.player}</span>
                          </span>
                        </td>
                        <td
                          className={`px-2 py-2.5 text-right font-bold tabular-nums ${
                            BAND_TEXT[band(row.points, columns.points)]
                          }`}
                        >
                          {points(row.points)}
                        </td>
                        <td
                          className={`px-2 py-2.5 text-right tabular-nums ${
                            BAND_TEXT_SOFT[band(row.counted, columns.counted)]
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
                        <td
                          className={`px-2 py-2.5 text-right tabular-nums ${
                            BAND_TEXT_SOFT[band(row.best, columns.best)]
                          }`}
                        >
                          {points(row.best)}
                        </td>
                        <td
                          className={`px-2 py-2.5 text-right tabular-nums ${
                            row.cutoff === null
                              ? 'text-slate-600'
                              : BAND_TEXT_SOFT[band(row.cutoff, columns.cutoff)]
                          }`}
                        >
                          {row.cutoff === null ? '—' : points(row.cutoff)}
                        </td>
                        <td
                          className={`px-2 py-2.5 text-right tabular-nums ${
                            BAND_TEXT_SOFT[band(won.get(row.player) ?? 0, columns.prize)]
                          }`}
                        >
                          ${formatMoney(won.get(row.player) ?? 0)}
                        </td>
                        <td
                          className={`px-4 py-2.5 text-right font-semibold tabular-nums ${
                            paid.has(row.player) ? 'text-emerald-400' : 'text-slate-700'
                          }`}
                        >
                          {paid.has(row.player) ? `$${formatMoney(paid.get(row.player) ?? 0)}` : '—'}
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
                {t('Figures are coloured against the rest of this table: green is the top third of the column, amber the middle, red the bottom. A column where everybody is level stays amber.')}{' '}
                {t(
                  'Cutoff is the lowest score still counting: once the quota is full, a new result only moves the total if it beats that. Pick a player to see who they are and what their total is made of.',
                )}
              </p>
            </Panel>

            </>
          )}

          {race.length > 1 && (
            <Panel>
              <h2 className="text-sm font-semibold text-white">{t('Who has been ahead')}</h2>
              <p className="mt-0.5 max-w-2xl text-xs text-slate-500">
                {t(
                  'Points down the season, one line each. The table says who leads; this says who has led, when it changed hands, and whether the gap is closing. A line holds flat until the night it moved, because that is when it moved.',
                )}
              </p>
              <div className="mt-4">
                <RaceChart steps={race} roster={ROSTER} />
              </div>
            </Panel>
          )}

          <Panel>
            <h2 className="text-sm font-semibold text-white">{t('What has been entered')}</h2>
            <p className="mt-0.5 max-w-2xl text-xs text-slate-500">
              {t(
                'Every result in this period, newest entry first. Results are handed over and written down rather than submitted through the app, so this is the record of what has been counted and when it turned up.',
              )}
            </p>
            {entered.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                {t('Nothing entered for this period yet.')}
              </p>
            ) : (
              <>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-left text-[11px] uppercase tracking-wide text-slate-500">
                        <th className="pb-2 font-medium">{t('Entered')}</th>
                        <th className="pb-2 pl-3 font-medium">{t('Player')}</th>
                        <th className="pb-2 pl-3 font-medium">{t('Date')}</th>
                        <th className="pb-2 pl-3 font-medium">{t('Event')}</th>
                        <th className="pb-2 pl-3 text-right font-medium">{t('Entries')}</th>
                        <th className="pb-2 pl-3 text-right font-medium">{t('Place')}</th>
                        <th className="pb-2 pl-3 text-right font-medium">{t('Buy-in')}</th>
                        <th className="pb-2 pl-3 text-right font-medium">{t('Cashed')}</th>
                        <th className="pb-2 pl-3 text-right font-medium">{t('Score')}</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-300">
                      {entered.slice(0, shownEntries).map(({ result, score: value, counts }) => (
                        <tr key={result.id} className="border-b border-slate-800/60 last:border-0">
                          <td className="py-1.5 tabular-nums text-slate-500">
                            {result.added ?? '—'}
                          </td>
                          <td className="py-1.5 pl-3 font-medium text-slate-100">{result.player}</td>
                          <td className="py-1.5 pl-3 tabular-nums text-slate-500">{result.date}</td>
                          <td className="py-1.5 pl-3">{result.event}</td>
                          <td className="py-1.5 pl-3 text-right tabular-nums">
                            {result.entrants.toLocaleString('en-US')}
                          </td>
                          <td className="py-1.5 pl-3 text-right tabular-nums">{result.place}</td>
                          <td className="py-1.5 pl-3 text-right tabular-nums text-slate-400">
                            ${result.buyIn}
                          </td>
                          <td className="py-1.5 pl-3 text-right tabular-nums text-slate-400">
                            {result.cashed > 0 ? `$${formatMoney(result.cashed)}` : '—'}
                          </td>
                          <td
                            className={`py-1.5 pl-3 text-right font-semibold tabular-nums ${
                              counts ? 'text-white' : 'text-slate-600 line-through'
                            }`}
                            title={
                              counts
                                ? undefined
                                : t('Outside the ${low}–${high} band, so it scores nothing.', {
                                    low: STAKE_FLOOR,
                                    high: STAKE_CEILING,
                                  })
                            }
                          >
                            {points(value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {entered.length > RECENT_ENTRIES && (
                  <button
                    type="button"
                    onClick={() => setAllEntries(!allEntries)}
                    className="mt-3 text-xs font-semibold text-indigo-400 transition-colors hover:text-indigo-300"
                  >
                    {allEntries
                      ? t('Show the last {n}', { n: RECENT_ENTRIES })
                      : t('Show all {n} entries', { n: entered.length })}
                  </button>
                )}
                <p className="mt-3 text-[11px] leading-relaxed text-slate-600">
                  {t(
                    'A struck-through score is a result outside the buy-in band: it is kept on the record, and it counts for nothing.',
                  )}
                </p>
              </>
            )}
          </Panel>

          {cutoffOn && view !== 'lastLonger' && (
            <Panel>
              <h2 className="text-sm font-semibold text-white">
                {t('What it takes tonight')}
              </h2>
              <p className="mt-0.5 max-w-2xl text-xs text-slate-500">
                {t(
                  'The standings are what everybody has. This is what it would take to change them: the score your next result has to beat, and how deep you have to run tonight to beat it. Nobody is playing for points once their quota is full — they are playing to evict their own worst score.',
                )}
              </p>
              <LocalOnlyBanner
                published={FEATURE_CUTOFF_PUBLISHED}
                variable={CUTOFF_VARIABLE}
                scope="panel"
                className="mt-3"
              />
              <div className="mt-4">
                <CutoffTargets
                  table={table}
                  format={format}
                  cards={CHALLENGE_PLAYERS}
                  onPick={pick}
                />
              </div>
            </Panel>
          )}

          <Panel>
            <h2 className="text-sm font-semibold text-white">{t('How a score is worked out')}</h2>
            <p className="mt-2 font-mono text-sm text-indigo-300">
              S = [ 100 × √(N / R) + 25 × (Bty / Bi) ] × ⁴√(Bi / {STAKE_FLOOR})
            </p>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-500">
              {t(
                'N is the number of entries, R is where you finished, Bty is the bounty money you collected and Bi is the buy-in. Finishing last in the field is worth 100, because N over R is one; everything above that is how far up you got, and the square root is what stops a win in a huge field being worth a hundred times a win in a small one.',
              )}
            </p>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-500">
              {t(
                'The last part is the stake. Only ${low} to ${high} buy-ins are in the challenge, and inside that band a dearer game is worth a little more — a fourth root, so the whole band is {spread}x end to end. Because finishing points go as the square root of the field, that is the same as finishing {deeper}x deeper — a ${high} result matches a ${low} one that got that much further up the field. A good night at the bottom of the band still beats an ordinary one at the top, which is the point.',
                {
                  low: STAKE_FLOOR,
                  high: STAKE_CEILING,
                  spread: stakeFactor(STAKE_CEILING).toFixed(2),
                  deeper: (stakeFactor(STAKE_CEILING) ** 2).toFixed(1),
                },
              )}
            </p>
            <div className="mt-5">
              <PointsTable />
            </div>
          </Panel>
        </div>

        <PlayerDialog
          player={open}
          standing={table.find((row) => row.player === open)}
          lastLonger={lastLongerOn ? lastLonger.find((row) => row.player === open) : undefined}
          showLastLonger={lastLongerOn}
          counted={working}
          payout={open ? paid.get(open) : undefined}
          prize={open ? (won.get(open) ?? 0) : undefined}
          cards={CHALLENGE_PLAYERS}
          format={format}
          columns={columns}
          nightColumns={llColumns}
          onClose={() => setOpen(null)}
        />

        <Footer />
        <DeployedViewSwitch />
      </div>
    </div>
  )
}

/** The three competitions, as the tabs name them. */
type ViewId = FormatId | 'lastLonger'

const VIEW_LABELS: Record<ViewId, string> = {
  monthly: 'Monthly',
  yearly: 'Yearly',
  lastLonger: 'Last Longer',
}

/** How many entries the history shows before it asks whether you want them all. */
const RECENT_ENTRIES = 15

/** How many nights the last longer shows before it asks whether you want them all. */
const RECENT_NIGHTS = 12

