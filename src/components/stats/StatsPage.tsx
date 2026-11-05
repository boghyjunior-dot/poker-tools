import { useEffect, useMemo, useState } from 'react'
import { BackToMenu } from '../BackToMenu'
import { Footer } from '../Footer'
import { SiteTag } from '../SiteTag'
import { formatMoney } from '../../lib/formatNumber'
import { useT } from '../../lib/i18n'
import { loadEntriesFromDb } from '../../lib/trackerStore'
import type { Entry } from '../../lib/tracker'
import {
  byBuyIn,
  byMonth,
  bySite,
  finishStats,
  isReadable,
  moneySplit,
  READABLE_SAMPLE,
  streaks,
  UNKNOWN_SITE,
  type Breakdown,
} from '../../lib/stats'

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
