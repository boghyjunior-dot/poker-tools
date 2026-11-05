import { useEffect, useState } from 'react'
import { BackToMenu } from '../BackToMenu'
import { Footer } from '../Footer'
import { formatMoney } from '../../lib/formatNumber'
import { useT } from '../../lib/i18n'
import {
  loadBankrollsFromDb,
  loadEntriesFromDb,
  saveBankrollsToDb,
  saveEntriesToDb,
} from '../../lib/trackerStore'
import { buildDemoLog, isDemo } from '../../lib/demoData'
import { amountFor, setAmount, startingTotal, type SiteBankroll } from '../../lib/siteBankrolls'
import { summarise, buildViews, type Entry } from '../../lib/tracker'

const today = () => new Date().toISOString().slice(0, 10)

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-slate-800 bg-slate-900/60 p-5 ${className}`}>
      {children}
    </section>
  )
}

/**
 * Fill the tools with a log that never happened, and take it out again.
 *
 * Its own page rather than a button on the Tracker, because a control that
 * invents a hundred and forty results does not belong beside the one that
 * logs a real one. Demo rows carry ids this app writes nowhere else, so
 * removing them is an exact operation on rows this page created, never a
 * guess at which of your results look made up.
 */
export function DemoPage() {
  const t = useT()
  const [entries, setEntries] = useState<Entry[]>([])
  const [rolls, setRolls] = useState<SiteBankroll[]>([])
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [said, setSaid] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([loadEntriesFromDb(), loadBankrollsFromDb()])
      .then(([log, money]) => {
        if (cancelled) return
        setEntries(log.records)
        setRolls(money.records)
        setReady(true)
      })
      .catch((cause: unknown) => {
        if (cancelled) return
        setReady(true)
        setError(cause instanceof Error ? cause.message : String(cause))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const demo = entries.filter(isDemo)
  const real = entries.filter((entry) => !isDemo(entry))
  const totals = summarise(buildViews(entries, startingTotal(rolls)))

  const fill = () => {
    setBusy(true)
    setError(null)
    // A new seed each press, so a second fill is a different six months.
    const log = buildDemoLog({ seed: Date.now() % 2147483647, today: today() })
    const next = [...entries, ...log.entries]

    // Only rooms with nothing in them: a figure you typed is yours, and a
    // demo button is not allowed to overwrite it.
    let money = rolls
    for (const roll of log.bankrolls) {
      if (amountFor(money, roll.id) === 0) money = setAmount(money, roll.id, roll.amount)
    }

    Promise.all([saveEntriesToDb(next), saveBankrollsToDb(money)])
      .then(([stored]) => {
        setEntries(next)
        setRolls(money)
        setSaid(
          t('Added {n} invented results. The database holds {stored}.', {
            n: log.entries.length,
            stored,
          }),
        )
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)))
      .finally(() => setBusy(false))
  }

  const clear = () => {
    setBusy(true)
    setError(null)
    saveEntriesToDb(real)
      .then((stored) => {
        setEntries(real)
        setSaid(
          t('Removed {n} invented results. The database holds {stored}.', {
            n: demo.length,
            stored,
          }),
        )
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)))
      .finally(() => setBusy(false))
  }

  const button = 'rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50'

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="mx-auto w-full max-w-3xl">
        <BackToMenu className="mb-3" />
        <h1 className="text-3xl font-bold text-white">{t('Demo data')}</h1>
        <p className="mb-6 max-w-2xl text-sm text-slate-400">
          {t(
            'Fills the Tracker and the Stats page with six months of tournaments that never happened, so there is something to look at. Every invented row is marked, and taking them out again touches only the rows this page wrote.',
          )}
        </p>

        <div className="flex flex-col gap-4">
          <Panel>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">
                  {t('Your results')}
                </p>
                <p className="text-xl font-bold tabular-nums text-white">{real.length}</p>
              </div>
              <div className="rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">
                  {t('Invented')}
                </p>
                <p className="text-xl font-bold tabular-nums text-amber-300">{demo.length}</p>
              </div>
              <div className="rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">
                  {t('Starting money')}
                </p>
                <p className="text-xl font-bold tabular-nums text-white">
                  ${formatMoney(startingTotal(rolls))}
                </p>
              </div>
            </div>

            {totals.count > 0 && (
              <p className="mt-3 text-[11px] text-slate-500">
                {t('{n} tournaments in all: {profit} at {roi} ROI, {itm} in the money.', {
                  n: totals.count,
                  profit: `${totals.profit >= 0 ? '+' : '-'}$${formatMoney(Math.abs(totals.profit))}`,
                  roi: `${totals.roiPct >= 0 ? '+' : ''}${totals.roiPct.toFixed(1)}%`,
                  itm: `${totals.itmPct.toFixed(1)}%`,
                })}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={fill}
                disabled={!ready || busy}
                className={`${button} bg-indigo-600 text-white hover:bg-indigo-500`}
              >
                {t('Fill with demo data')}
              </button>
              <button
                type="button"
                onClick={clear}
                disabled={!ready || busy || demo.length === 0}
                className={`${button} border border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700`}
              >
                {t('Remove the demo results')}
              </button>
            </div>

            <p className="mt-3 text-[11px] leading-relaxed text-slate-600">
              {t(
                'Neither button touches your own results. Removing the demo leaves the starting bankrolls where they are — they are five boxes in the Tracker, and clearing one you meant to keep would be the worse mistake.',
              )}
            </p>

            {error && (
              <p className="mt-3 rounded-md border border-rose-900 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
                {error}
              </p>
            )}
            {said && !error && (
              <p className="mt-3 rounded-md border border-emerald-900/60 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-300">
                {said}
              </p>
            )}
          </Panel>

          <Panel>
            <h2 className="text-sm font-semibold text-white">{t('What it invents')}</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-400">
              <li>{t('140 tournaments over the last six months, weighted towards weekends.')}</li>
              <li>{t('All five rooms, with one of them played far more than the others.')}</li>
              <li>
                {t('Buy-ins on a real ladder from $1.50 to $215, mostly at the bottom of it.')}
              </li>
              <li>
                {t(
                  'A cash about one time in eight, mostly min-cashes, with the profit living in a handful of deep runs.',
                )}
              </li>
              <li>{t('Bounties on roughly two tournaments in three.')}</li>
              <li>
                {t(
                  'Finishing places written down only sometimes, which is the bias the Stats page warns you about.',
                )}
              </li>
            </ul>
            <p className="mt-3 text-[11px] text-slate-600">
              {t('A different six months every time you press it.')}
            </p>
          </Panel>
        </div>

        <Footer />
      </div>
    </div>
  )
}
