import { useEffect, useMemo, useState } from 'react'
import { BackToMenu } from '../BackToMenu'
import { Footer } from '../Footer'
import { SiteTag } from '../SiteTag'
import { formatCompact, formatMoney } from '../../lib/formatNumber'
import { useT } from '../../lib/i18n'
import { loadEntriesFromDb } from '../../lib/trackerStore'
import type { Entry } from '../../lib/tracker'
import {
  byBuyIn,
  byMonth,
  bySite,
  concentration,
  finishStats,
  isReadable,
  moneySplit,
  READABLE_SAMPLE,
  rhythm,
  stakeSpread,
  streaks,
  UNKNOWN_SITE,
  type Breakdown,
} from '../../lib/stats'
import {
  byWeekday,
  profitCurve,
  returnBuckets,
  rollingRoi,
  ROLLING_MIN,
  rollingWindow,
} from '../../lib/statsSeries'
import {
  ProfitCurve,
  ReturnChart,
  RollingRoiChart,
  WeekdayChart,
  type CurveUnit,
} from './StatsCharts'

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-slate-800 bg-slate-900/60 p-5 ${className}`}>
      {children}
    </section>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const t = useT()
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{t(label)}</p>
      <p className="text-xl font-bold tabular-nums text-white">{value}</p>
      {hint && <p className="text-[10px] text-slate-500">{hint}</p>}
    </div>
  )
}

const money = (value: number) => `${value < 0 ? '−' : ''}$${formatMoney(Math.abs(value))}`

/**
 * A breakdown table.
 *
 * The count comes first and the ROI last, which is the opposite of how anyone
 * wants to read it and the right way round anyway: the ROI of eleven
 * tournaments is not a fact about your game, and putting the sample in front
 * of it is the only honest way to show both. Thin rows have their ROI dimmed
 * rather than hidden — you played them, they are yours to see.
 */
function BreakdownTable({
  rows,
  heading,
  blurb,
  tagged = false,
}: {
  rows: Breakdown[]
  heading: string
  blurb: string
  /** Draw the key as a room tag rather than as text. */
  tagged?: boolean
}) {
  const t = useT()
  if (rows.length === 0) return null

  return (
    <Panel>
      <h2 className="text-sm font-semibold text-white">{t(heading)}</h2>
      <p className="mt-0.5 text-xs text-slate-500">{t(blurb)}</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-[11px] uppercase tracking-wide text-slate-500">
              <th className="pb-2 font-medium">{t('Played')}</th>
              <th className="pb-2 font-medium" />
              <th className="pb-2 text-right font-medium">{t('Staked')}</th>
              <th className="pb-2 text-right font-medium">{t('Profit')}</th>
              <th className="pb-2 text-right font-medium">{t('ITM')}</th>
              <th className="pb-2 text-right font-medium">{t('ROI')}</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-slate-800/60 last:border-0">
                <td className="py-2 tabular-nums text-slate-400">{row.count}</td>
                <td className="py-2">
                  {tagged && row.key !== UNKNOWN_SITE ? (
                    <SiteTag site={row.key} />
                  ) : (
                    <span className="text-slate-200">{row.key}</span>
                  )}
                </td>
                <td className="py-2 text-right tabular-nums">${formatMoney(row.staked)}</td>
                <td
                  className={`py-2 text-right font-semibold tabular-nums ${
                    row.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {money(row.profit)}
                </td>
                <td className="py-2 text-right tabular-nums text-slate-400">
                  {row.itmPct.toFixed(1)}%
                </td>
                <td
                  className={`py-2 text-right font-semibold tabular-nums ${
                    isReadable(row)
                      ? row.roiPct >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                      : 'text-slate-600'
                  }`}
                  title={
                    isReadable(row)
                      ? undefined
                      : t('Too few tournaments for this to mean much yet.')
                  }
                >
                  {row.roiPct >= 0 ? '+' : ''}
                  {row.roiPct.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-slate-600">
        {t('A dimmed ROI has fewer than {n} tournaments behind it, which is not yet a number about your game.', {
          n: READABLE_SAMPLE,
        })}
      </p>
    </Panel>
  )
}

/**
 * The results log, read sideways.
 *
 * Everything here comes out of the same entries the Tracker holds; nothing is
 * stored, and there is nothing to keep in step. Open it, and it is whatever
 * the log says this minute.
 */
export function StatsPage() {
  const t = useT()
  const [entries, setEntries] = useState<Entry[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading')
  const [error, setError] = useState<string | null>(null)
  /**
   * Money or buy-ins on the curve.
   *
   * Money is what landed in the account and buy-ins is whether you played
   * well. They disagree exactly when the stakes moved, which is the one time
   * anybody needs to know.
   */
  const [unit, setUnit] = useState<CurveUnit>('money')

  useEffect(() => {
    let cancelled = false
    loadEntriesFromDb()
      .then((plan) => {
        if (cancelled) return
        setEntries(plan.records)
        setState('ready')
      })
      .catch((cause: unknown) => {
        if (cancelled) return
        setState('failed')
        setError(cause instanceof Error ? cause.message : String(cause))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const sites = useMemo(() => bySite(entries), [entries])
  const stakes = useMemo(() => byBuyIn(entries), [entries])
  const months = useMemo(() => byMonth(entries), [entries])
  const finishes = useMemo(() => finishStats(entries), [entries])
  const split = useMemo(() => moneySplit(entries), [entries])
  const runs = useMemo(() => streaks(entries), [entries])
  const curve = useMemo(() => profitCurve(entries), [entries])
  const paid = useMemo(() => concentration(entries), [entries])
  const returns = useMemo(() => returnBuckets(entries), [entries])
  const week = useMemo(() => byWeekday(entries), [entries])
  const pace = useMemo(() => rhythm(entries), [entries])
  const stakeSizes = useMemo(() => stakeSpread(entries), [entries])
  const rollWindow = rollingWindow(entries.length)
  const rolling = useMemo(() => rollingRoi(entries, rollWindow), [entries, rollWindow])

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="mx-auto w-full max-w-5xl">
        <BackToMenu className="mb-3" />
        <h1 className="text-3xl font-bold text-white">{t('Stats')}</h1>
        <p className="mb-6 max-w-2xl text-sm text-slate-400">
          {t(
            'Your results log cut several ways. One ROI for everything you have ever played hides the only questions worth asking: which stakes you are beating, which rooms are worth the hours, and whether this month looks like last.',
          )}
        </p>

        {state === 'failed' && (
          <Panel className="border-rose-900 bg-rose-950/30">
            <p className="text-sm text-rose-300">{t('Could not read the results: {reason}', { reason: error ?? '' })}</p>
          </Panel>
        )}

        {state === 'ready' && entries.length === 0 && (
          <Panel>
            <p className="text-sm text-slate-400">
              {t('Nothing logged yet. Results you add in the Bankroll Tracker, or bust out of on the Schedule, show up here.')}
            </p>
            <a
              href="./tracker.html"
              className="mt-3 inline-block rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              {t('Open the Bankroll Tracker')}
            </a>
          </Panel>
        )}

        {state === 'ready' && entries.length > 0 && (
          <div className="flex flex-col gap-4">
            <Panel>
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-white">{t('The curve')}</h2>
                  <p className="mt-0.5 max-w-xl text-xs text-slate-500">
                    {t('Every result in order. The red shading is how far under your previous best the roll was at the time, which is the part a single worst-drawdown figure flattens.')}
                  </p>
                </div>
                <div className="flex shrink-0 gap-0.5 rounded-md border border-slate-800 bg-slate-950/60 p-0.5">
                  {(['money', 'buyIns'] as CurveUnit[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setUnit(option)}
                      className={`rounded px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        unit === option
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {t(option === 'money' ? 'Money' : 'Buy-ins')}
                    </button>
                  ))}
                </div>
              </div>
              <ProfitCurve
                curve={curve}
                unit={unit}
                format={
                  unit === 'money'
                    ? (value) => `${value < 0 ? '−' : ''}${formatCompact(Math.abs(value))}`
                    : (value) => (Number.isInteger(value) ? String(value) : value.toFixed(1))
                }
              />
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                {unit === 'money'
                  ? t('{count} tournaments, {from} to {to}.', {
                      count: entries.length,
                      from: curve[0]?.date ?? '',
                      to: curve[curve.length - 1]?.date ?? '',
                    })
                  : t('Each result measured against its own buy-in, so the line is not pulled about by the stakes you happened to be playing. Up in buy-ins and down in money means the dearer ones were the losing ones.')}
              </p>
            </Panel>

            <Panel>
              <h2 className="mb-3 text-sm font-semibold text-white">
                {t('Which results paid for it')}
              </h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="Results that won" value={`${paid.winners} / ${entries.length}`} />
                <Stat label="Best single result" value={money(paid.best)} />
                <Stat
                  label="Without that one"
                  value={money(paid.withoutBest)}
                  hint={t('what the rest comes to')}
                />
                <Stat
                  label="Best 5% hold"
                  value={`${paid.topSharePct.toFixed(0)}%`}
                  hint={t('of everything you have won')}
                />
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                {paid.payingResults !== null
                  ? t('Your best {n} results pay for every losing one. The other {rest} are what it cost to reach them, and a bankroll has to survive the stretch before any of the {n} have happened.', {
                      n: paid.payingResults,
                      rest: entries.length - paid.payingResults,
                    })
                  : t('The winning results come to {won} against {lost} lost, so nothing is paying for anything yet. On a short MTT sample that is the normal state of affairs rather than a verdict.', {
                      won: money(paid.won),
                      lost: money(paid.lost),
                    })}
              </p>
            </Panel>

            <Panel>
              <h2 className="text-sm font-semibold text-white">{t('What a tournament returns')}</h2>
              <p className="mt-0.5 max-w-2xl text-xs text-slate-500">
                {t('Above: how many tournaments ended in each band. Below: what that band did to the roll. The two shapes never match, and the gap between them is the whole argument for volume.')}
              </p>
              <div className="mt-3">
                <ReturnChart buckets={returns} />
              </div>
            </Panel>

            {entries.length >= ROLLING_MIN && rolling.length > 1 && (
              <Panel>
                <h2 className="text-sm font-semibold text-white">{t('Form')}</h2>
                <p className="mt-0.5 max-w-2xl text-xs text-slate-500">
                  {t('ROI over a window of {n} tournaments, slid along the log.', {
                    n: rollWindow,
                  })}
                </p>
                <div className="mt-3">
                  <RollingRoiChart points={rolling} window={rollWindow} />
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                  {t('It crosses zero when a cash lands in the window or falls out of the back of it, which is not the same as something changing about your game. The level it keeps returning to is the part worth reading.')}
                </p>
              </Panel>
            )}

            <Panel>
              <h2 className="mb-3 text-sm font-semibold text-white">{t('Where the money came from')}</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="Cashes" value={money(split.cashed)} />
                <Stat label="Bounties" value={money(split.bounties)} />
                <Stat
                  label="Bounty share"
                  value={`${split.bountyPct.toFixed(1)}%`}
                  hint={t('of everything that came back')}
                />
                <Stat label="Tournaments" value={String(entries.length)} />
              </div>
              {split.bountyPct >= 40 && (
                <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                  {t('Most of what you win is heads rather than prize money, which is the schedule telling you that calling wider for the knockout is where your edge is.')}
                </p>
              )}
            </Panel>

            <Panel>
              <h2 className="mb-3 text-sm font-semibold text-white">{t('Runs')}</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Stat
                  label="Longest without a cash"
                  value={String(runs.withoutCash)}
                  hint={t('tournaments')}
                />
                <Stat
                  label="Longest losing run"
                  value={String(runs.losing)}
                  hint={t('a min-cash breaks it')}
                />
                <Stat
                  label="Since the last cash"
                  value={String(runs.sinceCash)}
                  hint={t('right now')}
                />
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                {t('The drawdown in the Tracker is money; these are patience. Knowing the dry spell you are in has happened before is the difference between a normal stretch and evidence that something is wrong.')}
              </p>
            </Panel>

            <Panel>
              <h2 className="text-sm font-semibold text-white">{t('The week')}</h2>
              <p className="mt-0.5 max-w-2xl text-xs text-slate-500">
                {t('Where the hours go, and what came of them. A Sunday that is a quarter of your volume and red costs far more than a red Tuesday you barely play.')}
              </p>
              <div className="mt-3">
                <WeekdayChart days={week} />
              </div>
            </Panel>

            <Panel>
              <h2 className="mb-3 text-sm font-semibold text-white">{t('Volume and stakes')}</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat
                  label="Days played"
                  value={String(pace.activeDays)}
                  hint={t('of {n} in the log', { n: pace.span })}
                />
                <Stat
                  label="On a day you play"
                  value={pace.perActiveDay.toFixed(1)}
                  hint={t('tournaments')}
                />
                <Stat
                  label="Busiest day"
                  value={String(pace.busiest?.count ?? 0)}
                  hint={pace.busiest?.date}
                />
                <Stat
                  label="Longest break"
                  value={String(pace.longestGap)}
                  hint={t('days with nothing')}
                />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="Average seat" value={money(stakeSizes.average)} />
                <Stat label="Median seat" value={money(stakeSizes.median)} />
                <Stat label="Biggest played" value={money(stakeSizes.biggest)} />
                <Stat
                  label="Dearest band"
                  value={`${stakeSizes.topBandPct.toFixed(1)}%`}
                  hint={stakeSizes.topBand}
                />
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                {stakeSizes.average > stakeSizes.median * 1.5
                  ? t('The average seat sits well above the median, which means a few shots are doing the talking. Those are the entries a bankroll rule has to cover even though they are a rounding error in the volume.')
                  : t('Average and median close together is a schedule you actually play, rather than one with the odd shot sitting on top of it.')}
              </p>
            </Panel>

            {finishes.recorded > 0 && (
              <Panel>
                <h2 className="mb-3 text-sm font-semibold text-white">{t('Finishes')}</h2>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Stat label="Best" value={`${finishes.best}`} />
                  <Stat label="Final tables" value={String(finishes.finalTables)} hint={t('9th or better')} />
                  <Stat label="Median place" value={`${finishes.medianPlace}`} />
                  <Stat
                    label="With a place"
                    value={`${finishes.recorded} / ${entries.length}`}
                  />
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                  {t('Counted over the results that carry a place. A field people fill in when they go deep is a biased sample, so read it as one — the median is there because a single deep run drags an average about.')}
                </p>
              </Panel>
            )}

            <BreakdownTable
              rows={sites}
              tagged
              heading="By room"
              blurb="Whether the hours are going to the right lobby."
            />
            <BreakdownTable
              rows={stakes}
              heading="By stake"
              blurb="The one that decides what you can move up to — and the one the Bankroll tool wants an honest ROI for."
            />
            <BreakdownTable
              rows={months}
              heading="By month"
              blurb="Form and volume, newest first."
            />
          </div>
        )}

        <Footer />
      </div>
    </div>
  )
}
