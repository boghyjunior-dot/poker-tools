import { useEffect, useMemo, useState } from 'react'
import { BackToMenu } from '../BackToMenu'
import { Footer } from '../Footer'
import { formatMoney } from '../../lib/formatNumber'
import { useT } from '../../lib/i18n'
import {
  calculateMysteryBounty,
  calculateRemainingBounties,
  depletionOutlook,
  evaluateCall,
  type BountyTier,
} from '../../lib/mysteryBounty'
import { bountyReportToMarkdown } from '../../lib/mysteryBountyExport'
import { LADDER_PRESETS, parseLadderText } from '../../lib/mysteryBountyLadders'
import {
  JAM_RANGE_OPTIONS,
  solveCallingRange,
  type CallingRangeSolution,
} from '../../lib/mysteryBountyCalling'
import {
  loadState,
  newTournamentId,
  saveState,
  type SavedTournament,
} from '../../lib/mysteryBountyStorage'

interface FormState {
  eventName: string
  entrants: string
  prizePoolPerEntry: string
  bountyPerEntry: string
  feePerEntry: string
  bountyStartPlayers: string
  startingStack: string
  bigBlind: string
  topPrize: string
  topPrizeCount: string
  yourStackBb: string
  shoveBb: string
  shove2Bb: string
  deadBb: string
  bubbleFactor: string
  jamRangeId: string
}

const DEFAULTS: FormState = {
  eventName: '',
  entrants: '1000',
  prizePoolPerEntry: '500',
  bountyPerEntry: '450',
  feePerEntry: '50',
  bountyStartPlayers: '150',
  startingStack: '20000',
  bigBlind: '5000',
  topPrize: '',
  topPrizeCount: '1',
  yourStackBb: '40',
  shoveBb: '12',
  shove2Bb: '',
  deadBb: '1.5',
  bubbleFactor: '1',
  jamRangeId: 'top-30',
}

interface TierRow {
  id: string
  value: string
  /** Envelopes of this value still in the drum. */
  count: string
}

/** A drum part-way through the bounty phase: one big envelope still live. */
const DEFAULT_TIERS: TierRow[] = [
  { id: 't1', value: '50000', count: '1' },
  { id: 't2', value: '10000', count: '2' },
  { id: 't3', value: '4000', count: '5' },
  { id: 't4', value: '1500', count: '52' },
]

let tierSeq = 0
const nextTierId = () => `tier-${(tierSeq += 1)}`

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-slate-800 bg-slate-900/60 p-5 ${className}`}>
      {children}
    </section>
  )
}

function Field({
  label,
  emoji,
  value,
  onChange,
  hint,
  suffix,
  placeholder,
}: {
  label: string
  emoji?: string
  value: string
  onChange: (value: string) => void
  hint?: string
  suffix?: string
  placeholder?: string
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-300">
        {emoji && (
          <span aria-hidden="true" className="mr-1">
            {emoji}
          </span>
        )}
        {label}
      </span>
      <span className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
            {suffix}
          </span>
        )}
      </span>
      {hint && <span className="text-[11px] leading-tight text-slate-500">{hint}</span>}
    </label>
  )
}

const num = (value: string) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const pct = (value: number) => `${(value * 100).toFixed(1)}%`

function formatWhen(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function tiersToRows(tiers: BountyTier[]): TierRow[] {
  if (tiers.length === 0) return DEFAULT_TIERS
  return tiers.map((tier) => ({
    id: nextTierId(),
    value: String(tier.value),
    count: String(tier.count),
  }))
}

export function MysteryBountyPage() {
  // Read once, lazily, so an event in progress survives a refresh.
  const t = useT()
  const [stored] = useState(loadState)

  const [form, setForm] = useState<FormState>(() => ({
    ...DEFAULTS,
    ...(stored.active?.form as Partial<FormState> | undefined),
  }))
  const [tiers, setTiers] = useState<TierRow[]>(() =>
    stored.active ? tiersToRows(stored.active.tiers) : DEFAULT_TIERS,
  )
  const [saved, setSaved] = useState<SavedTournament[]>(stored.saved)
  const [useRemaining, setUseRemaining] = useState(() => (stored.active?.tiers.length ?? 0) > 0)

  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [pasteNote, setPasteNote] = useState<string | null>(null)
  const [calling, setCalling] = useState<CallingRangeSolution | null>(null)
  const [solving, setSolving] = useState(false)
  const [copyNote, setCopyNote] = useState<string | null>(null)

  const set = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const entrants = Math.floor(num(form.entrants))
  const prizePoolPerEntry = num(form.prizePoolPerEntry)
  const bountyPerEntry = num(form.bountyPerEntry)
  const bountyStartPlayers = Math.floor(num(form.bountyStartPlayers))
  const bigBlind = num(form.bigBlind)
  const startingStack = num(form.startingStack)

  const error = useMemo(() => {
    if (!(entrants >= 1)) return 'Enter at least 1 entry.'
    if (!(prizePoolPerEntry > 0)) return 'The prize-pool share of the buy-in must be greater than 0.'
    if (!(bountyPerEntry > 0)) return 'The bounty share of the buy-in must be greater than 0.'
    if (!(bountyStartPlayers >= 2)) return 'The bounty phase needs at least 2 players.'
    if (bountyStartPlayers > entrants) return 'The bounty phase cannot start with more players than entries.'
    if (!(startingStack > 0)) return 'Starting stack must be greater than 0.'
    if (!(bigBlind > 0)) return 'Big blind must be greater than 0.'
    return null
  }, [entrants, prizePoolPerEntry, bountyPerEntry, bountyStartPlayers, startingStack, bigBlind])

  const result = useMemo(() => {
    if (error) return null
    return calculateMysteryBounty({
      entrants,
      prizePoolPerEntry,
      bountyPerEntry,
      feePerEntry: num(form.feePerEntry),
      bountyStartPlayers,
      startingStack,
      bigBlind,
      topPrize: form.topPrize.trim() === '' ? undefined : num(form.topPrize),
      topPrizeCount: form.topPrizeCount.trim() === '' ? 1 : num(form.topPrizeCount),
    })
  }, [
    error,
    entrants,
    prizePoolPerEntry,
    bountyPerEntry,
    form.feePerEntry,
    bountyStartPlayers,
    startingStack,
    bigBlind,
    form.topPrize,
    form.topPrizeCount,
  ])

  const ladder = useMemo(
    (): BountyTier[] =>
      tiers
        .map((tier) => ({ value: num(tier.value), count: num(tier.count) }))
        .filter((tier) => tier.value > 0 && tier.count > 0),
    [tiers],
  )

  // The table says what is still in the drum, not what the drum started as,
  // so depletion is measured against the average the phase began with.
  const ladderStartingAverage = result?.averageBounty ?? 0

  const remaining = useMemo(() => {
    if (!useRemaining || result === null) return null
    return calculateRemainingBounties({
      tiers: ladder,
      chipsPerUnit: result.chipsPerUnit,
      bigBlind,
      startingAverage: ladderStartingAverage,
    })
  }, [useRemaining, result, ladder, bigBlind, ladderStartingAverage])

  const depletion = useMemo(() => {
    if (!useRemaining || ladder.length === 0) return []
    return depletionOutlook(ladder)
  }, [useRemaining, ladder])

  // Whichever view is active drives the blind table and the calling maths.
  const activeBountyBb = remaining ? remaining.averageBountyBb : (result?.averageBountyBb ?? 0)
  const activeLevels = remaining ? remaining.levels : (result?.levels ?? [])

  const call = useMemo(() => {
    if (result === null) return null
    const opponents = [{ stackBb: num(form.shoveBb), bountyBb: activeBountyBb }]
    if (form.shove2Bb.trim() !== '' && num(form.shove2Bb) > 0) {
      opponents.push({ stackBb: num(form.shove2Bb), bountyBb: activeBountyBb })
    }
    return evaluateCall({
      yourStackBb: num(form.yourStackBb),
      opponents,
      deadBb: num(form.deadBb),
      bubbleFactor: num(form.bubbleFactor),
    })
  }, [result, form.shoveBb, form.shove2Bb, form.yourStackBb, form.deadBb, form.bubbleFactor, activeBountyBb])

  useEffect(() => {
    const hasLadder = ladder.length > 0
    if (!hasLadder && saved.length === 0 && form.eventName.trim() === '') return
    saveState({
      active: {
        id: stored.active?.id ?? 'active',
        name: form.eventName,
        savedAt: new Date().toISOString(),
        form: form as unknown as Record<string, string>,
        tiers: ladder,
      },
      saved,
    })
  }, [form, ladder, saved, stored.active?.id])

  const setTier = (id: string, key: 'value' | 'count') => (next: string) =>
    setTiers((prev) => prev.map((tier) => (tier.id === id ? { ...tier, [key]: next } : tier)))

  const addTier = () =>
    setTiers((prev) => [...prev, { id: nextTierId(), value: '', count: '' }])

  const removeTier = (id: string) =>
    setTiers((prev) => (prev.length === 1 ? prev : prev.filter((tier) => tier.id !== id)))

  const applyPreset = (presetId: string) => {
    const preset = LADDER_PRESETS.find((p) => p.id === presetId)
    if (!preset) return
    // A preset is a shape, not an amount. Scale its envelope values so the
    // ladder adds up to this tournament's actual bounty pool, rounded to
    // something a structure sheet would plausibly print.
    const presetPool = preset.tiers.reduce((sum, tier) => sum + tier.value * tier.count, 0)
    const scale = result && presetPool > 0 ? result.bountyPool / presetPool : 1
    const scaled = preset.tiers.map((tier) => ({
      value: Math.max(1, Math.round((tier.value * scale) / 100) * 100),
      count: tier.count,
    }))
    setTiers(tiersToRows(scaled))
    setUseRemaining(true)
    setPasteNote(`Loaded the ${preset.label.toLowerCase()} ladder — ${preset.description}`)
  }

  const applyPaste = () => {
    const { tiers: parsed, errors } = parseLadderText(pasteText)
    if (parsed.length === 0) {
      setPasteNote(errors[0] ?? 'Nothing to read.')
      return
    }
    setTiers(tiersToRows(parsed))
    setUseRemaining(true)
    setPasteOpen(false)
    setPasteText('')
    setPasteNote(
      `Read ${parsed.length} rung${parsed.length === 1 ? '' : 's'}${errors.length > 0 ? ` · skipped ${errors.length} line${errors.length === 1 ? '' : 's'}` : ''}.`,
    )
  }

  const runCallingSolver = () => {
    if (!call) return
    setSolving(true)
    // Let the button paint before the simulations block the thread.
    window.setTimeout(() => {
      setCalling(solveCallingRange(call.with * 100, form.jamRangeId))
      setSolving(false)
    }, 30)
  }

  const saveTournament = () => {
    const entry: SavedTournament = {
      id: newTournamentId(),
      name: form.eventName.trim() || 'Untitled event',
      savedAt: new Date().toISOString(),
      form: form as unknown as Record<string, string>,
      tiers: ladder,
    }
    setSaved((prev) => [entry, ...prev].slice(0, 20))
  }

  const loadTournament = (entry: SavedTournament) => {
    setForm({ ...DEFAULTS, ...(entry.form as Partial<FormState>) })
    setTiers(tiersToRows(entry.tiers))
    setUseRemaining(entry.tiers.length > 0)
    setCalling(null)
  }

  const deleteTournament = (id: string) => setSaved((prev) => prev.filter((e) => e.id !== id))

  const copyReport = async () => {
    if (!result) return
    const markdown = bountyReportToMarkdown({
      name: form.eventName,
      full: result,
      remaining,
      depletion,
      call,
      bigBlind,
    })
    try {
      await navigator.clipboard.writeText(markdown)
      setCopyNote('Report copied as Markdown.')
      return
    } catch {
      // Clipboard needs focus and a secure context; fall through to download.
    }
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `mystery-bounty-${new Date().toISOString().slice(0, 10)}.md`
    link.click()
    URL.revokeObjectURL(url)
    setCopyNote('Clipboard unavailable — downloaded the report instead.')
  }

  // A top prize can be entered yet still not apply, when the tier is worth more
  // than the whole bounty pool. Say which of the two it is.
  const topPrizeEntered = form.topPrize.trim() !== '' && num(form.topPrize) > 0
  const tierTooBig = topPrizeEntered && result !== null && result.typicalBounty === null
  const typicalNote =
    result === null || result.topPrizeChance === null
      ? tierTooBig
        ? 'Those top prizes are worth more than the whole bounty pool — check the value and the count.'
        : 'A few huge envelopes drag the average above what you will usually draw.'
      : `Excludes ${result.topPrizeCount} top ${
          result.topPrizeCount === 1 ? 'envelope' : 'envelopes'
        } worth ${formatMoney(result.topPrizeTotal)}${result.topPrizeCount === 1 ? '' : ' between them'} — a ${(
          result.topPrizeChance * 100
        ).toFixed(1)}% chance per knockout, about 1 in ${Math.round(
          1 / result.topPrizeChance,
        ).toLocaleString('en-US')}.`

  const bubble = num(form.bubbleFactor)

  // A part-drawn drum holds less than the pool, which is normal. Holding more
  // than the pool ever contained is not, and every figure below inherits it.
  const ladderPool = ladder.reduce((sum, tier) => sum + tier.value * tier.count, 0)
  const drumOverfull =
    useRemaining && result !== null && ladderPool > result.bountyPool * 1.02
      ? ladderPool / result.bountyPool
      : null

  const startingAverage = ladderStartingAverage

  // A couple of percent either way is rounding, not a picked-over drum.
  const richness: 'rich' | 'poor' | 'level' =
    remaining?.richnessVsStart == null
      ? 'level'
      : remaining.richnessVsStart > 1.02
        ? 'rich'
        : remaining.richnessVsStart < 0.98
          ? 'poor'
          : 'level'
  return (
    <div className="min-h-screen px-4 py-6">
      <div className="mx-auto w-full max-w-4xl">
        <BackToMenu className="mb-3" />
        <h1 className="text-3xl font-bold text-white">Mystery Bounty</h1>
        <p className="mb-6 text-sm text-slate-400">
          {t('What a knockout is really worth — at the start of the phase, and right now.')}
        </p>

        <div className="flex flex-col gap-4">
          <Panel>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-white">{t('Tournament')}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  aria-label={t('Event name')}
                  value={form.eventName}
                  onChange={(e) => set('eventName')(e.target.value)}
                  placeholder={t('Event name')}
                  className="w-40 rounded-md border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
                <button
                  type="button"
                  onClick={saveTournament}
                  className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700"
                >
                  {t('Save event')}
                </button>
                <button
                  type="button"
                  onClick={() => void copyReport()}
                  className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700"
                >
                  {t('Copy report')}
                </button>
              </div>
            </div>
            {copyNote && <p className="mb-3 text-xs text-emerald-400">{copyNote}</p>}

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label={t('Entries')} emoji="👥" value={form.entrants} onChange={set('entrants')} hint={t('Including re-entries')} />
              <Field
                label={t('Prize pool / entry')} emoji="🏆"
                value={form.prizePoolPerEntry}
                onChange={set('prizePoolPerEntry')}
                hint={t('Buy-in share that plays')}
              />
              <Field
                label={t('Bounty / entry')} emoji="🎯"
                value={form.bountyPerEntry}
                onChange={set('bountyPerEntry')}
                hint={t('Buy-in share for bounties')}
              />
              <Field label={t('Fee / entry')} emoji="🧾" value={form.feePerEntry} onChange={set('feePerEntry')} hint={t('Rake')} />
              <Field
                label={t('Bounty phase starts')} emoji="🚩"
                value={form.bountyStartPlayers}
                onChange={set('bountyStartPlayers')}
                hint={t('Players left when envelopes begin')}
              />
              <Field
                label={t('Starting stack')} emoji="🪙"
                value={form.startingStack}
                onChange={set('startingStack')}
                hint={t('Chips')}
              />
              <Field label={t('Current big blind')} emoji="🔼" value={form.bigBlind} onChange={set('bigBlind')} hint={t('Chips')} />
              <Field
                label={t('Top prize')} emoji="💎"
                value={form.topPrize}
                onChange={set('topPrize')}
                placeholder={t('optional')}
                hint={t('Value of each top envelope')}
              />
            </div>

            {error && (
              <p className="mt-4 rounded-md border border-rose-900/60 bg-rose-950/30 p-3 text-xs text-rose-300">
                {error}
              </p>
            )}
          </Panel>

          {saved.length > 0 && (
            <Panel>
              <h2 className="mb-2 text-sm font-semibold text-white">{t('Saved events')}</h2>
              <div className="space-y-1.5">
                {saved.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex flex-wrap items-center gap-3 rounded-md bg-slate-950/40 px-3 py-2 text-xs"
                  >
                    <span className="text-slate-200">{entry.name}</span>
                    <span className="text-slate-500">{formatWhen(entry.savedAt)}</span>
                    <span className="text-slate-600">
                      {entry.tiers.reduce((sum, t) => sum + t.count, 0).toLocaleString('en-US')} envelopes
                    </span>
                    <div className="ml-auto flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => loadTournament(entry)}
                        className="text-slate-400 transition-colors hover:text-white"
                      >
                        {t('Load')}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTournament(entry.id)}
                        className="text-slate-600 transition-colors hover:text-rose-400"
                      >
                        {t('Delete')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          <Panel>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-white">{t('The drum')}</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {t('Part-way through the phase the start-of-phase average is a fiction. Enter the envelopes still in the drum and every number below switches to what a knockout is worth right now.')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUseRemaining((prev) => !prev)}
                aria-pressed={useRemaining}
                className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  useRemaining
                    ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                    : 'border border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                {useRemaining ? t('Using the drum') : t('Use the drum')}
              </button>
            </div>

            {useRemaining && (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] uppercase tracking-wide text-slate-500">Ladder</span>
                  {LADDER_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset.id)}
                      className="rounded-md border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-700"
                    >
                      {preset.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPasteOpen((prev) => !prev)}
                    className="rounded-md border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-700"
                  >
                    {t('Paste a table')}
                  </button>
                </div>

                {pasteOpen && (
                  <div className="space-y-2 rounded-md border border-slate-800 bg-slate-950/40 p-3">
                    <textarea
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                      rows={5}
                      placeholder={'Paste the published ladder, one rung per line:\n$100,000 x 1\n$25,000 x 2\n$1,000 x 140'}
                      className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                    <button
                      type="button"
                      onClick={applyPaste}
                      className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500"
                    >
                      {t('Read the table')}
                    </button>
                  </div>
                )}

                {pasteNote && <p className="text-xs text-slate-400">{pasteNote}</p>}

                <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-[11px] uppercase tracking-wide text-slate-500">
                  <span>💎 Envelope value</span>
                  <span>🔢 How many left</span>
                  <span className="w-8" />
                </div>
                {tiers.map((tier) => (
                  <div key={tier.id} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
                    <input
                      type="number"
                      aria-label={t('Envelope value')}
                      value={tier.value}
                      onChange={(e) => setTier(tier.id, 'value')(e.target.value)}
                      placeholder="5000"
                      className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm tabular-nums text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                    <input
                      type="number"
                      aria-label={t('How many left')}
                      value={tier.count}
                      onChange={(e) => setTier(tier.id, 'count')(e.target.value)}
                      placeholder="10"
                      className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm tabular-nums text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                    <button
                      type="button"
                      onClick={() => removeTier(tier.id)}
                      disabled={tiers.length === 1}
                      aria-label={t('Remove this rung')}
                      className="w-8 rounded-md border border-slate-700 py-2 text-sm text-slate-500 transition-colors hover:border-rose-800 hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      ×
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addTier}
                  className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700"
                >
                  {t('Add a rung')}
                </button>

                {drumOverfull !== null && result && (
                  <p className="rounded-md border border-amber-900/60 bg-amber-950/30 p-3 text-xs text-amber-300">
                    This drum holds {formatMoney(ladderPool)}, more than the{' '}
                    {formatMoney(result.bountyPool)} bounty pool that{' '}
                    {entrants.toLocaleString('en-US')} entries at {formatMoney(bountyPerEntry)} ever
                    contained. Check the ladder or the entry numbers — every figure below follows
                    the drum.
                  </p>
                )}

                {useRemaining && remaining === null && (
                  <p className="rounded-md border border-amber-900/60 bg-amber-950/30 p-3 text-xs text-amber-300">
                    {t('Enter at least one rung with a value and a count.')}
                  </p>
                )}
              </div>
            )}
          </Panel>

          {remaining && result && (
            <>
              <Panel>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-indigo-800/60 bg-indigo-950/30 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-indigo-300">
                      {t('Average bounty left')}
                    </p>
                    <p className="mt-1 text-3xl font-bold text-white">
                      {formatMoney(remaining.averageBounty)}
                    </p>
                    <p className="mt-1 text-sm text-indigo-200">
                      {remaining.averageBountyBb.toFixed(1)} big blinds
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      {t('{chips} chips · {envelopes} envelopes · {pool} still in the drum', {
                        chips: Math.round(remaining.averageBountyChips).toLocaleString('en-US'),
                        envelopes: Math.round(remaining.envelopes).toLocaleString('en-US'),
                        pool: formatMoney(remaining.pool),
                      })}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">
                      {t('What you will most likely draw')}
                    </p>
                    <p className="mt-1 text-3xl font-bold text-white">
                      {remaining.mostLikely === null ? '—' : formatMoney(remaining.mostLikely.value)}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {remaining.mostLikely === null
                        ? ''
                        : t('{pct}% of the envelopes left', {
                            pct: (remaining.mostLikely.chance * 100).toFixed(0),
                          })}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {t('Median draw {amount}. A few big envelopes pull the average well above what a normal knockout pays.', {
                        amount: formatMoney(remaining.medianBounty),
                      })}
                    </p>
                  </div>
                </div>

                {remaining.richnessVsStart !== null && (
                  <p
                    className={`mt-4 rounded-md border p-3 text-xs ${
                      richness === 'rich'
                        ? 'border-emerald-900/60 bg-emerald-950/30 text-emerald-300'
                        : richness === 'poor'
                          ? 'border-amber-900/60 bg-amber-950/30 text-amber-300'
                          : 'border-slate-700 bg-slate-950/40 text-slate-400'
                    }`}
                  >
                    {richness === 'rich' &&
                      t('The drum is still rich: a knockout now is worth {ratio}× the untouched average of {average}. The big envelopes are still live.', {
                        ratio: remaining.richnessVsStart.toFixed(2),
                        average: formatMoney(startingAverage),
                      })}
                    {richness === 'poor' &&
                      t('The drum has been picked over: a knockout now is worth {ratio}× the untouched average of {average}. Bust someone for the chips, not the envelope.', {
                        ratio: remaining.richnessVsStart.toFixed(2),
                        average: formatMoney(startingAverage),
                      })}
                    {richness === 'level' &&
                      t('A knockout is worth about what it always was — {now} against an untouched average of {average}.', {
                        now: formatMoney(remaining.averageBounty),
                        average: formatMoney(startingAverage),
                      })}
                  </p>
                )}

              </Panel>

              <Panel>
                <h2 className="text-sm font-semibold text-white">{t('What is in the drum')}</h2>
                <p className="mb-3 text-xs text-slate-500">
                  {t('What each rung is worth to a single knockout, and how much of the remaining money it holds.')}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-left text-[11px] uppercase tracking-wide text-slate-500">
                        <th className="pb-2 font-medium">{t('Envelope')}</th>
                        <th className="pb-2 font-medium">{t('Left')}</th>
                        <th className="pb-2 font-medium">{t('Chance per KO')}</th>
                        <th className="pb-2 font-medium">{t('Share of the money')}</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-300">
                      {remaining.tiers.map((tier) => (
                          <tr key={tier.value} className="border-b border-slate-800/60 last:border-0">
                            <td className="py-2 tabular-nums text-white">{formatMoney(tier.value)}</td>
                            <td className="py-2 tabular-nums">
                              {tier.count.toLocaleString('en-US')}
                            </td>
                            <td className="py-2 tabular-nums">
                              {(tier.chance * 100).toFixed(1)}%
                              {tier.chance < 0.5 && (
                                <span className="ml-1 text-slate-600">
                                  (1 in {Math.round(1 / tier.chance).toLocaleString('en-US')})
                                </span>
                              )}
                            </td>
                            <td className="py-2 tabular-nums text-slate-400">
                              {(tier.share * 100).toFixed(1)}%
                            </td>
                          </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>

              {depletion.length > 0 && (
                <Panel>
                  <h2 className="text-sm font-semibold text-white">{t('Will the big one still be there?')}</h2>
                  <p className="mb-3 text-xs text-slate-500">
                    {t('Every bust draws an envelope, so the drum and the player count run down together. Drawing envelopes does not make the drum poorer on average — every rung shrinks by the same fraction — but it does make it likelier the big ones are gone.')}
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[380px] text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 text-left text-[11px] uppercase tracking-wide text-slate-500">
                          <th className="pb-2 font-medium">{t('Players left')}</th>
                          <th className="pb-2 font-medium">{t('Drawn from here')}</th>
                          <th className="pb-2 font-medium">{t('Top rung still live')}</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-300">
                        {depletion.map((row) => (
                          <tr key={row.envelopesDrawn} className="border-b border-slate-800/60 last:border-0">
                            <td className="py-2 tabular-nums">{row.playersLeft.toLocaleString('en-US')}</td>
                            <td className="py-2 tabular-nums text-slate-500">
                              {row.envelopesDrawn.toLocaleString('en-US')}
                            </td>
                            <td
                              className={`py-2 tabular-nums ${
                                row.survival > 0.5 ? 'text-emerald-400' : 'text-amber-400'
                              }`}
                            >
                              {pct(row.survival)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Panel>
              )}
            </>
          )}

          {result && !remaining && (
            <Panel>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-indigo-800/60 bg-indigo-950/30 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-indigo-300">{t('Average bounty')}</p>
                  <p className="mt-1 text-3xl font-bold text-white">{formatMoney(result.averageBounty)}</p>
                  <p className="mt-1 text-sm text-indigo-200">
                    {result.averageBountyBb.toFixed(1)} big blinds
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    {Math.round(result.averageBountyChips).toLocaleString('en-US')} chips ·{' '}
                    {result.multipleOfBuyIn.toFixed(2)}× the buy-in
                  </p>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">
                    Typical draw{' '}
                    {result.typicalBounty === null &&
                      (tierTooBig ? '(tier exceeds the pool)' : '(enter a top prize)')}
                  </p>
                  <p className="mt-1 text-3xl font-bold text-white">
                    {result.typicalBounty === null ? '—' : formatMoney(result.typicalBounty)}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {result.typicalBountyBb === null
                      ? t('Average excluding the top envelopes')
                      : `${result.typicalBountyBb.toFixed(1)} big blinds`}
                  </p>
                  <p className={`mt-2 text-xs ${tierTooBig ? 'text-amber-400' : 'text-slate-500'}`}>
                    {typicalNote}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: t('Bounty pool'), value: formatMoney(result.bountyPool) },
                  { label: t('Envelopes drawn'), value: result.draws.toLocaleString('en-US') },
                  {
                    label: t('vs your contribution'),
                    value: `${result.multipleOfEntryBounty.toFixed(1)}×`,
                    sub: `each entry put in ${formatMoney(bountyPerEntry)}`,
                  },
                  { label: t('Regular prize pool'), value: formatMoney(result.prizePool) },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">{item.label}</p>
                    <p className="mt-0.5 text-lg font-semibold text-white">{item.value}</p>
                    {item.sub && <p className="text-[11px] text-slate-500">{item.sub}</p>}
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {result && (
            <>
              <Panel>
                <h2 className="text-sm font-semibold text-white">{t('As the blinds grow')}</h2>
                <p className="mb-3 text-xs text-slate-500">
                  {t('The bounty is a fixed amount of cash, so it buys fewer big blinds every level.')}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-left text-[11px] uppercase tracking-wide text-slate-500">
                        <th className="pb-2 font-medium">{t('Big blind')}</th>
                        <th className="pb-2 font-medium">{t('Average bounty')}</th>
                        <th className="pb-2 font-medium">{t('Worth to a 30bb stack')}</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-300">
                      {activeLevels.map((level) => (
                        <tr key={level.bigBlind} className="border-b border-slate-800/60 last:border-0">
                          <td className="py-2 tabular-nums">
                            {Math.round(level.bigBlind).toLocaleString('en-US')}
                          </td>
                          <td className="py-2 tabular-nums text-white">{level.bountyBb.toFixed(1)} bb</td>
                          <td className="py-2 tabular-nums text-slate-500">
                            {((level.bountyBb / 30) * 100).toFixed(0)}% of their stack
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>

              {call && (
                <Panel>
                  <h2 className="text-sm font-semibold text-white">{t('What it does to a call')}</h2>
                  <p className="mb-3 text-xs text-slate-500">
                    {t('Someone jams and you are deciding whether to call. You only win a bounty by knocking a player out, so anyone who has you covered brings none.')}
                  </p>

                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                    <Field label={t('Your stack')} emoji="🧍" value={form.yourStackBb} onChange={set('yourStackBb')} suffix="bb" />
                    <Field label={t('Their shove')} emoji="💥" value={form.shoveBb} onChange={set('shoveBb')} suffix="bb" />
                    <Field
                      label={t('Second jam')} emoji="💥"
                      value={form.shove2Bb}
                      onChange={set('shove2Bb')}
                      suffix="bb"
                      placeholder={t('none')}
                      hint={t('Multiway')}
                    />
                    <Field label={t('Dead money')} emoji="💵" value={form.deadBb} onChange={set('deadBb')} suffix="bb" />
                    <Field
                      label={t('Bubble factor')} emoji="🫧"
                      value={form.bubbleFactor}
                      onChange={set('bubbleFactor')}
                      hint={t('1 = chip EV')}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">{t('Without bounty')}</p>
                      <p className="mt-0.5 text-lg font-semibold text-slate-300">{pct(call.without)}</p>
                    </div>
                    <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/30 px-3 py-2.5">
                      <p className="text-[11px] uppercase tracking-wide text-emerald-400">{t('With bounty')}</p>
                      <p className="mt-0.5 text-lg font-semibold text-emerald-300">{pct(call.with)}</p>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">{t('Equity saved')}</p>
                      <p className="mt-0.5 text-lg font-semibold text-white">
                        {(call.saved * 100).toFixed(1)} pts
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">{t('Risking')}</p>
                      <p className="mt-0.5 text-lg font-semibold text-white">
                        {call.callBb.toFixed(1)} bb
                      </p>
                      <p className="text-[11px] text-slate-500">into {call.potBb.toFixed(1)} bb</p>
                    </div>
                  </div>

                  {call.uncoveredCount > 0 && (
                    <p className="mt-3 rounded-md border border-amber-900/60 bg-amber-950/30 p-3 text-xs text-amber-300">
                      {call.uncoveredCount === 1 ? 'They have' : `${call.uncoveredCount} of them have`}{' '}
                      you covered, so winning the pot does not knock{' '}
                      {call.uncoveredCount === 1 ? 'them' : 'all of them'} out —{' '}
                      {call.unreachableBountyBb.toFixed(1)} bb of bounty is not yours to win and has
                      been left out of the number above.
                    </p>
                  )}

                  {bubble !== 1 && (
                    <p className="mt-3 text-xs text-slate-500">
                      Bubble factor {bubble.toFixed(2)} is applied to the chips you risk. The bounty
                      is cash and is not discounted by ICM, which is exactly why it pushes back
                      against bubble pressure.
                    </p>
                  )}

                  <p className="mt-3 text-xs text-slate-500">
                    {t('The bounty adds {amount} bb of collectable dead money to the pot whenever you knock them out.', {
                      amount: call.bountyInPlayBb.toFixed(1),
                    })}
                  </p>

                  <div className="mt-4 border-t border-slate-800 pt-4">
                    <div className="flex flex-wrap items-end gap-3">
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-slate-300">
                          <span aria-hidden="true" className="mr-1">
                            🃏
                          </span>
                          {t('They are jamming')}
                        </span>
                        <select
                          value={form.jamRangeId}
                          onChange={(e) => set('jamRangeId')(e.target.value)}
                          className="rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        >
                          {JAM_RANGE_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={runCallingSolver}
                        disabled={solving}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
                      >
                        {solving ? 'Simulating…' : `What calls ${pct(call.with)}?`}
                      </button>
                    </div>

                    {calling && (
                      <div className="mt-3">
                        <p className="mb-2 text-xs text-slate-400">
                          {calling.widest
                            ? `Against ${calling.jamRangeLabel.toLowerCase()}, calling the ${calling.widest.label.toLowerCase()} is profitable — that range holds ${calling.widest.equity.toFixed(1)}% against the jam, past the ${calling.thresholdPct.toFixed(1)}% you need.`
                            : `Against ${calling.jamRangeLabel.toLowerCase()}, none of the standard widths clear ${calling.thresholdPct.toFixed(1)}%. This is a fold without a very specific hand.`}
                        </p>
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[360px] text-sm">
                            <thead>
                              <tr className="border-b border-slate-800 text-left text-[11px] uppercase tracking-wide text-slate-500">
                                <th className="pb-2 font-medium">{t('Calling range')}</th>
                                <th className="pb-2 font-medium">{t('Equity vs the jam')}</th>
                                <th className="pb-2 font-medium">{t('Verdict')}</th>
                              </tr>
                            </thead>
                            <tbody className="text-slate-300">
                              {calling.widths.map((width) => (
                                <tr key={width.id} className="border-b border-slate-800/60 last:border-0">
                                  <td className="py-2">{width.label}</td>
                                  <td className="py-2 tabular-nums">
                                    {width.equity.toFixed(1)}%
                                    <span className="ml-1 text-slate-600">
                                      ±{width.marginOfError.toFixed(1)}
                                    </span>
                                  </td>
                                  <td
                                    className={`py-2 ${width.clears ? 'text-emerald-400' : 'text-slate-500'}`}
                                  >
                                    {width.clears ? t('call') : t('fold')}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <p className="mt-2 text-[11px] text-slate-600">
                          {calling.iterations.toLocaleString('en-US')} simulations per width. Each
                          row scores the whole range, so it answers whether calling every hand in it
                          is profitable — not whether its very worst hand is.
                        </p>
                      </div>
                    )}
                  </div>
                </Panel>
              )}
            </>
          )}

          <Panel>
            <details>
              <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-300">
                {t('How this is worked out')}
              </summary>
              <div className="mt-3 space-y-2 text-xs leading-relaxed text-slate-400">
                <p>
                  <span className="text-slate-300">{t("Why the average is so big.")}</span>{' '}
                  {t(
                    "Every entry funds the bounty pool, but envelopes are only drawn during the bounty phase. With 1,000 entries and the phase starting at 150 players, 1,000 contributions are shared over 149 knockouts — so the average bounty is about 6.7× what each player put in. The later the phase starts, the bigger the average.",
                  )}
                </p>
                <p>
                  <span className="text-slate-300">{t("Chips per unit of cash.")}</span>{' '}
                  {t(
                    "Big-blind values convert through the prize-pool share of the buy-in, not the total. Every chip in play is eventually paid out of the regular prize pool, so a 20,000 stack bought by the $500 that reaches it is worth 40 chips per dollar. Using the full buy-in would understate the bounty by the size of the bounty split.",
                  )}
                </p>
                <p>
                  <span className="text-slate-300">{t("Average vs typical.")}</span>{' '}
                  {t(
                    "Mystery structures are top-heavy: a handful of envelopes can hold a large slice of the pool. The average is the right number for EV over many knockouts, but the draw you actually make is usually nearer the typical figure. Enter the announced top prize and how many envelopes are worth it to see both, along with your odds of hitting one. Splitting the same money across more top envelopes leaves the average untouched and pulls the typical draw down.",
                  )}
                </p>
                <p>
                  <span className="text-slate-300">{t("Drawing envelopes does not empty the drum of value.")}</span>{' '}
                  {t(
                    "If you do not know which envelopes have gone, every rung shrinks by the same expected fraction, so the average knockout is worth exactly what it was. What changes is the chance the big ones are still in there, which is what the depletion table tracks. Update the counts as envelopes are announced and the average moves for real.",
                  )}
                </p>
                <p>
                  <span className="text-slate-300">{t("Coverage and ICM.")}</span>{' '}
                  {t(
                    "A bounty is only winnable if you can eliminate the player holding it, so anyone who covers you contributes nothing to the call and is stripped out. The bubble factor scales only the chips you risk: the bounty is cash that pays regardless of where you finish, so it is not discounted by ICM. That asymmetry is the whole reason bounties loosen bubble play.",
                  )}
                </p>
              </div>
            </details>
          </Panel>
        </div>

        <Footer />
      </div>
    </div>
  )
}
