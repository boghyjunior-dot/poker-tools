import { useEffect, useMemo, useState } from 'react'
import { BackToMenu } from '../BackToMenu'
import { Footer } from '../Footer'
import { formatMoney } from '../../lib/formatNumber'
import { FEATURE_SESSION_PUBLISHED, SESSION_VARIABLE } from '../../lib/featureFlags'
import { LocalOnlyBanner } from '../LocalOnlyBanner'
import { useT } from '../../lib/i18n'
import {
  BANKROLL_KEY,
  buildViews,
  confidenceFromCount,
  CONFIDENCE_NOTE,
  loadEntries,
  newEntryId,
  saveEntries,
  summarise,
  toCsv,
  type Entry,
  type EntryView,
} from '../../lib/tracker'

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-slate-800 bg-slate-900/60 p-5 ${className}`}>
      {children}
    </section>
  )
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub?: string
  tone?: 'good' | 'bad'
}) {
  const colour = tone === 'good' ? 'text-emerald-400' : tone === 'bad' ? 'text-red-400' : 'text-white'
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold tabular-nums ${colour}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
    </div>
  )
}

const CHART_W = 640
const CHART_H = 160
const PAD = { left: 8, right: 8, top: 10, bottom: 10 }

/** The running bankroll as a line, with break-even marked. */
function BalanceChart({ views, start }: { views: EntryView[]; start: number }) {
  const t = useT()
  if (views.length < 2) return null

  const balances = [start, ...views.map((view) => view.balance)]
  const min = Math.min(...balances)
  const max = Math.max(...balances)
  const span = max - min || 1

  const x = (index: number) =>
    PAD.left + (index / (balances.length - 1)) * (CHART_W - PAD.left - PAD.right)
  const y = (value: number) =>
    CHART_H - PAD.bottom - ((value - min) / span) * (CHART_H - PAD.top - PAD.bottom)

  const line = balances.map((value, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(value)}`).join(' ')
  const area = `${line} L ${x(balances.length - 1)} ${CHART_H - PAD.bottom} L ${x(0)} ${CHART_H - PAD.bottom} Z`
  const up = balances[balances.length - 1] >= start

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="h-auto w-full"
      role="img"
      aria-label={t('Bankroll over time')}
    >
      {start >= min && start <= max && (
        <line
          x1={PAD.left}
          x2={CHART_W - PAD.right}
          y1={y(start)}
          y2={y(start)}
          stroke="#334155"
          strokeDasharray="4 4"
        />
      )}
      <path d={area} fill={up ? '#22c55e18' : '#ef444418'} />
      <path d={line} fill="none" stroke={up ? '#22c55e' : '#ef4444'} strokeWidth="2" />
    </svg>
  )
}

const today = () => new Date().toISOString().slice(0, 10)

export function TrackerPage() {
  const t = useT()
  const [entries, setEntries] = useState<Entry[]>(() => loadEntries())
  const [start, setStart] = useState<string>(() => {
    if (typeof localStorage === 'undefined') return '0'
    try {
      return localStorage.getItem(BANKROLL_KEY) ?? '0'
    } catch {
      return '0'
    }
  })

  const [draft, setDraft] = useState({
    date: today(),
    name: '',
    site: '',
    buyIn: '',
    fee: '',
    cashed: '',
    bounties: '',
  })

  useEffect(() => {
    saveEntries(entries)
  }, [entries])

  useEffect(() => {
    try {
      localStorage.setItem(BANKROLL_KEY, start)
    } catch {
      // Private mode — the log still works for this session.
    }
  }, [start])

  const startingBankroll = Number(start) || 0
  const views = useMemo(() => buildViews(entries, startingBankroll), [entries, startingBankroll])
  const totals = useMemo(() => summarise(views), [views])
  const confidence = confidenceFromCount(totals.count)

  const num = (value: string) => Math.max(0, Number(value) || 0)

  const add = () => {
    if (draft.buyIn.trim() === '' && draft.cashed.trim() === '') return
    setEntries((prev) => [
      ...prev,
      {
        id: newEntryId(),
        date: draft.date || today(),
        name: draft.name.trim() || t('Untitled'),
        site: draft.site.trim(),
        buyIn: num(draft.buyIn),
        fee: num(draft.fee),
        cashed: num(draft.cashed),
        bounties: num(draft.bounties),
      },
    ])
    setDraft((prev) => ({ ...prev, name: '', buyIn: '', fee: '', cashed: '', bounties: '' }))
  }

  const exportCsv = () => {
    const blob = new Blob([toCsv(views)], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `poker-results-${today()}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const field = (key: keyof typeof draft, label: string, placeholder = '') => (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
      <input
        value={draft[key]}
        onChange={(event) => setDraft((prev) => ({ ...prev, [key]: event.target.value }))}
        onKeyDown={(event) => {
          if (event.key === 'Enter') add()
        }}
        placeholder={placeholder}
        type={key === 'date' ? 'date' : key === 'name' || key === 'site' ? 'text' : 'number'}
        className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
      />
    </label>
  )

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="mx-auto w-full max-w-5xl">
        <BackToMenu className="mb-3" />
        <h1 className="text-3xl font-bold text-white">{t('Bankroll Tracker')}</h1>
        <p className="mb-6 max-w-2xl text-sm text-slate-400">
          {t(
            'Log every tournament and the numbers follow: profit, ROI, ITM and the worst run your roll has been through. This is where the ROI the other tools ask for should come from.',
          )}
        </p>

        <LocalOnlyBanner published={FEATURE_SESSION_PUBLISHED} variable={SESSION_VARIABLE} />

        <div className="flex flex-col gap-4">
          <Panel>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Stat
                label={t('Bankroll')}
                value={`$${formatMoney(startingBankroll + totals.profit)}`}
                sub={t('from ${amount}', { amount: formatMoney(startingBankroll) })}
                tone={totals.profit >= 0 ? 'good' : 'bad'}
              />
              <Stat
                label={t('Profit')}
                value={`${totals.profit >= 0 ? '+' : '-'}$${formatMoney(Math.abs(totals.profit))}`}
                tone={totals.profit >= 0 ? 'good' : 'bad'}
              />
              <Stat
                label={t('ROI')}
                value={`${totals.roiPct >= 0 ? '+' : ''}${totals.roiPct.toFixed(1)}%`}
                sub={t('on ${amount} staked', { amount: formatMoney(totals.staked) })}
                tone={totals.roiPct >= 0 ? 'good' : 'bad'}
              />
              <Stat
                label={t('ITM')}
                value={`${totals.itmPct.toFixed(1)}%`}
                sub={t('{n} of {total}', { n: totals.itmCount, total: totals.count })}
              />
              <Stat
                label={t('Worst downswing')}
                value={`$${formatMoney(totals.worstDrawdown)}`}
                sub={t('peak to trough')}
              />
              <Stat
                label={t('Average buy-in')}
                value={`$${formatMoney(totals.averageBuyIn)}`}
                sub={t('best ${amount}', { amount: formatMoney(Math.max(0, totals.bestResult)) })}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider text-slate-500">
                  {t('Starting bankroll')}
                </span>
                <input
                  type="number"
                  value={start}
                  onChange={(event) => setStart(event.target.value)}
                  className="w-32 rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </label>
              {totals.count > 0 && (
                <button
                  type="button"
                  onClick={exportCsv}
                  className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700"
                >
                  {t('Export CSV')}
                </button>
              )}
            </div>

            {totals.count > 0 && (
              <p
                className={`mt-3 rounded-md border p-3 text-xs ${
                  confidence === 'noise'
                    ? 'border-red-900/60 bg-red-950/30 text-red-300'
                    : confidence === 'thin'
                      ? 'border-amber-900/60 bg-amber-950/30 text-amber-300'
                      : 'border-slate-800 bg-slate-950/40 text-slate-400'
                }`}
              >
                {t(CONFIDENCE_NOTE[confidence])}
              </p>
            )}
          </Panel>

          {views.length >= 2 && (
            <Panel>
              <h2 className="mb-2 text-sm font-semibold text-white">{t('Bankroll over time')}</h2>
              <BalanceChart views={views} start={startingBankroll} />
            </Panel>
          )}

          <Panel>
            <h2 className="mb-3 text-sm font-semibold text-white">{t('Log a tournament')}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {field('date', t('Date'))}
              {field('name', t('Name'), t('Nightly'))}
              {field('site', t('Site'))}
              {field('buyIn', t('Buy-in'), '0')}
              {field('fee', t('Fee'), '0')}
              {field('cashed', t('Cashed'), '0')}
              {field('bounties', t('Bounties'), '0')}
            </div>
            <button
              type="button"
              onClick={add}
              className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              {t('Add result')}
            </button>
          </Panel>

          {views.length > 0 && (
            <Panel className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="pb-2 font-medium">{t('Date')}</th>
                    <th className="pb-2 font-medium">{t('Tournament')}</th>
                    <th className="pb-2 font-medium">{t('Cost')}</th>
                    <th className="pb-2 font-medium">{t('Back')}</th>
                    <th className="pb-2 font-medium">{t('Profit')}</th>
                    <th className="pb-2 font-medium">{t('Bankroll')}</th>
                    <th className="pb-2 font-medium" />
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  {[...views].reverse().map((view) => (
                    <tr key={view.id} className="border-b border-slate-800/60 last:border-0">
                      <td className="py-2 tabular-nums text-slate-500">{view.date}</td>
                      <td className="py-2 text-white">
                        {view.name}
                        {view.site && <span className="ml-2 text-xs text-slate-500">{view.site}</span>}
                      </td>
                      <td className="py-2 tabular-nums">${formatMoney(view.cost)}</td>
                      <td className="py-2 tabular-nums">
                        ${formatMoney(view.cashed + view.bounties)}
                      </td>
                      <td
                        className={`py-2 tabular-nums font-semibold ${
                          view.profit >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {view.profit >= 0 ? '+' : '-'}${formatMoney(Math.abs(view.profit))}
                      </td>
                      <td className="py-2 tabular-nums text-slate-400">
                        ${formatMoney(view.balance)}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          onClick={() => setEntries((prev) => prev.filter((e) => e.id !== view.id))}
                          aria-label={t('Remove')}
                          className="rounded px-2 text-slate-600 transition-colors hover:text-rose-400"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          )}
        </div>

        <Footer />
      </div>
    </div>
  )
}
