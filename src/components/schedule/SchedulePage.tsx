import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BackToMenu } from '../BackToMenu'
import { Footer } from '../Footer'
import { formatMoney } from '../../lib/formatNumber'
import { FEATURE_SESSION_PUBLISHED, SESSION_VARIABLE } from '../../lib/featureFlags'
import { LocalOnlyBanner } from '../LocalOnlyBanner'
import { useT } from '../../lib/i18n'
import {
  committed,
  committedBySite,
  dueAlarms,
  filterBySite,
  fromJson,
  formatCountdown,
  loadSchedule,
  newTournamentId,
  parseScheduleText,
  saveSchedule,
  SITES,
  sitesInUse,
  sortByUrgency,
  toJson,
  viewTournament,
  type Tournament,
} from '../../lib/schedule'

const MINUTE = 60_000

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-slate-800 bg-slate-900/60 p-5 ${className}`}>
      {children}
    </section>
  )
}

const STATUS_STYLE = {
  scheduled: { chip: 'bg-slate-800 text-slate-300', row: 'border-slate-800' },
  lateReg: { chip: 'bg-amber-900/60 text-amber-300', row: 'border-amber-900/50' },
  closed: { chip: 'bg-slate-900 text-slate-600', row: 'border-slate-900' },
} as const

/** A short beep, for when notifications are blocked or the tab is in front. */
function beep() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.62)
    osc.onended = () => void ctx.close()
  } catch {
    // No audio available — the on-screen banner still fires.
  }
}

function localInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function SchedulePage() {
  const t = useT()
  const [tournaments, setTournaments] = useState<Tournament[]>(() => loadSchedule())
  // A ticking clock is what makes every countdown on the page live.
  const [now, setNow] = useState(() => Date.now())
  const [ringing, setRinging] = useState<Set<string>>(() => new Set())
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  )
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [note, setNote] = useState<string | null>(null)
  const [pasteSite, setPasteSite] = useState('')
  const [siteFilter, setSiteFilter] = useState<Set<string>>(() => new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Alarms are checked inside the tick rather than in an effect on the
  // countdowns: an effect that reacts to a clock updating once a second is a
  // render loop waiting to happen, and the ids already announced are bookkeeping
  // rather than something the page draws.
  const scheduleRef = useRef(tournaments)
  const firedRef = useRef<Set<string>>(new Set())
  const translateRef = useRef(t)

  useEffect(() => {
    scheduleRef.current = tournaments
    translateRef.current = t
  }, [tournaments, t])

  useEffect(() => {
    const id = window.setInterval(() => {
      const tick = Date.now()
      setNow(tick)

      const current = scheduleRef.current.map((item) => viewTournament(item, tick))
      const due = dueAlarms(current, firedRef.current)
      if (due.length === 0) return

      for (const view of due) firedRef.current.add(view.id)
      setRinging((prev) => {
        const next = new Set(prev)
        for (const view of due) next.add(view.id)
        return next
      })

      beep()
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const translate = translateRef.current
        for (const view of due) {
          new Notification(translate('Late reg closing'), {
            body: translate('{name} — {time} left', {
              name: view.name,
              time: formatCountdown(view.msToLateRegClose),
            }),
            tag: view.id,
          })
        }
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    saveSchedule(tournaments)
  }, [tournaments])

  const views = useMemo(
    () => sortByUrgency(tournaments.map((item) => viewTournament(item, now))),
    [tournaments, now],
  )

  const update = useCallback((id: string, patch: Partial<Tournament>) => {
    setTournaments((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }, [])

  const addBlank = () => {
    const startsAt = new Date(Date.now() + 30 * MINUTE)
    startsAt.setSeconds(0, 0)
    setTournaments((prev) => [
      ...prev,
      {
        id: newTournamentId(),
        name: '',
        site: '',
        startsAt: startsAt.toISOString(),
        buyIn: 0,
        lateRegMinutes: 90,
        registered: true,
        alarmMinutes: 10,
      },
    ])
  }

  const applyPaste = () => {
    const { tournaments: parsed, errors } = parseScheduleText(pasteText, { site: pasteSite })
    if (parsed.length === 0) {
      setNote(errors[0] ?? t('Nothing to read.'))
      return
    }
    setTournaments((prev) => [...prev, ...parsed])
    setPasteOpen(false)
    setPasteText('')
    setNote(
      t('Added {n} tournaments{skipped}.', {
        n: parsed.length,
        skipped: errors.length > 0 ? t(' · skipped {n} lines', { n: errors.length }) : '',
      }),
    )
  }

  const askPermission = async () => {
    if (typeof Notification === 'undefined') return
    setPermission(await Notification.requestPermission())
  }

  // Looked up fresh each tick, so a banner that is still open keeps counting
  // down, and a tournament that closes drops out of it by itself.
  const ringingViews = views.filter((view) => ringing.has(view.id) && view.status !== 'closed')

  const rooms = sitesInUse(tournaments)
  const shown = filterBySite(views, siteFilter)
  const perSite = committedBySite(views)

  const toggleSite = (site: string) =>
    setSiteFilter((prev) => {
      const next = new Set(prev)
      if (next.has(site)) next.delete(site)
      else next.add(site)
      return next
    })

  const exportJson = () => {
    const blob = new Blob([toJson(tournaments)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `poker-schedule-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const importJson = async (file: File) => {
    const { tournaments: imported, error } = fromJson(await file.text())
    if (error) {
      setNote(t(error))
      return
    }
    setTournaments((prev) => [...prev, ...imported])
    setNote(t('Imported {n} tournaments.', { n: imported.length }))
  }

  const staked = committed(views)
  const live = views.filter((view) => view.status === 'lateReg' && view.registered)

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="mx-auto w-full max-w-5xl">
        <BackToMenu className="mb-3" />
        <h1 className="text-3xl font-bold text-white">{t('Schedule')}</h1>
        <p className="mb-6 max-w-2xl text-sm text-slate-400">
          {t(
            'What you are registered for, what is still open, and how long you have left to get in. Alarms fire while this tab is open.',
          )}
        </p>

        <LocalOnlyBanner published={FEATURE_SESSION_PUBLISHED} variable={SESSION_VARIABLE} />

        {ringingViews.length > 0 && (
          <div className="mb-4 rounded-lg border border-amber-700 bg-amber-950/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-amber-200">{t('Late reg closing')}</p>
                <ul className="mt-1 space-y-0.5">
                  {ringingViews.map((view) => (
                    <li key={view.id} className="text-sm text-amber-100">
                      {view.name || t('Untitled')} —{' '}
                      <span className="font-semibold tabular-nums">
                        {formatCountdown(view.msToLateRegClose)}
                      </span>{' '}
                      {t('left')}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={() => setRinging(new Set())}
                className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-600"
              >
                {t('Dismiss')}
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">
                    {t('Registered and open')}
                  </p>
                  <p className="text-2xl font-bold tabular-nums text-white">{live.length}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">
                    {t('Committed')}
                  </p>
                  <p className="text-2xl font-bold tabular-nums text-white">
                    ${formatMoney(staked)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">
                    {t('Local time')}
                  </p>
                  <p className="text-2xl font-bold tabular-nums text-white">
                    {new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={addBlank}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500"
                >
                  {t('Add tournament')}
                </button>
                <button
                  type="button"
                  onClick={() => setPasteOpen((prev) => !prev)}
                  className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700"
                >
                  {t('Paste a lobby')}
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700"
                >
                  {t('Import JSON')}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(event) => {
                    const picked = event.target.files?.[0]
                    if (picked) void importJson(picked)
                    event.target.value = ''
                  }}
                />
                {tournaments.length > 0 && (
                  <button
                    type="button"
                    onClick={exportJson}
                    className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700"
                  >
                    {t('Export JSON')}
                  </button>
                )}
                {permission !== 'granted' && permission !== 'unsupported' && (
                  <button
                    type="button"
                    onClick={() => void askPermission()}
                    className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700"
                  >
                    {t('Enable notifications')}
                  </button>
                )}
              </div>
            </div>

            {note && <p className="mt-3 text-xs text-slate-400">{note}</p>}

            <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
              {permission === 'unsupported'
                ? t('This browser has no notifications, so alarms appear on the page and beep.')
                : permission === 'granted'
                  ? t('Alarms show a notification and beep. They only fire while this tab is open.')
                  : t('Without notification permission, alarms still appear on this page and beep.')}
            </p>

            {pasteOpen && (
              <div className="mt-3 space-y-2 rounded-md border border-slate-800 bg-slate-950/40 p-3">
                <textarea
                  value={pasteText}
                  onChange={(event) => setPasteText(event.target.value)}
                  rows={5}
                  placeholder={'20:15  $22  Bounty Hunter  90m\n21:00 | $5.50 | Micro Millions | late 120'}
                  className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-[11px] text-slate-500">{t('These lines are from')}</label>
                  <input
                    list="schedule-sites"
                    value={pasteSite}
                    onChange={(event) => setPasteSite(event.target.value)}
                    placeholder={t('Room')}
                    className="w-36 rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                  <button
                    type="button"
                    onClick={applyPaste}
                    className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500"
                  >
                    {t('Read the lines')}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  {t('One tournament per line: a start time, a buy-in with a currency symbol, a name, and the late-reg window.')}
                </p>
              </div>
            )}
          </Panel>

          {(perSite.length > 1 || rooms.length > 1) && (
            <Panel>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                {perSite.length > 1 && (
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">
                      {t('Committed by room')}
                    </span>
                    {perSite.map((row) => (
                      <span key={row.site} className="text-sm text-slate-300">
                        {row.site}{' '}
                        <span className="font-semibold tabular-nums text-white">
                          ${formatMoney(row.amount)}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
                {rooms.length > 1 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="mr-1 text-[10px] uppercase tracking-wider text-slate-500">
                      {t('Show')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSiteFilter(new Set())}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                        siteFilter.size === 0
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {t('All')}
                    </button>
                    {rooms.map((room) => (
                      <button
                        key={room}
                        type="button"
                        onClick={() => toggleSite(room)}
                        aria-pressed={siteFilter.has(room)}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                          siteFilter.has(room)
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {room}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Panel>
          )}

          {views.length === 0 ? (
            <Panel>
              <p className="text-sm text-slate-500">
                {t('Nothing scheduled yet. Add a tournament or paste a few lines from a lobby.')}
              </p>
            </Panel>
          ) : (
            <Panel className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="pb-2 font-medium">{t('In')}</th>
                    <th className="pb-2 font-medium">{t('Tournament')}</th>
                    <th className="pb-2 font-medium">{t('Room')}</th>
                    <th className="pb-2 font-medium">{t('Starts')}</th>
                    <th className="pb-2 font-medium">{t('Buy-in')}</th>
                    <th className="pb-2 font-medium">{t('Late reg')}</th>
                    <th className="pb-2 font-medium">{t('Closes in')}</th>
                    <th className="pb-2 font-medium">{t('Alarm')}</th>
                    <th className="pb-2 font-medium" />
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  {shown.map((view) => {
                    const style = STATUS_STYLE[view.status]
                    const urgent = view.status === 'lateReg' && view.msToLateRegClose < 15 * MINUTE
                    return (
                      <tr key={view.id} className={`border-b last:border-0 ${style.row}`}>
                        <td className="py-2">
                          <input
                            type="checkbox"
                            aria-label={t('Registered')}
                            checked={view.registered}
                            onChange={(event) =>
                              update(view.id, { registered: event.target.checked })
                            }
                            className="rounded border-slate-600"
                          />
                        </td>
                        <td className="py-2">
                          <input
                            aria-label={t('Tournament name')}
                            value={view.name}
                            onChange={(event) => update(view.id, { name: event.target.value })}
                            placeholder={t('Name')}
                            className="w-40 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm text-white placeholder:text-slate-600 hover:border-slate-700 focus:border-indigo-600 focus:outline-none"
                          />
                          <span
                            className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${style.chip}`}
                          >
                            {view.status === 'scheduled'
                              ? t('Upcoming')
                              : view.status === 'lateReg'
                                ? t('Open')
                                : t('Closed')}
                          </span>
                        </td>
                        <td className="py-2">
                          <input
                            list="schedule-sites"
                            aria-label={t('Room')}
                            value={view.site}
                            onChange={(event) => update(view.id, { site: event.target.value })}
                            placeholder="—"
                            className="w-24 rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-slate-400 placeholder:text-slate-700 hover:border-slate-700 focus:border-indigo-600 focus:outline-none"
                          />
                        </td>
                        <td className="py-2">
                          <input
                            type="datetime-local"
                            aria-label={t('Start time')}
                            value={localInputValue(new Date(view.startsAt))}
                            onChange={(event) => {
                              const next = new Date(event.target.value)
                              if (!Number.isNaN(next.getTime())) {
                                update(view.id, { startsAt: next.toISOString() })
                              }
                            }}
                            className="rounded border border-slate-700 bg-slate-950/60 px-1.5 py-0.5 text-xs text-slate-200"
                          />
                        </td>
                        <td className="py-2">
                          <input
                            type="number"
                            aria-label={t('Buy-in')}
                            value={view.buyIn}
                            onChange={(event) =>
                              update(view.id, { buyIn: Number(event.target.value) || 0 })
                            }
                            className="w-16 rounded border border-slate-700 bg-slate-950/60 px-1.5 py-0.5 text-right text-xs tabular-nums text-slate-200"
                          />
                        </td>
                        <td className="py-2">
                          <input
                            type="number"
                            aria-label={t('Late reg minutes')}
                            value={view.lateRegMinutes}
                            onChange={(event) =>
                              update(view.id, { lateRegMinutes: Number(event.target.value) || 0 })
                            }
                            className="w-16 rounded border border-slate-700 bg-slate-950/60 px-1.5 py-0.5 text-right text-xs tabular-nums text-slate-200"
                          />
                          <span className="ml-1 text-[10px] text-slate-600">{t('min')}</span>
                        </td>
                        <td
                          className={`py-2 tabular-nums font-semibold ${
                            view.status === 'closed'
                              ? 'text-slate-600'
                              : urgent
                                ? 'text-red-400'
                                : view.status === 'lateReg'
                                  ? 'text-amber-300'
                                  : 'text-slate-300'
                          }`}
                        >
                          {formatCountdown(view.msToLateRegClose)}
                        </td>
                        <td className="py-2">
                          <input
                            type="number"
                            aria-label={t('Alarm minutes before close')}
                            value={view.alarmMinutes ?? ''}
                            placeholder={t('off')}
                            onChange={(event) => {
                              const raw = event.target.value
                              update(view.id, {
                                alarmMinutes: raw.trim() === '' ? null : Number(raw) || 0,
                              })
                              // Re-arm so an edited alarm can fire again.
                              firedRef.current.delete(view.id)
                            }}
                            className="w-14 rounded border border-slate-700 bg-slate-950/60 px-1.5 py-0.5 text-right text-xs tabular-nums text-slate-200"
                          />
                        </td>
                        <td className="py-2 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setTournaments((prev) => prev.filter((item) => item.id !== view.id))
                            }
                            aria-label={t('Remove')}
                            className="rounded px-2 text-slate-600 transition-colors hover:text-rose-400"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Panel>
          )}
        </div>

        <datalist id="schedule-sites">
          {[...new Set([...SITES, ...rooms])].map((room) => (
            <option key={room} value={room} />
          ))}
        </datalist>

        <Footer />
      </div>
    </div>
  )
}
