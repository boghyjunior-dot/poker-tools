import { useMemo, useRef, useState } from 'react'
import { BackToMenu } from '../BackToMenu'
import { Footer } from '../Footer'
import { PT4_SAMPLE_EXPORT } from '../../lib/pt4SampleExport'
import {
  analyzeStats,
  CATEGORY_LABELS,
  formatStatUnit,
  getStatRange,
  getStatTarget,
  parsePositionalReport,
  parseStatsReport,
  POSITION_KEYS,
  POSITION_LABELS,
  relevanceFromHands,
  relevanceLabel,
  STAT_DEFINITIONS,
  statAppliesTo,
  type AnalysisContext,
  type Position,
  type PositionKey,
  type RelevanceLevel,
  type Severity,
  type StatCategory,
  type StatResult,
} from '../../lib/leakfinder'

const SEVERITY_STYLES: Record<Severity, { badge: string; border: string; label: string }> = {
  ok: { badge: 'bg-emerald-900/60 text-emerald-300', border: 'border-slate-800', label: 'OK' },
  minor: { badge: 'bg-amber-900/60 text-amber-300', border: 'border-amber-800/50', label: 'Minor leak' },
  moderate: { badge: 'bg-orange-900/60 text-orange-300', border: 'border-orange-800/60', label: 'Moderate leak' },
  major: { badge: 'bg-red-900/60 text-red-300', border: 'border-red-800/70', label: 'Major leak' },
}

const CATEGORY_ORDER: StatCategory[] = ['preflop', 'postflop', 'showdown']

const SAMPLE_OVERALL = `VPIP: 31.2
Raise First: 14.5
3Bet PF: 4.1
2Bet PF & Fold: 68
Fold to Steal: 74
CBet F IP (HU): 78
Fold to F Cbet (HU): 61
CBet T (HU): 42
All-In Adj BB/100: -1.2`

const SAMPLE_PT4 = PT4_SAMPLE_EXPORT

const RELEVANCE_STYLES: Record<RelevanceLevel, string> = {
  insufficient: 'text-red-400',
  low: 'text-amber-400',
  medium: 'text-slate-300',
  high: 'text-emerald-400',
}

type ValuesByPosition = Record<PositionKey, Record<string, string>>
type HandsByPosition = Record<PositionKey, number | undefined>

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

export function LeakFinderPage() {
  const [rawText, setRawText] = useState('')
  const [values, setValues] = useState<ValuesByPosition>(emptyValues)
  const [hands, setHands] = useState<HandsByPosition>({} as HandsByPosition)
  const [weightedOverallWinrate, setWeightedOverallWinrate] = useState(false)
  const [activeTab, setActiveTab] = useState<PositionKey>('overall')
  const [analyzed, setAnalyzed] = useState(false)
  const [parseMessage, setParseMessage] = useState<string | null>(null)
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

  const tabCounts = useMemo(() => {
    const counts = {} as Record<PositionKey, number>
    for (const key of POSITION_KEYS) {
      counts[key] = Object.keys(numericValues[key]).length
    }
    return counts
  }, [numericValues])

  const analysisContext = useMemo((): AnalysisContext => ({
    hands: hands[activeTab],
  }), [hands, activeTab])

  const report = useMemo(() => {
    if (!analyzed) return null
    const position = activeTab === 'overall' ? undefined : activeTab
    return analyzeStats(numericValues[activeTab], position, analysisContext)
  }, [analyzed, numericValues, activeTab, analysisContext])

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
      note: `${handCount.toLocaleString()} hands · ${relevanceLabel(level).toLowerCase()}`,
    }
  }, [hands, activeTab])

  const applyParsedText = (text: string) => {
    const positional = parsePositionalReport(text)
    if (positional.isTable && positional.matched > 0) {
      const next = emptyValues()
      const nextHands = {} as HandsByPosition
      for (const key of POSITION_KEYS) {
        const stats = positional.positions[key]
        if (!stats) continue
        for (const [id, value] of Object.entries(stats)) {
          next[key][id] = String(value)
        }
        if (positional.hands[key]) nextHands[key] = positional.hands[key]
      }
      setValues(next)
      setHands(nextHands)
      setWeightedOverallWinrate(positional.weightedOverallWinrate)
      const positionsFound = POSITION_KEYS.filter((key) => positional.positions[key])
      const firstTab = positionsFound.includes('overall') ? 'overall' : positionsFound[0] ?? 'overall'
      setActiveTab(firstTab)
      const totalHands = nextHands.overall ?? positionsFound.reduce((sum, key) => sum + (nextHands[key] ?? 0), 0)
      const handsNote = totalHands > 0 ? ` · ${totalHands.toLocaleString()} total hands` : ''
      const winrateNote = positional.weightedOverallWinrate ? ' · overall winrate weighted by hands' : ''
      setParseMessage(
        `Recognized ${positional.matched} values across ${positionsFound.length} position${positionsFound.length === 1 ? '' : 's'}: ${positionsFound.map((k) => POSITION_LABELS[k]).join(', ')}${handsNote}${winrateNote}.`,
      )
      setAnalyzed(true)
      return
    }

    const flat = parseStatsReport(text)
    if (flat.matched === 0) {
      setParseMessage('No stats recognized. Paste a PT4 position export (CSV) or lines like "VPIP: 24.5".')
      return
    }
    setValues((prev) => {
      const next = { ...prev, overall: { ...prev.overall } }
      for (const [id, value] of Object.entries(flat.values)) {
        next.overall[id] = String(value)
      }
      return next
    })
    setActiveTab('overall')
    setParseMessage(`Recognized ${flat.matched} overall stat${flat.matched === 1 ? '' : 's'} from the report.`)
    setAnalyzed(true)
  }

  const handleFile = async (file: File) => {
    const text = await file.text()
    setRawText(text)
    applyParsedText(text)
  }

  const setStat = (id: string, value: string) => {
    setValues((prev) => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], [id]: value },
    }))
  }

  const activePosition = activeTab === 'overall' ? undefined : activeTab
  const visibleStats = STAT_DEFINITIONS.filter((def) => statAppliesTo(def.id, activeTab))
  const filledCount = tabCounts[activeTab]

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-5xl mx-auto">
      <header className="mb-6">
        <BackToMenu className="mb-2" />
        <h1 className="text-2xl font-bold text-white mb-1">Leak Finder</h1>
        <p className="text-sm text-slate-400">
          Import a positional report from PokerTracker 4 and compare stats to online MTT baselines.
        </p>
      </header>

      <div className="space-y-4">
        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">1 · Import your report</h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setRawText(SAMPLE_PT4)}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                Example: PT4 CSV export
              </button>
              <button
                type="button"
                onClick={() => setRawText(SAMPLE_OVERALL)}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                Example: overall
              </button>
            </div>
          </div>

          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={8}
            placeholder={'Paste a PT4 positional CSV export (quoted fields, SB/BB/EP/MP/CO/BTN rows)\nor flat stats like:\nVPIP: 24.5\nRaise First: 19.2\n3Bet PF: 8.1'}
            className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 font-mono text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => applyParsedText(rawText)}
              disabled={rawText.trim() === ''}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Analyze report
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors"
            >
              Import PT4 file (.csv / .txt)
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
            {parseMessage && <p className="text-sm text-slate-400">{parseMessage}</p>}
          </div>
          <p className="text-xs text-slate-500">
            PT4: Reports → your stat report grouped by position → Export → CSV. Paste the full file
            (header + position rows). Dash (-) blanks and Count columns are skipped automatically.
          </p>
        </section>

        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">2 · Stats by position</h2>
            <p className="text-xs text-slate-500">
              {filledCount} stat{filledCount === 1 ? '' : 's'} for {POSITION_LABELS[activeTab]}
              {formatHands(hands[activeTab]) ? ` · ${formatHands(hands[activeTab])}` : ''}
              {activeTab === 'overall' && weightedOverallWinrate ? ' · winrate weighted by position hands' : ''}
            </p>
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
                  <span className="ml-1 rounded bg-black/25 px-1 text-[10px] tabular-nums text-slate-400">
                    {(hands[key]! / 1000).toFixed(0)}k
                  </span>
                ) : tabCounts[key] > 0 ? (
                  <span className="ml-1.5 rounded bg-black/25 px-1 text-[10px] tabular-nums">
                    {tabCounts[key]}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleStats.map((def) => {
              const target = getStatTarget(def.id, activePosition)
              const [min, max] = getStatRange(def, activePosition)
              const unit = formatStatUnit(def.unit)
              return (
                <label
                  key={def.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2"
                >
                  <span className="text-sm text-slate-300">
                    {def.label}
                    <span className="block text-[10px] text-slate-500">
                      {target !== null ? `target ${target}${unit}` : `target ${min}–${max}${unit}`}
                    </span>
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={values[activeTab][def.id] ?? ''}
                    onChange={(e) => setStat(def.id, e.target.value)}
                    placeholder="—"
                    className="w-16 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-right text-sm text-white tabular-nums focus:outline-none focus:ring-1 focus:ring-indigo-500/60"
                  />
                </label>
              )
            })}
          </div>

          {!analyzed && filledCount > 0 && (
            <button
              type="button"
              onClick={() => setAnalyzed(true)}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              Analyze stats
            </button>
          )}
        </section>

        {report && report.results.length > 0 && (
          <>
            <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                    {POSITION_LABELS[activeTab]} leak score
                  </p>
                  <p className={`text-5xl font-bold tabular-nums ${scoreColor(report.score)}`}>
                    {report.score}
                    <span className="text-xl text-slate-500"> / 100</span>
                  </p>
                </div>
                <div className="flex-1 min-w-[12rem]">
                  <p className="text-sm text-slate-300">{scoreSummary(report.score, report.leaks.length)}</p>
                  <p className={`text-xs mt-1 ${RELEVANCE_STYLES[positionRelevance.level]}`}>
                    {positionRelevance.note}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {report.results.length} stats analyzed · {report.leaks.length} leak{report.leaks.length === 1 ? '' : 's'} found
                    {activePosition ? ` · targets adjusted for ${POSITION_LABELS[activeTab]}` : ''}
                  </p>
                </div>
              </div>
            </section>

            {CATEGORY_ORDER.map((category) => {
              const rows = report.results.filter((r) => r.def.category === category)
              if (rows.length === 0) return null
              return (
                <section key={category} className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                  <h3 className="text-sm font-semibold text-white mb-3">{CATEGORY_LABELS[category]}</h3>
                  <div className="space-y-2">
                    {rows.map((result) => (
                      <StatRow key={result.def.id} result={result} position={activePosition} />
                    ))}
                  </div>
                </section>
              )
            })}
          </>
        )}

        {report && report.results.length === 0 && (
          <p className="text-sm text-amber-400">
            No stats for {POSITION_LABELS[activeTab]} yet — enter values above or pick another tab.
          </p>
        )}
      </div>
      <Footer />
    </div>
  )
}

function StatRow({ result, position }: { result: StatResult; position?: Position }) {
  const styles = SEVERITY_STYLES[result.severity]
  const target = getStatTarget(result.def.id, position)
  const unit = formatStatUnit(result.def.unit)

  return (
    <div className={`rounded-md border bg-slate-950/40 px-3 py-2.5 ${styles.border}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-sm font-medium text-white w-36">{result.def.label}</span>
        <span className="text-sm tabular-nums text-slate-200 w-16">
          {result.value}{unit}
        </span>
        <span className="text-xs tabular-nums text-slate-500 w-24">
          target {target !== null ? target : `${result.range[0]}–${result.range[1]}`}{unit}
        </span>
        <span className={`ml-auto rounded px-2 py-0.5 text-[11px] font-semibold ${styles.badge}`}>
          {styles.label}
          {result.direction !== 'ok' && (result.direction === 'low' ? ' · too low' : ' · too high')}
        </span>
      </div>
      {result.severity !== 'ok' && (
        <p className="mt-1 text-xs leading-relaxed text-slate-400">{result.advice}</p>
      )}
    </div>
  )
}
