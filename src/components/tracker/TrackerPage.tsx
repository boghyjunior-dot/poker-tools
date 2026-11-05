import { useEffect, useMemo, useState } from 'react'
import { BackToMenu } from '../BackToMenu'
import {
  loadBankrollsFromDb,
  loadEntriesFromDb,
  saveBankrollsToDb,
  saveEntriesToDb,
} from '../../lib/trackerStore'
import type { LoadSource } from '../../lib/persisted'
import { SiteSelect, SiteTag } from '../SiteTag'
import { siteOptions, UNKNOWN_SITE } from '../../lib/sites'
import {
  amountFor,
  bankrollFields,
  setAmount,
  siteRolls,
  startingTotal,
  underwater,
  type SiteBankroll,
} from '../../lib/siteBankrolls'
import { Footer } from '../Footer'
import { formatMoney } from '../../lib/formatNumber'
import { useT } from '../../lib/i18n'
import {
  buildViews,
  confidenceFromCount,
  CONFIDENCE_NOTE,
  newEntryId,
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
  // Empty until the database answers. Nothing saves before then — see the
  // guard on the effect below.
  const [entries, setEntries] = useState<Entry[]>([])
  const [ready, setReady] = useState(false)
  /** Set when the database refuses, so the page can stop pretending. */
  const [dbError, setDbError] = useState<string | null>(null)
  /** Set when the database keeps fewer rows than it was handed. */
  const [mismatch, setMismatch] = useState<{ sent: number; stored: number } | null>(null)
  /** What the database actually holds, read back after each save. */
  const [storage, setStorage] = useState<{ kind: LoadSource | 'saved'; count: number } | null>(
    null,
  )
  /**
   * What is in each room's box, as typed.
   *
   * Text rather than numbers because a half-typed "21." is not a number yet,
   * and parsing on every keystroke eats the decimal point as you reach for it.
   */
  const [startText, setStartText] = useState<Record<string, string>>({})
  /** False until the stored bankrolls have been read — same guard as the log. */
  const [rollsReady, setRollsReady] = useState(false)
  /** Set when the migrated single bankroll is still sitting unsplit. */
  const [movedStart, setMovedStart] = useState(false)

  const [draft, setDraft] = useState({
    date: today(),
    name: '',
    site: '',
    buyIn: '',
    cashed: '',
    bounties: '',
    position: '',
  })

  // One read on mount: the database, or the localStorage log moved across
  // from before this app had one.
  useEffect(() => {
    let cancelled = false
    loadEntriesFromDb()
      .then((plan) => {
        if (cancelled) return
        setEntries(plan.records)
        setReady(true)
        setStorage({ kind: plan.source, count: plan.records.length })
        if (plan.writeBack) void saveEntriesToDb(plan.records)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setReady(true)
        setDbError(error instanceof Error ? error.message : String(error))
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Not before the load has returned: the first save would otherwise be the
  // empty array above, written over a year of results.
  useEffect(() => {
    if (!ready) return
    saveEntriesToDb(entries)
      .then((stored) => {
        setDbError(null)
        // The count the database gives back, not the one we hoped for: a
        // browser that accepts writes and keeps nothing says so right here.
        setStorage({ kind: 'saved', count: stored })
        setMismatch(stored === entries.length ? null : { sent: entries.length, stored })
      })
      .catch((error: unknown) =>
        setDbError(error instanceof Error ? error.message : String(error)),
      )
  }, [entries, ready])

  // The bankrolls, read once, same order as the log: read, then allow saving.
  useEffect(() => {
    let cancelled = false
    loadBankrollsFromDb()
      .then((plan) => {
        if (cancelled) return
        setStartText(
          Object.fromEntries(plan.records.map((roll) => [roll.id, String(roll.amount)])),
        )
        setMovedStart(plan.source === 'migrated')
        setRollsReady(true)
        if (plan.writeBack) void saveBankrollsToDb(plan.records)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setRollsReady(true)
        setDbError(error instanceof Error ? error.message : String(error))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const rolls = useMemo<SiteBankroll[]>(() => {
    let out: SiteBankroll[] = []
    for (const [site, value] of Object.entries(startText)) {
      out = setAmount(out, site, Math.max(0, Number(value) || 0))
    }
    return out
  }, [startText])

  useEffect(() => {
    if (!rollsReady) return
    saveBankrollsToDb(rolls).catch((error: unknown) =>
      setDbError(error instanceof Error ? error.message : String(error)),
    )
  }, [rolls, rollsReady])

  const startingBankroll = startingTotal(rolls)
  const views = useMemo(() => buildViews(entries, startingBankroll), [entries, startingBankroll])
  const rooms = useMemo(() => bankrollFields(entries, rolls), [entries, rolls])
  const accounts = useMemo(() => siteRolls(entries, rolls), [entries, rolls])
  const overdrawn = useMemo(() => underwater(accounts), [accounts])
  const byRoom = useMemo(
    () => new Map(accounts.map((account) => [account.site, account])),
    [accounts],
  )
  const totals = useMemo(() => summarise(views), [views])
  const confidence = confidenceFromCount(totals.count)

  const num = (value: string) => Math.max(0, Number(value) || 0)

  const add = () => {
    if (draft.buyIn.trim() === '' && draft.cashed.trim() === '') {
      // It used to return without a word, which reads exactly like a result
      // that was logged and then lost.
      setDbError(t('Give it a buy-in or a cash amount, so there is a result to log.'))
      return
    }
    setDbError(null)
    setEntries((prev) => [
      ...prev,
      {
        id: newEntryId(),
        date: draft.date || today(),
        name: draft.name.trim() || t('Untitled'),
        site: draft.site.trim(),
        buyIn: num(draft.buyIn),
        fee: 0,
        cashed: num(draft.cashed),
        bounties: num(draft.bounties),
        position: num(draft.position) > 0 ? Math.floor(num(draft.position)) : undefined,
      },
    ])
    setDraft((prev) => ({ ...prev, name: '', buyIn: '', cashed: '', bounties: '', position: '' }))
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


        <div className="flex flex-col gap-4">
          <Panel>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Stat
                label={t('Bankroll')}
                value={`$${formatMoney(startingBankroll + totals.profit)}`}
                sub={
                  rolls.length > 1
                    ? t('from ${amount} across {n} rooms', {
                        amount: formatMoney(startingBankroll),
                        n: rolls.length,
                      })
                    : t('from ${amount}', { amount: formatMoney(startingBankroll) })
                }
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

          <Panel>
            <h2 className="text-sm font-semibold text-white">{t('Money by room')}</h2>
            <p className="mt-0.5 max-w-2xl text-xs text-slate-500">
              {t(
                'Each room is its own account, and $40 on one of them will not buy a seat on another. Put what you keep in each one here; everything above is the lot added together.',
              )}
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="pb-2 font-medium">{t('Room')}</th>
                    <th className="pb-2 font-medium">{t('Started with')}</th>
                    <th className="pb-2 text-right font-medium">{t('Played')}</th>
                    <th className="pb-2 text-right font-medium">{t('Profit')}</th>
                    <th className="pb-2 text-right font-medium">{t('On the account')}</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  {rooms.map((room) => {
                    const account = byRoom.get(room)
                    const played = account?.count ?? 0
                    const funded = amountFor(rolls, room) > 0
                    return (
                      <tr key={room} className="border-b border-slate-800/60 last:border-0">
                        <td className="py-2">
                          {room === UNKNOWN_SITE ? (
                            <span className="text-slate-400">{t(room)}</span>
                          ) : (
                            <SiteTag site={room} />
                          )}
                        </td>
                        <td className="py-2">
                          <label className="flex items-center gap-1">
                            <span className="text-slate-600">$</span>
                            <input
                              type="number"
                              inputMode="decimal"
                              aria-label={t('Starting bankroll on {room}', { room })}
                              value={startText[room] ?? ''}
                              placeholder="0"
                              onChange={(event) =>
                                setStartText((prev) => ({ ...prev, [room]: event.target.value }))
                              }
                              className="w-24 rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1 text-sm tabular-nums text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            />
                          </label>
                        </td>
                        <td className="py-2 text-right tabular-nums text-slate-500">
                          {played || '—'}
                        </td>
                        <td
                          className={`py-2 text-right font-semibold tabular-nums ${
                            played === 0
                              ? 'text-slate-600'
                              : (account?.profit ?? 0) >= 0
                                ? 'text-emerald-400'
                                : 'text-red-400'
                          }`}
                        >
                          {played === 0
                            ? '—'
                            : `${(account?.profit ?? 0) >= 0 ? '+' : '-'}$${formatMoney(
                                Math.abs(account?.profit ?? 0),
                              )}`}
                        </td>
                        <td
                          className={`py-2 text-right font-semibold tabular-nums ${
                            (account?.balance ?? 0) < 0 ? 'text-rose-400' : 'text-white'
                          }`}
                        >
                          {played === 0 && !funded
                            ? '—'
                            : `${(account?.balance ?? 0) < 0 ? '-' : ''}$${formatMoney(
                                Math.abs(account?.balance ?? 0),
                              )}`}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {movedStart && (
              <p className="mt-3 rounded-md border border-amber-900/60 bg-amber-950/30 px-3 py-2 text-xs text-amber-300">
                {t(
                  'Your old starting bankroll had no room attached, so it is sitting under “No room” rather than being guessed at. Move it to the rooms you actually keep it on — the total does not change.',
                )}
              </p>
            )}

            {overdrawn.length > 0 && (
              <p className="mt-3 rounded-md border border-rose-900/60 bg-rose-950/30 px-3 py-2 text-xs text-rose-300">
                {t(
                  'More has been staked on {rooms} than was ever on the account, so money arrived there that this log does not know about — a deposit, a transfer in from another room, or results tagged with the wrong one. The combined total hides this completely.',
                  { rooms: overdrawn.map((account) => account.site).join(', ') },
                )}
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
              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider text-slate-500">
                  {t('Site')}
                </span>
                <SiteSelect
                  ariaLabel={t('Site')}
                  value={draft.site}
                  options={siteOptions(draft.site)}
                  onChange={(site) => setDraft((prev) => ({ ...prev, site }))}
                  className="w-full py-1.5"
                />
              </label>
              {field('buyIn', t('Buy-in'), '0')}
              {field('cashed', t('Cashed'), '0')}
              {field('bounties', t('Bounties'), '0')}
              {field('position', t('Place'), '—')}
            </div>
            {dbError && (
              <p className="mt-3 rounded-md border border-rose-900 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
                {dbError}
              </p>
            )}
            {mismatch && (
              <p className="mt-3 rounded-md border border-rose-900 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
                {t(
                  'Saved {sent} results but the database reports {stored}. This browser is not keeping them — check whether it is set to clear site data on exit, or whether this is a private window.',
                  mismatch,
                )}
              </p>
            )}
            {storage && !dbError && !mismatch && (
              <p className="mt-3 text-[11px] text-slate-600">
                {storage.kind === 'saved'
                  ? t('{n} saved in the database', { n: storage.count })
                  : storage.kind === 'database'
                    ? t('{n} loaded from the database', { n: storage.count })
                    : storage.kind === 'migrated'
                      ? t('{n} moved across from this browser\u2019s older storage', {
                          n: storage.count,
                        })
                      : t('Nothing stored yet.')}
              </p>
            )}
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
                    <th className="pb-2 font-medium">{t('Place')}</th>
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
                        <SiteTag site={view.site} className="ml-2" />
                      </td>
                      <td className="py-2 tabular-nums">${formatMoney(view.cost)}</td>
                      <td className="py-2 tabular-nums">
                        ${formatMoney(view.cashed + view.bounties)}
                      </td>
                      <td className="py-2 tabular-nums text-slate-500">
                        {view.position ?? '—'}
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
