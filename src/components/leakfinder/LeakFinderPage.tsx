import { useEffect, useMemo, useRef, useState } from 'react'
import { BackToMenu } from '../BackToMenu'
import { Footer } from '../Footer'
import { PT4_SAMPLE_EXPORT } from '../../lib/pt4SampleExport'
import { useT } from '../../lib/i18n'
import {
  analyzeAll,
  CATEGORY_LABELS,
  formatStatUnit,
  parsePositionalReport,
  parseStatsReport,
  POSITION_KEYS,
  POSITION_LABELS,
  relevanceFromHands,
  relevanceLabel,
  STAT_DEFINITIONS,
  statAppliesTo,
  type PositionKey,
  type RankedLeak,
  type RelevanceLevel,
  type Severity,
  type StatCategory,
  type StatResult,
} from '../../lib/leakfinder'
import { reportToMarkdown } from '../../lib/leakfinderExport'
import { fixFor } from '../../lib/leakfinderFixes'
import {
  diffSnapshots,
  loadState,
  newSnapshotId,
  saveState,
  type Snapshot,
} from '../../lib/leakfinderStorage'
import {
  BASELINE,
  getPositionRange,
  getStatTarget,
  setTargetOverrides,
  type Position,
  type TargetOverrides,
} from '../../lib/leakfinderTargets'

const SEVERITY_STYLES: Record<Severity, { badge: string; border: string; label: string }> = {
  ok: { badge: 'bg-emerald-900/60 text-emerald-300', border: 'border-slate-800', label: 'OK' },
  minor: { badge: 'bg-amber-900/60 text-amber-300', border: 'border-amber-800/50', label: 'Minor leak' },
  moderate: { badge: 'bg-orange-900/60 text-orange-300', border: 'border-orange-800/60', label: 'Moderate leak' },
  major: { badge: 'bg-red-900/60 text-red-300', border: 'border-red-800/70', label: 'Major leak' },
}

const CATEGORY_ORDER: StatCategory[] = ['preflop', 'postflop', 'showdown']

const RELEVANCE_STYLES: Record<RelevanceLevel, string> = {
  insufficient: 'text-red-400',
  low: 'text-amber-400',
  medium: 'text-slate-300',
  high: 'text-emerald-400',
}

const SAMPLE_OVERALL = `VPIP: 31.2
PFR: 14.5
3Bet PF: 4.1
Fold to 3Bet: 68
Attempt to Steal: 28
WTSD: 33.5
W$SD: 44.1
WWSF: 39.2
Aggression Factor: 1.4
All-In Adj BB/100: -1.2`

const SAMPLE_HM3 = `Position,Hands,VPIP,PFR,Attempt to Steal,WTSD,W$SD,WWSF,Agg Factor
Early,42000,15.4,12.9,-,25.1,51.8,44.2,2.5
Cutoff,38000,26.9,22.4,37.1,26.8,50.4,45.9,2.7
Button,38000,45.2,38.6,42.8,28.4,49.1,47.2,3.0
Small Blind,36000,34.1,26.2,31.4,29.9,47.6,42.1,2.2
Big Blind,36000,41.7,11.8,-,31.2,46.9,40.3,1.9`

type ValuesByPosition = Record<PositionKey, Record<string, string>>
type HandsByPosition = Partial<Record<PositionKey, number>>
type OppByPosition = Partial<Record<PositionKey, Record<string, number>>>

function emptyValues(): ValuesByPosition {
  return Object.fromEntries(POSITION_KEYS.map((key) => [key, {}])) as ValuesByPosition
}

function formatHands(hands?: number): string | null {
  if (!hands || hands <= 0) return null
  if (hands >= 1000) return `${(hands / 1000).toFixed(1)}k hands`
  return `${hands} hands`
}

function scoreColor(score: number): string {
  if (score >= 85) return 'text-emerald-400'
  if (score >= 65) return 'text-amber-400'
  return 'text-red-400'
}

function scoreSummary(score: number, leakCount: number): string {
  if (leakCount === 0) return 'No leaks detected — stats are within healthy ranges.'
  if (score >= 85) return 'Solid overall. A few small adjustments will tighten things up.'
  if (score >= 65) return 'Decent foundation, but several stats need attention.'
  return 'Significant leaks detected. Focus on the major issues first.'
}

function formatWhen(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

/** Fallback for browsers or contexts where the async clipboard is blocked. */
function copyViaTextarea(text: string): boolean {
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-3 ${className}`}>
      {children}
    </section>
  )
}

export function LeakFinderPage() {
  // Read once, lazily, so a stored session survives a refresh.
  const t = useT()
  const [stored] = useState(loadState)

  const [rawText, setRawText] = useState('')
  const [values, setValues] = useState<ValuesByPosition>(() => {
    const next = emptyValues()
    for (const key of POSITION_KEYS) {
      const bucket = stored.current.values[key]
      if (!bucket) continue
      for (const [id, value] of Object.entries(bucket)) next[key][id] = String(value)
    }
    return next
  })
  const [hands, setHands] = useState<HandsByPosition>(stored.current.hands)
  const [opportunities, setOpportunities] = useState<OppByPosition>(stored.current.opportunities)
  const [snapshots, setSnapshots] = useState<Snapshot[]>(stored.snapshots)
  const [overrides, setOverrides] = useState<TargetOverrides>(stored.overrides)

  const [activeTab, setActiveTab] = useState<PositionKey>('overall')
  const [parseMessage, setParseMessage] = useState<string | null>(null)
  const [editingTargets, setEditingTargets] = useState(false)
  const [compareId, setCompareId] = useState<string>('')
  const [copyNote, setCopyNote] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const numericValues = useMemo(() => {
    const byPosition = {} as Record<PositionKey, Record<string, number>>
    for (const key of POSITION_KEYS) {
      const parsed: Record<string, number> = {}
      for (const [id, raw] of Object.entries(values[key])) {
        const n = Number(raw.replace(',', '.'))
        if (raw.trim() !== '' && Number.isFinite(n)) parsed[id] = n
      }
      byPosition[key] = parsed
    }
    return byPosition
  }, [values])

  const analysis = useMemo(() => {
    // The targets module holds the overrides, so push them before analysing.
    setTargetOverrides(overrides)
    return analyzeAll(numericValues, hands, opportunities)
  }, [numericValues, hands, opportunities, overrides])

  const hasData = analysis.positionsWithData.length > 0

  useEffect(() => {
    // A page with nothing in it must not overwrite a real session — otherwise
    // opening the tool in a second tab wipes what the first tab saved.
    const hasAnything =
      hasData || snapshots.length > 0 || Object.keys(overrides).length > 0
    if (!hasAnything) return
    saveState({
      current: { values: numericValues, hands, opportunities },
      snapshots,
      overrides,
    })
  }, [hasData, numericValues, hands, opportunities, snapshots, overrides])

  const tabCounts = useMemo(() => {
    const counts = {} as Record<PositionKey, number>
    for (const key of POSITION_KEYS) counts[key] = Object.keys(numericValues[key]).length
    return counts
  }, [numericValues])

  const report = analysis.byPosition[activeTab] ?? null
  const activePosition = activeTab === 'overall' ? undefined : (activeTab as Position)

  const positionRelevance = useMemo(() => {
    const handCount = hands[activeTab]
    if (!handCount || handCount <= 0) {
      return {
        level: 'insufficient' as RelevanceLevel,
        note: 'Hand count unknown — treat as directional only.',
      }
    }
    const level = relevanceFromHands(handCount)
    return {
      level,
      note: t('{hands} hands · {relevance}', {
        hands: handCount.toLocaleString(),
        relevance: t(relevanceLabel(level)).toLowerCase(),
      }),
    }
  }, [hands, activeTab, t])

  const applyParsedText = (text: string) => {
    const positional = parsePositionalReport(text)
    if (positional.isTable && positional.matched > 0) {
      const next = emptyValues()
      const nextHands: HandsByPosition = {}
      for (const key of POSITION_KEYS) {
        const stats = positional.positions[key]
        if (stats) {
          for (const [id, value] of Object.entries(stats)) next[key][id] = String(value)
        }
        if (positional.hands[key]) nextHands[key] = positional.hands[key]
      }
      setValues(next)
      setHands(nextHands)
      setOpportunities(positional.opportunities)
      const positionsFound = POSITION_KEYS.filter((key) => positional.positions[key])
      setActiveTab(positionsFound.includes('overall') ? 'overall' : (positionsFound[0] ?? 'overall'))
      const totalHands = nextHands.overall ?? 0
      const handsNote = totalHands > 0 ? ` · ${totalHands.toLocaleString()} total hands` : ''
      const seats = positionsFound.filter((k) => k !== 'overall')
      setParseMessage(
        `Recognized ${positional.matched} values across ${seats.length} seat${seats.length === 1 ? '' : 's'}: ${seats.map((k) => POSITION_LABELS[k]).join(', ')}${handsNote}. Overall is aggregated from the seats.`,
      )
      return
    }

    const flat = parseStatsReport(text)
    if (flat.matched === 0) {
      setParseMessage(
        'No stats recognized. Paste a positional CSV export or lines like "VPIP: 24.5".',
      )
      return
    }
    setValues((prev) => {
      const next = { ...prev, overall: { ...prev.overall } }
      for (const [id, value] of Object.entries(flat.values)) next.overall[id] = String(value)
      return next
    })
    setActiveTab('overall')
    setParseMessage(`Recognized ${flat.matched} overall stat${flat.matched === 1 ? '' : 's'} from the report.`)
  }

  const handleFile = async (file: File) => {
    const text = await file.text()
    setRawText(text)
    applyParsedText(text)
  }

  const setStat = (id: string, value: string) => {
    setValues((prev) => ({ ...prev, [activeTab]: { ...prev[activeTab], [id]: value } }))
  }

  const setOverride = (statId: string, bound: 0 | 1, raw: string) => {
    const key: Position | 'all' = activePosition ?? 'all'
    setOverrides((prev) => {
      const current =
        prev[statId]?.[key]?.range ??
        (activePosition ? getPositionRange(statId, activePosition) : null) ??
        effectiveRange(statId, activePosition)
      const next: [number, number] = [current[0], current[1]]
      const n = Number(raw.replace(',', '.'))
      if (raw.trim() !== '' && Number.isFinite(n)) next[bound] = n
      return { ...prev, [statId]: { ...prev[statId], [key]: { range: next } } }
    })
  }

  const clearOverrides = () => setOverrides({})

  const saveSnapshot = () => {
    const snapshot: Snapshot = {
      id: newSnapshotId(),
      label: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      savedAt: new Date().toISOString(),
      values: numericValues,
      hands,
      opportunities,
      score: analysis.overallScore,
    }
    setSnapshots((prev) => [snapshot, ...prev].slice(0, 20))
  }

  const deleteSnapshot = (id: string) => {
    setSnapshots((prev) => prev.filter((s) => s.id !== id))
    if (compareId === id) setCompareId('')
  }

  const loadSnapshot = (snapshot: Snapshot) => {
    const next = emptyValues()
    for (const key of POSITION_KEYS) {
      const bucket = snapshot.values[key]
      if (!bucket) continue
      for (const [id, value] of Object.entries(bucket)) next[key][id] = String(value)
    }
    setValues(next)
    setHands(snapshot.hands)
    setOpportunities(snapshot.opportunities)
    setParseMessage(`Loaded the snapshot from ${formatWhen(snapshot.savedAt)}.`)
  }

  const comparison = useMemo(() => {
    if (!compareId) return null
    const snapshot = snapshots.find((s) => s.id === compareId)
    if (!snapshot) return null
    return { snapshot, diff: diffSnapshots(snapshot, { values: numericValues }) }
  }, [compareId, snapshots, numericValues])

  const copyReport = async () => {
    const markdown = reportToMarkdown(analysis)
    try {
      await navigator.clipboard.writeText(markdown)
      setCopyNote('Report copied as Markdown.')
      return
    } catch {
      // The async clipboard needs focus and a secure context; fall back to the
      // old selection trick, which works in more places.
    }
    if (copyViaTextarea(markdown)) {
      setCopyNote('Report copied as Markdown.')
    } else {
      setCopyNote('Could not reach the clipboard — use Download instead.')
    }
  }

  const downloadReport = () => {
    const blob = new Blob([reportToMarkdown(analysis)], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `leak-finder-${new Date().toISOString().slice(0, 10)}.md`
    link.click()
    URL.revokeObjectURL(url)
    setCopyNote('Report downloaded.')
  }

  const clearAll = () => {
    setValues(emptyValues())
    setHands({})
    setOpportunities({})
    setRawText('')
    setParseMessage(null)
  }

  const visibleStats = STAT_DEFINITIONS.filter((def) => statAppliesTo(def.id, activeTab))
  const filledCount = tabCounts[activeTab]

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-5xl mx-auto">
      <header className="mb-6">
        <BackToMenu className="mb-2" />
        <h1 className="text-2xl font-bold text-white mb-1">Leak Finder</h1>
        <p className="text-sm text-slate-400">
          {t('Import a positional report from PokerTracker, Hold’em Manager or Hand2Note and compare every seat to healthy baselines.')}
        </p>
      </header>

      <div className="space-y-4">
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">{t('1 · Import your report')}</h2>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setRawText(PT4_SAMPLE_EXPORT)}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                {t('Example: PT4 CSV')}
              </button>
              <button
                type="button"
                onClick={() => setRawText(SAMPLE_HM3)}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                {t('Example: HM3 / H2N')}
              </button>
              <button
                type="button"
                onClick={() => setRawText(SAMPLE_OVERALL)}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                {t('Example: overall')}
              </button>
            </div>
          </div>

          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={8}
            placeholder={
              'Paste a positional CSV export (one row per seat)\nor flat stats like:\nVPIP: 24.5\nPFR: 19.2\nWTSD: 27'
            }
            className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 font-mono text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => applyParsedText(rawText)}
              disabled={rawText.trim() === ''}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {t('Analyze report')}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors"
            >
              {t('Import file (.csv / .txt)')}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleFile(file)
                e.target.value = ''
              }}
            />
            {hasData && (
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                {t('Clear')}
              </button>
            )}
            {parseMessage && <p className="text-sm text-slate-400">{t(parseMessage)}</p>}
          </div>
          <p className="text-xs text-slate-500">
            {t('PT4: Reports → stat report grouped by position → Export → CSV. HM3 and Hand2Note: any positional export with a header row. Count columns are read as sample sizes, dash (-) blanks are skipped, and HM3’s combined “Late” bucket is read as CO.')}
          </p>
        </Panel>

        {hasData && (
          <>
            <Panel>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-wrap items-center gap-6">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                      {t('Whole-game score')}
                    </p>
                    <p className={`text-5xl font-bold tabular-nums ${scoreColor(analysis.overallScore)}`}>
                      {analysis.overallScore}
                      <span className="text-xl text-slate-500"> / 100</span>
                    </p>
                  </div>
                  <div className="min-w-[12rem]">
                    <p className="text-sm text-slate-300">
                      {t(scoreSummary(analysis.overallScore, analysis.ranked.length))}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {t('{leaks} leaks across {seats} seats · weighted by how much sample backs each stat', {
                        leaks: analysis.ranked.length,
                        seats: analysis.positionsWithData.filter((k) => k !== 'overall').length,
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void copyReport()}
                    className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
                  >
                    {t('Copy report')}
                  </button>
                  <button
                    type="button"
                    onClick={downloadReport}
                    className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
                  >
                    {t('Download .md')}
                  </button>
                  <button
                    type="button"
                    onClick={saveSnapshot}
                    className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
                  >
                    {t('Save snapshot')}
                  </button>
                </div>
              </div>
              {copyNote && <p className="text-xs text-emerald-400">{t(copyNote)}</p>}
            </Panel>

            {analysis.ranked.length > 0 && (
              <Panel>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-sm font-semibold text-white">{t('Fix these first')}</h2>
                  <p className="text-xs text-slate-500">
                    {t('Ranked across every seat by how far off you are, discounted by sample size')}
                  </p>
                </div>
                <ol className="space-y-2">
                  {analysis.ranked.slice(0, 8).map((leak, index) => (
                    <PriorityRow key={`${leak.positionKey}:${leak.def.id}`} leak={leak} index={index} />
                  ))}
                </ol>
              </Panel>
            )}
          </>
        )}

        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">{t('2 · Stats by position')}</h2>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs text-slate-500">
                {filledCount} stat{filledCount === 1 ? '' : 's'} for {POSITION_LABELS[activeTab]}
                {formatHands(hands[activeTab]) ? ` · ${formatHands(hands[activeTab])}` : ''}
              </p>
              <button
                type="button"
                onClick={() => setEditingTargets((prev) => !prev)}
                className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                  editingTargets
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {editingTargets ? t('Done editing targets') : t('Edit targets')}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {POSITION_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === key
                    ? 'bg-indigo-600 text-white'
                    : tabCounts[key] > 0
                      ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                      : 'bg-slate-800/60 text-slate-500 hover:bg-slate-700/60'
                }`}
              >
                {POSITION_LABELS[key]}
                {hands[key] ? (
                  <span className="ml-1 text-[10px] opacity-70">
                    {hands[key]! >= 1000 ? `${Math.round(hands[key]! / 1000)}k` : hands[key]}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          {editingTargets && (
            <div className="rounded-md border border-indigo-900/60 bg-indigo-950/30 px-3 py-2 text-xs text-slate-300">
              <p>
                Editing the healthy band for <strong>{POSITION_LABELS[activeTab]}</strong>. These
                are opinions, not solver output — {BASELINE.note}
              </p>
              {Object.keys(overrides).length > 0 && (
                <button
                  type="button"
                  onClick={clearOverrides}
                  className="mt-1.5 text-[11px] text-indigo-300 hover:text-white transition-colors"
                >
                  Reset all {Object.keys(overrides).length} edited target
                  {Object.keys(overrides).length === 1 ? '' : 's'} to the bundled numbers
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {visibleStats.map((def) => {
              const range = effectiveRange(def.id, activePosition)
              const edited = overrides[def.id]?.[activePosition ?? 'all'] !== undefined
              return (
                <div key={def.id} className="flex items-center gap-2 rounded-md bg-slate-950/40 px-2 py-1.5">
                  <label className="flex-1 text-xs text-slate-300" htmlFor={`stat-${def.id}`}>
                    {def.label}
                  </label>
                  {editingTargets ? (
                    <span className="flex items-center gap-1">
                      <input
                        aria-label={`${def.label} target minimum`}
                        value={String(range[0])}
                        onChange={(e) => setOverride(def.id, 0, e.target.value)}
                        className={`w-12 rounded border bg-slate-950 px-1 py-0.5 text-right text-[11px] tabular-nums text-slate-200 ${
                          edited ? 'border-indigo-500' : 'border-slate-700'
                        }`}
                      />
                      <span className="text-[11px] text-slate-600">–</span>
                      <input
                        aria-label={`${def.label} target maximum`}
                        value={String(range[1])}
                        onChange={(e) => setOverride(def.id, 1, e.target.value)}
                        className={`w-12 rounded border bg-slate-950 px-1 py-0.5 text-right text-[11px] tabular-nums text-slate-200 ${
                          edited ? 'border-indigo-500' : 'border-slate-700'
                        }`}
                      />
                    </span>
                  ) : (
                    <>
                      <input
                        id={`stat-${def.id}`}
                        value={values[activeTab][def.id] ?? ''}
                        onChange={(e) => setStat(def.id, e.target.value)}
                        placeholder="—"
                        inputMode="decimal"
                        className="w-16 rounded border border-slate-700 bg-slate-950 px-2 py-0.5 text-right text-xs tabular-nums text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/60"
                      />
                      <span className="w-24 text-right text-[10px] tabular-nums text-slate-500">
                        {range[0]}–{range[1]}
                        {formatStatUnit(def.unit)}
                      </span>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </Panel>

        {report && report.results.length > 0 && (
          <>
            <Panel>
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                    {POSITION_LABELS[activeTab]} score
                  </p>
                  <p className={`text-4xl font-bold tabular-nums ${scoreColor(report.score)}`}>
                    {report.score}
                    <span className="text-lg text-slate-500"> / 100</span>
                  </p>
                </div>
                <div className="flex-1 min-w-[12rem]">
                  <p className="text-sm text-slate-300">{t(scoreSummary(report.score, report.leaks.length))}</p>
                  <p className={`text-xs mt-1 ${RELEVANCE_STYLES[positionRelevance.level]}`}>
                    {positionRelevance.note}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {t('{stats} stats analyzed · {leaks} leaks found', {
                      stats: report.results.length,
                      leaks: report.leaks.length,
                    })}
                  </p>
                </div>
              </div>
            </Panel>

            {CATEGORY_ORDER.map((category) => {
              const rows = report.results.filter((r) => r.def.category === category)
              if (rows.length === 0) return null
              return (
                <section key={category} className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                  <h3 className="text-sm font-semibold text-white mb-3">{t(CATEGORY_LABELS[category])}</h3>
                  <div className="space-y-2">
                    {rows.map((result) => (
                      <StatRow key={result.def.id} result={result} positionKey={activeTab} />
                    ))}
                  </div>
                </section>
              )
            })}
          </>
        )}

        {snapshots.length > 0 && (
          <Panel>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold text-white">{t('Progress')}</h2>
              <p className="text-xs text-slate-500">
                {t('Saved reports stay in this browser. Compare one to what is loaded now.')}
              </p>
            </div>

            <div className="space-y-1.5">
              {snapshots.map((snapshot) => (
                <div
                  key={snapshot.id}
                  className="flex flex-wrap items-center gap-3 rounded-md bg-slate-950/40 px-3 py-2 text-xs"
                >
                  <span className="text-slate-200">{formatWhen(snapshot.savedAt)}</span>
                  {snapshot.score !== undefined && (
                    <span className={`tabular-nums ${scoreColor(snapshot.score)}`}>
                      {snapshot.score}/100
                    </span>
                  )}
                  <span className="text-slate-500">
                    {Object.values(snapshot.values).reduce(
                      (sum, bucket) => sum + Object.keys(bucket ?? {}).length,
                      0,
                    )}{' '}
                    values
                  </span>
                  <div className="ml-auto flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCompareId(compareId === snapshot.id ? '' : snapshot.id)}
                      className={`transition-colors ${
                        compareId === snapshot.id
                          ? 'text-indigo-300'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {compareId === snapshot.id ? t('Hide changes') : t('Compare')}
                    </button>
                    <button
                      type="button"
                      onClick={() => loadSnapshot(snapshot)}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      {t('Load')}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSnapshot(snapshot.id)}
                      className="text-slate-600 hover:text-red-400 transition-colors"
                    >
                      {t('Delete')}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {comparison && (
              <div className="rounded-md border border-slate-800 bg-slate-950/40 p-3">
                <p className="mb-2 text-xs text-slate-400">
                  {comparison.diff.changed.length} stat
                  {comparison.diff.changed.length === 1 ? '' : 's'} moved since{' '}
                  {formatWhen(comparison.snapshot.savedAt)}
                  {comparison.diff.added > 0 ? ` · ${comparison.diff.added} new` : ''}
                </p>
                <div className="space-y-1">
                  {comparison.diff.changed.slice(0, 12).map((delta) => {
                    const def = STAT_DEFINITIONS.find((d) => d.id === delta.statId)
                    if (!def) return null
                    const unit = formatStatUnit(def.unit)
                    return (
                      <div
                        key={`${delta.positionKey}:${delta.statId}`}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span className="w-40 truncate text-slate-300">{def.label}</span>
                        <span className="w-14 text-slate-500">{POSITION_LABELS[delta.positionKey]}</span>
                        <span className="tabular-nums text-slate-500">
                          {delta.before}
                          {unit} → {delta.after}
                          {unit}
                        </span>
                        <span
                          className={`ml-auto tabular-nums ${
                            delta.change > 0 ? 'text-sky-400' : 'text-amber-400'
                          }`}
                        >
                          {delta.change > 0 ? '+' : ''}
                          {delta.change}
                          {unit}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </Panel>
        )}

        {!hasData && (
          <p className="text-sm text-slate-500">
            {t('Paste a report above, or type values into the grid, to see your leaks.')}
          </p>
        )}
      </div>
      <Footer />
    </div>
  )
}

/** The effective healthy band for a stat, overrides included. */
function effectiveRange(statId: string, position?: Position): [number, number] {
  const def = STAT_DEFINITIONS.find((d) => d.id === statId)
  const explicit = getPositionRange(statId, position)
  if (explicit) return explicit
  const target = getStatTarget(statId, position)
  if (target !== null && def) {
    const tol = def.unit === 'bb100' ? 2 : def.unit === 'ratio' ? 0.4 : target === 0 ? 0.5 : 2
    return [Math.max(0, Math.round((target - tol) * 100) / 100), Math.round((target + tol) * 100) / 100]
  }
  return def?.range ?? [0, 100]
}

function PriorityRow({ leak, index }: { leak: RankedLeak; index: number }) {
  const t = useT()
  const styles = SEVERITY_STYLES[leak.severity]
  const unit = formatStatUnit(leak.def.unit)
  const fix = fixFor(leak.def.id, leak.positionKey)

  return (
    <li className={`rounded-md border bg-slate-950/40 px-3 py-2.5 ${styles.border}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="w-5 text-sm tabular-nums text-slate-600">{index + 1}</span>
        <span className="text-sm font-medium text-white">{leak.def.label}</span>
        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
          {POSITION_LABELS[leak.positionKey]}
        </span>
        <span className="text-sm tabular-nums text-slate-200">
          {leak.value}
          {unit}
        </span>
        <span className="text-xs tabular-nums text-slate-500">
          target {leak.range[0]}–{leak.range[1]}
          {unit}
        </span>
        <span className={`ml-auto rounded px-2 py-0.5 text-[11px] font-semibold ${styles.badge}`}>
          {t(styles.label)} · {leak.direction === 'low' ? t('too low') : t('too high')}
        </span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">{t(leak.advice)}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
        {fix && (
          <a href={fix.href} className="text-indigo-300 hover:text-indigo-200 transition-colors">
            {fix.seat ? t('{verb} — {seat} charts', { verb: t(fix.verb), seat: fix.seat }) : t(fix.verb)} →
          </a>
        )}
        {leak.relevanceNote && <span className="text-slate-600">{leak.relevanceNote}</span>}
        {leak.capped && (
          <span className="text-amber-500/80">
            held at {styles.label.toLowerCase()} — too few spots to prove worse
          </span>
        )}
      </div>
    </li>
  )
}

function StatRow({ result, positionKey }: { result: StatResult; positionKey: PositionKey }) {
  const t = useT()
  const styles = SEVERITY_STYLES[result.severity]
  const unit = formatStatUnit(result.def.unit)
  const fix = result.severity === 'ok' ? null : fixFor(result.def.id, positionKey)

  return (
    <div className={`rounded-md border bg-slate-950/40 px-3 py-2.5 ${styles.border}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="w-36 text-sm font-medium text-white">{result.def.label}</span>
        <span className="w-16 text-sm tabular-nums text-slate-200">
          {result.value}
          {unit}
        </span>
        <span className="w-28 text-xs tabular-nums text-slate-500">
          target {result.range[0]}–{result.range[1]}
          {unit}
        </span>
        {result.opportunities !== undefined && (
          <span className={`text-[11px] tabular-nums ${RELEVANCE_STYLES[result.relevance]}`}>
            {result.opportunities.toLocaleString()} spots
          </span>
        )}
        <span className={`ml-auto rounded px-2 py-0.5 text-[11px] font-semibold ${styles.badge}`}>
          {t(styles.label)}
          {result.direction !== 'ok' &&
            (result.direction === 'low' ? ` · ${t('too low')}` : ` · ${t('too high')}`)}
        </span>
      </div>
      {result.severity !== 'ok' && (
        <p className="mt-1 text-xs leading-relaxed text-slate-400">{t(result.advice)}</p>
      )}
      {(fix || result.capped) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
          {fix && (
            <a href={fix.href} className="text-indigo-300 hover:text-indigo-200 transition-colors">
              {fix.seat ? t('{verb} — {seat} charts', { verb: t(fix.verb), seat: fix.seat }) : t(fix.verb)} →
            </a>
          )}
          {result.capped && (
            <span className="text-amber-500/80">
              too few spots to call this a {SEVERITY_STYLES[result.rawSeverity].label.toLowerCase()}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
