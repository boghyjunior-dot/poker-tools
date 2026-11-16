/**
 * The MTT Challenge standings.
 *
 * Two tables off one set of results: best ten in a month, best fifty in a
 * year. The page shows the working everywhere it can — the cutoff each player
 * is defending, the scores a total is made of, and the arithmetic of a single
 * result — because a leaderboard people pay to enter is a thing they will
 * want to check rather than trust.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { BackToMenu } from '../BackToMenu'
import { Footer } from '../Footer'
import { LocalOnlyBanner } from '../LocalOnlyBanner'
import { CHALLENGE_VARIABLE, FEATURE_CHALLENGE_PUBLISHED } from '../../lib/featureFlags'
import { useT } from '../../lib/i18n'
import {
  DAILY_MAIN,
  FORMATS,
  bountyPoints,
  countedFor,
  finishPoints,
  SEASON,
  STAKE_CEILING,
  STAKE_FLOOR,
  eligible,
  inMonth,
  inYear,
  ineligible,
  lastLongerRounds,
  lastLongerStandings,
  openingMonth,
  pot,
  seasonMonths,
  seasonYears,
  score,
  stakeFactor,
  standings,
  type ChallengeResult,
  type FormatId,
} from '../../lib/leaderboard'
import { DEMO_PROFILES, buildChallengeLog } from '../../lib/leaderboardDemo'
import { PlayerProfiles } from './PlayerProfiles'
import { ScoreCalculator } from './ScoreCalculator'
import { SCORES_PANEL, pressable } from './pressable'

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
const DEMO_LOG = buildChallengeLog({
  seed: 2027,
  from: `${SEASON}-01-01`,
  days: 365,
})

export function LeaderboardPage() {
  const t = useT()
  const [formatId, setFormatId] = useState<FormatId>('monthly')
  const results: ChallengeResult[] = DEMO_LOG

  const months = useMemo(() => seasonMonths(results), [results])
  const years = useMemo(() => seasonYears(results), [results])
  // Opens on the newest month anybody has played, not on an empty December.
  const [month, setMonth] = useState(() => openingMonth(results))
  const [year, setYear] = useState(() => SEASON)
  const [open, setOpen] = useState<string | null>(null)
  const scores = useRef<HTMLDivElement>(null)

  /** Open a player's scores, or close them if they were already showing. */
  const pick = (player: string) => setOpen((current) => (current === player ? null : player))

  // Brought into view, because the cards that open it sit a long way below
  // it: a panel that appears off-screen reads as a click that did nothing.
  useEffect(() => {
    if (!open || !scores.current) return
    const still =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    scores.current.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' })
  }, [open])

  const format = FORMATS[formatId]
  const period = formatId === 'monthly' ? month : year
  const everything = useMemo(
    () => (formatId === 'monthly' ? inMonth(results, month) : inYear(results, year)),
    [results, formatId, month, year],
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
  const table = useMemo(() => standings(inPeriod, format), [inPeriod, format])
  const working = useMemo(
    () => (open ? countedFor(inPeriod, open, format) : []),
    [inPeriod, open, format],
  )
  const nights = useMemo(() => lastLongerRounds(inPeriod, DAILY_MAIN), [inPeriod])
  const lastLonger = useMemo(() => lastLongerStandings(inPeriod, DAILY_MAIN), [inPeriod])
  const [allNights, setAllNights] = useState(false)
  const shown = allNights ? nights : nights.slice(0, RECENT_NIGHTS)

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="mx-auto w-full max-w-5xl">
        <BackToMenu className="mb-3" />

        {/* The banner carries the name, so the heading says it only for a
            screen reader rather than printing it twice at full size. */}
        <h1 className="sr-only">
          {t('MTT Challenge')} {SEASON}
        </h1>
        <img
          src="./challenge/banner.webp"
          alt=""
          width={1473}
          height={737}
          decoding="async"
          className="mb-5 w-full rounded-xl border border-slate-800"
        />

        <p className="mb-5 max-w-2xl text-sm text-slate-400">
          <span className="font-semibold text-slate-200">{t('{season} season.', { season: SEASON })}</span>{' '}
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
                      {...pressable(() => pick(row.player), open === row.player)}
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
            <div ref={scores} id={SCORES_PANEL} className="scroll-mt-4">
              <Panel className="border-indigo-900/70">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-sm font-semibold text-white">
                    {t('{player} — the {n} scores counting', { player: open, n: working.length })}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setOpen(null)}
                    className="text-xs font-semibold text-slate-500 transition-colors hover:text-slate-300"
                  >
                    {t('Close')}
                  </button>
                </div>
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
            </div>
          )}

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
                        <th className="pb-2 text-right font-medium">{t('Points won')}</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-300">
                      {lastLonger.map((row) => (
                        <tr key={row.player} className="border-b border-slate-800/60 last:border-0">
                          <td
                            className={`py-2 tabular-nums ${
                              row.won > 0 && row.rank === 1 ? 'font-bold text-amber-300' : 'text-slate-500'
                            }`}
                          >
                            {row.rank}
                          </td>
                          <td className="py-2 font-medium text-slate-100">{row.player}</td>
                          <td className="py-2 text-right font-bold tabular-nums text-white">
                            {row.won}
                          </td>
                          <td className="py-2 pr-4 text-right tabular-nums text-slate-500">
                            {row.played}
                          </td>
                          <td className="py-2 pr-4 text-right tabular-nums text-slate-400">
                            {row.winPct.toFixed(0)}%
                          </td>
                          <td className="py-2 text-right tabular-nums text-slate-400">
                            {row.bestPlace ?? '—'}
                          </td>
                          <td className="py-2 text-right tabular-nums text-slate-400">
                            {points(row.pointsFromWins)}
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
                        <th className="pb-2 text-right font-medium">{t('Score')}</th>
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
                                  aria-expanded={open === winner}
                                  aria-controls={SCORES_PANEL}
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
                          <td className="py-1.5 text-right font-semibold tabular-nums text-white">
                            {points(night.score)}
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
                    'Position is where the winner finished in the Main itself, and the score is what that result was worth on the points formula — the last longer is its own competition, but the night still counts towards the tables above.',
                  )}
                </p>
              </>
            )}
          </Panel>

          <Panel>
            <h2 className="text-sm font-semibold text-white">{t('The field')}</h2>
            <p className="mt-0.5 max-w-2xl text-xs text-slate-500">
              {t(
                'Who you are chasing, and where they are in this period. Every figure here is the same one the table above shows — pick anybody to see the scores behind it.',
              )}
            </p>
            <div className="mt-4">
              <PlayerProfiles
                standings={table}
                lastLonger={lastLonger}
                cards={DEMO_PROFILES}
                format={format}
                open={open}
                onPick={pick}
              />
            </div>
          </Panel>

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
                'The last part is the stake. Only ${low} to ${high} buy-ins are in the challenge, and inside that band a dearer game is worth a little more — a fourth root, so the whole band is {spread}x end to end. Because finishing points go as the square root of the field, that is the same as finishing {deeper}x deeper: a ${high} result matches a ${low} one that got three and a half times further up. A good night at the bottom of the band still beats an ordinary one at the top, which is the point.',
                {
                  low: STAKE_FLOOR,
                  high: STAKE_CEILING,
                  spread: stakeFactor(STAKE_CEILING).toFixed(2),
                  deeper: (stakeFactor(STAKE_CEILING) ** 2).toFixed(1),
                },
              )}
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="pb-2 font-medium">{t('A night like this')}</th>
                    <th className="pb-2 pl-4 text-right font-medium">N</th>
                    <th className="pb-2 pl-4 text-right font-medium">R</th>
                    <th className="pb-2 pl-4 text-right font-medium">Bi</th>
                    <th className="pb-2 pl-4 text-right font-medium">Bty / Bi</th>
                    <th className="pb-2 pl-4 text-right font-medium">{t('Finish')}</th>
                    <th className="pb-2 pl-4 text-right font-medium">{t('Bounty')}</th>
                    <th className="pb-2 pl-4 text-right font-medium">{t('Stake')}</th>
                    <th className="pb-2 pl-4 text-right font-medium">{t('Score')}</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  {EXAMPLES.map((example) => (
                    <tr key={example.label} className="border-b border-slate-800/60 last:border-0">
                      <td className="py-1.5 text-slate-400">{t(example.label)}</td>
                      <td className="py-1.5 pl-4 text-right tabular-nums">
                        {example.entrants.toLocaleString('en-US')}
                      </td>
                      <td className="py-1.5 pl-4 text-right tabular-nums">{example.place}</td>
                      <td className="py-1.5 pl-4 text-right tabular-nums text-slate-400">
                        ${example.buyIn}
                      </td>
                      <td className="py-1.5 pl-4 text-right tabular-nums text-slate-500">
                        {(example.bounties / example.buyIn).toFixed(1)}
                      </td>
                      <td className="py-1.5 pl-4 text-right tabular-nums text-slate-400">
                        {points(finishPoints(example.entrants, example.place))}
                      </td>
                      <td className="py-1.5 pl-4 text-right tabular-nums text-slate-400">
                        {points(bountyPoints(example.bounties, example.buyIn))}
                      </td>
                      <td className="py-1.5 pl-4 text-right tabular-nums text-slate-500">
                        ×{stakeFactor(example.buyIn).toFixed(2)}
                      </td>
                      <td className="py-1.5 text-right font-semibold tabular-nums text-white">
                        {points(score({ ...example, id: example.label, player: '', date: '', event: '', site: '' }))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel>
            <h2 className="text-sm font-semibold text-white">{t('What would that be worth?')}</h2>
            <p className="mt-0.5 max-w-2xl text-xs text-slate-500">
              {t(
                'Put a result in and see what it scores. Useful before you play rather than after: whether the dearer game is worth it, and how deep you would have to go in the cheap one to match it.',
              )}
            </p>
            <div className="mt-4">
              <ScoreCalculator />
            </div>
          </Panel>
        </div>

        <Footer />
      </div>
    </div>
  )
}

/** How many nights the last longer shows before it asks whether you want them all. */
const RECENT_NIGHTS = 12

/** A few results worth knowing the price of. */
const EXAMPLES = [
  { label: 'Busting last in a 1,000-runner', entrants: 1000, place: 1000, buyIn: 5, bounties: 0 },
  { label: 'A min-cash, 150th of 1,000, at the bottom of the band', entrants: 1000, place: 150, buyIn: 5, bounties: 0 },
  { label: 'The same min-cash at the top of it', entrants: 1000, place: 150, buyIn: 60, bounties: 0 },
  { label: 'The same again, with ten buy-ins in heads', entrants: 1000, place: 150, buyIn: 60, bounties: 600 },
  { label: 'What a $5 player needs to match that bare min-cash', entrants: 1000, place: 43, buyIn: 5, bounties: 0 },
  { label: 'Final table, 7th of 1,000, in the Daily Main', entrants: 1000, place: 7, buyIn: 54, bounties: 0 },
  { label: 'Winning a 1,000-runner at $22', entrants: 1000, place: 1, buyIn: 22, bounties: 0 },
  { label: 'Winning a 10,000-runner at $60', entrants: 10_000, place: 1, buyIn: 60, bounties: 0 },
]
