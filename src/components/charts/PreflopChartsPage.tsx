import { useMemo, useRef, useState } from 'react'
import { BackToMenu } from '../BackToMenu'
import { Footer } from '../Footer'
import { ChartLegend, ChartMatrix } from './ChartMatrix'
import starterFile from '../../content/preflopCharts.json'
import { formatRange, parseRangeString } from '../../lib/rangeParser'
import {
  COLOR_CLASSES,
  FOLD_ANSWER,
  FORMATS,
  LAYER_COLORS,
  POSITIONS,
  STORAGE_KEY,
  answerOptions,
  comboCount,
  createId,
  distinctStacks,
  nextQuestion,
  parseChartFile,
  resolveChart,
  serializeCharts,
  sortCharts,
  suggestColor,
  type ChartFormat,
  type ChartLayer,
  type DrillQuestion,
  type LayerColor,
  type Position,
  type PreflopChart,
} from '../../lib/preflopCharts'

const STARTER_CHARTS = parseChartFile(JSON.stringify(starterFile)).charts

type Mode = 'library' | 'drill'

function loadCharts(): PreflopChart[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return STARTER_CHARTS
    const parsed = parseChartFile(raw)
    return parsed.charts.length > 0 ? parsed.charts : STARTER_CHARTS
  } catch {
    return STARTER_CHARTS
  }
}

function persist(charts: readonly PreflopChart[]) {
  try {
    localStorage.setItem(STORAGE_KEY, serializeCharts(charts))
  } catch {
    // Private browsing or a full quota — the session still works in memory.
  }
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-slate-800 bg-slate-900/60 p-5 ${className}`}>
      {children}
    </section>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
        active ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
      }`}
    >
      {children}
    </button>
  )
}

const SUIT_COLOR: Record<string, string> = {
  '♠': 'text-slate-900',
  '♥': 'text-red-600',
  '♦': 'text-blue-600',
  '♣': 'text-emerald-700',
}

function HoleCards({ cards }: { cards: { rank: string; suit: string }[] }) {
  return (
    <div className="flex gap-2">
      {cards.map((card, index) => (
        <div
          key={index}
          className="flex h-20 w-14 flex-col items-center justify-center rounded-lg bg-slate-100 shadow-lg"
        >
          <span className={`text-2xl font-bold leading-none ${SUIT_COLOR[card.suit] ?? 'text-slate-900'}`}>
            {card.rank}
          </span>
          <span className={`text-xl leading-none ${SUIT_COLOR[card.suit] ?? 'text-slate-900'}`}>
            {card.suit}
          </span>
        </div>
      ))}
    </div>
  )
}

const blankChart = (): PreflopChart => ({
  id: createId('chart'),
  position: 'BTN',
  format: 'cEV',
  stackBb: 40,
  action: 'RFI',
  layers: [{ id: createId('layer'), label: 'Open', color: 'red', tokens: '' }],
})

export function PreflopChartsPage() {
  const [charts, setCharts] = useState<PreflopChart[]>(() => loadCharts())
  const [mode, setMode] = useState<Mode>('library')
  const [formatFilter, setFormatFilter] = useState<ChartFormat[]>([])
  const [positionFilter, setPositionFilter] = useState<Position[]>([])
  const [stackFilter, setStackFilter] = useState<number[]>([])
  const [draft, setDraft] = useState<PreflopChart | null>(null)
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [importNotice, setImportNotice] = useState<string | null>(null)
  const [resetArmed, setResetArmed] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const stacks = useMemo(() => distinctStacks(charts), [charts])

  const visible = useMemo(() => {
    const filtered = charts.filter(
      (chart) =>
        (formatFilter.length === 0 || formatFilter.includes(chart.format)) &&
        (positionFilter.length === 0 || positionFilter.includes(chart.position)) &&
        (stackFilter.length === 0 || stackFilter.includes(chart.stackBb)),
    )
    return sortCharts(filtered)
  }, [charts, formatFilter, positionFilter, stackFilter])

  const save = (next: PreflopChart[]) => {
    setCharts(next)
    persist(next)
  }

  const commitDraft = () => {
    if (!draft) return
    const cleaned: PreflopChart = {
      ...draft,
      action: draft.action.trim() || 'RFI',
      layers: draft.layers
        .map((layer) => ({ ...layer, label: layer.label.trim() || 'Range', tokens: layer.tokens.trim() }))
        .filter((layer) => layer.tokens !== ''),
    }
    if (cleaned.layers.length === 0) return

    const exists = charts.some((chart) => chart.id === cleaned.id)
    save(exists ? charts.map((chart) => (chart.id === cleaned.id ? cleaned : chart)) : [...charts, cleaned])
    setDraft(null)
  }

  const removeChart = (id: string) => {
    save(charts.filter((chart) => chart.id !== id))
    if (draft?.id === id) setDraft(null)
  }

  const handleImport = async (file: File) => {
    setImportErrors([])
    setImportNotice(null)
    const { charts: imported, errors } = parseChartFile(await file.text())
    if (imported.length > 0) {
      const byId = new Map(charts.map((chart) => [chart.id, chart]))
      for (const chart of imported) byId.set(chart.id, chart)
      save([...byId.values()])
      setImportNotice(`Imported ${imported.length} chart${imported.length === 1 ? '' : 's'} from ${file.name}`)
    }
    setImportErrors(errors)
  }

  /**
   * Saved charts shadow the bundled ones, so an updated shipped chart would
   * never appear once anything has been saved. This pulls the bundled set back
   * in, overwriting shipped charts by id but leaving the user's own untouched.
   */
  const restoreBundled = () => {
    const bundledIds = new Set(STARTER_CHARTS.map((chart) => chart.id))
    const mine = charts.filter((chart) => !bundledIds.has(chart.id))
    save([...STARTER_CHARTS, ...mine])
    setImportErrors([])
    setImportNotice(
      `Restored ${STARTER_CHARTS.length} bundled charts` +
        (mine.length > 0 ? ` · kept your ${mine.length}` : ''),
    )
  }

  /**
   * Throw away everything stored and go back to exactly the bundled set.
   * "Restore bundled" merges, so it cannot remove a chart that has been
   * dropped from the bundle — this can. Destructive, so it takes two clicks.
   */
  const resetToBundled = () => {
    if (!resetArmed) {
      setResetArmed(true)
      return
    }
    save([...STARTER_CHARTS])
    setResetArmed(false)
    setImportErrors([])
    setImportNotice(`Reset to the ${STARTER_CHARTS.length} bundled charts`)
  }

  const exportCharts = () => {
    const blob = new Blob([serializeCharts(charts)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'preflop-charts.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const toggle = <T,>(list: T[], value: T, set: (next: T[]) => void) => {
    set(list.includes(value) ? list.filter((item) => item !== value) : [...list, value])
  }

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="mx-auto w-full max-w-5xl">
        <BackToMenu className="mb-3" />
        <h1 className="text-3xl font-bold text-white">Preflop Charts</h1>
        <p className="mb-6 text-sm text-slate-400">
          MTT ranges by position and stack depth. Type a range, then drill yourself on it.
        </p>

        <div className="flex flex-col gap-4">
          <Panel>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-sm text-slate-400">Mode:</span>
              <Chip active={mode === 'library'} onClick={() => setMode('library')}>
                📚 Library
              </Chip>
              <Chip active={mode === 'drill'} onClick={() => setMode('drill')}>
                🎯 Drill
              </Chip>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-sm text-slate-400">Model:</span>
              <Chip active={formatFilter.length === 0} onClick={() => setFormatFilter([])}>
                Both
              </Chip>
              {FORMATS.map((format) => (
                <Chip
                  key={format}
                  active={formatFilter.includes(format)}
                  onClick={() => toggle(formatFilter, format, setFormatFilter)}
                >
                  {format}
                </Chip>
              ))}
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-sm text-slate-400">Position:</span>
              <Chip active={positionFilter.length === 0} onClick={() => setPositionFilter([])}>
                All
              </Chip>
              {POSITIONS.map((position) => (
                <Chip
                  key={position}
                  active={positionFilter.includes(position)}
                  onClick={() => toggle(positionFilter, position, setPositionFilter)}
                >
                  {position}
                </Chip>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-sm text-slate-400">Stack:</span>
              <Chip active={stackFilter.length === 0} onClick={() => setStackFilter([])}>
                Any
              </Chip>
              {stacks.map((stack) => (
                <Chip
                  key={stack}
                  active={stackFilter.includes(stack)}
                  onClick={() => toggle(stackFilter, stack, setStackFilter)}
                >
                  {stack}bb
                </Chip>
              ))}
            </div>

            <p className="mt-3 text-xs text-slate-500">
              {visible.length} of {charts.length} chart{charts.length === 1 ? '' : 's'} in scope
              {mode === 'drill' && ' — the drill deals from these'}
            </p>
          </Panel>

          {mode === 'drill' ? (
            <DrillPanel charts={visible} />
          ) : (
            <>
              {draft && (
                <ChartEditor
                  draft={draft}
                  onChange={setDraft}
                  onSave={commitDraft}
                  onCancel={() => setDraft(null)}
                />
              )}

              <Panel>
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setDraft(blankChart())}
                    className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
                  >
                    New chart
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 transition-colors hover:bg-slate-700"
                  >
                    Import JSON
                  </button>
                  <button
                    type="button"
                    onClick={restoreBundled}
                    title="Re-sync the charts that ship with the app, keeping any you added"
                    className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 transition-colors hover:bg-slate-700"
                  >
                    Restore bundled
                  </button>
                  <button
                    type="button"
                    onClick={resetToBundled}
                    onBlur={() => setResetArmed(false)}
                    title="Discard every saved chart and load only the bundled set"
                    className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                      resetArmed
                        ? 'border-rose-600 bg-rose-950/60 text-rose-200 hover:bg-rose-900/60'
                        : 'border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {resetArmed ? 'Click again to wipe' : 'Reset all'}
                  </button>
                  <button
                    type="button"
                    onClick={exportCharts}
                    className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 transition-colors hover:bg-slate-700"
                  >
                    Export JSON
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void handleImport(file)
                      e.target.value = ''
                    }}
                  />
                  {importNotice && <span className="text-xs text-emerald-400">{importNotice}</span>}
                </div>

                {importErrors.length > 0 && (
                  <ul className="mb-4 space-y-1 rounded-md border border-rose-900/60 bg-rose-950/30 p-3 text-xs text-rose-300">
                    {importErrors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                )}

                {visible.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">
                    No charts match these filters. Widen them, or add a chart.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {visible.map((chart) => (
                      <ChartCard
                        key={chart.id}
                        chart={chart}
                        onEdit={() => setDraft(structuredClone(chart))}
                        onDelete={() => removeChart(chart.id)}
                      />
                    ))}
                  </div>
                )}
              </Panel>
            </>
          )}

          <Panel>
            <details>
              <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-300">
                Range notation
              </summary>
              <div className="mt-3 grid gap-x-6 gap-y-1.5 text-xs text-slate-400 sm:grid-cols-2">
                {[
                  ['22+', 'every pair from 22 up'],
                  ['77-JJ', 'a run of pairs'],
                  ['AKs, 76s', 'one exact hand'],
                  ['K6s+', 'K6s through KQs — high card fixed, kicker climbs'],
                  ['A5s-A2s', 'a run of kickers under one high card'],
                  ['AJ+', 'no suffix means suited and offsuit'],
                  ['Ax', 'every hand with an ace on top, AA included'],
                  ['Axs / Axo', 'just the suited or offsuit half'],
                ].map(([token, meaning]) => (
                  <p key={token}>
                    <code className="text-slate-200">{token}</code>
                    <span className="text-slate-500"> — {meaning}</span>
                  </p>
                ))}
                <p className="sm:col-span-2 text-slate-500">
                  Separate with commas, spaces or new lines. Layers are checked top to bottom, so a hand in
                  two ranges belongs to the upper one.
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

function ChartCard({
  chart,
  onEdit,
  onDelete,
}: {
  chart: PreflopChart
  onEdit: () => void
  onDelete: () => void
}) {
  const resolved = useMemo(() => resolveChart(chart), [chart])

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
            {chart.position} · {chart.stackBb}bb
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                chart.format === 'ICM'
                  ? 'bg-violet-900/70 text-violet-300'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {chart.format}
            </span>
          </p>
          <p className="text-[11px] text-slate-500">{chart.action}</p>
        </div>
        <span className="shrink-0 tabular-nums text-[11px] text-slate-500">
          {resolved.pct.toFixed(1)}%
        </span>
      </div>

      <ChartMatrix chart={chart} size="sm" />

      <div className="flex flex-wrap gap-1.5">
        {resolved.layers.map(({ layer }) => (
          <span key={layer.id} className="inline-flex items-center gap-1 text-[10px] text-slate-500">
            <span className={`h-2 w-2 rounded-sm ${COLOR_CLASSES[layer.color].swatch}`} />
            {layer.label}
          </span>
        ))}
      </div>

      <div className="mt-auto flex gap-2 pt-1">
        <button
          type="button"
          onClick={onEdit}
          className="flex-1 rounded-md bg-slate-800 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-md px-2 py-1 text-xs text-slate-600 transition-colors hover:text-rose-400"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

function ChartEditor({
  draft,
  onChange,
  onSave,
  onCancel,
}: {
  draft: PreflopChart
  onChange: (chart: PreflopChart) => void
  onSave: () => void
  onCancel: () => void
}) {
  const resolved = useMemo(() => resolveChart(draft), [draft])
  // Layers whose colour the user picked by hand — naming them stops re-colouring.
  const [pinnedColors, setPinnedColors] = useState<Set<string>>(new Set())

  const setLayer = (index: number, patch: Partial<ChartLayer>) => {
    onChange({
      ...draft,
      layers: draft.layers.map((layer, i) => {
        if (i !== index) return layer
        const next = { ...layer, ...patch }
        // Renaming a layer re-colours it to match the convention, unless the
        // user has already chosen a colour for this layer themselves.
        if (patch.label !== undefined && patch.color === undefined && !pinnedColors.has(layer.id)) {
          next.color = suggestColor(patch.label) ?? next.color
        }
        return next
      }),
    })
  }

  const pinColor = (layer: ChartLayer, color: LayerColor) => {
    setPinnedColors((prev) => new Set(prev).add(layer.id))
    setLayer(draft.layers.indexOf(layer), { color })
  }

  const addLayer = () => {
    onChange({
      ...draft,
      layers: [
        ...draft.layers,
        {
          id: createId('layer'),
          label: '',
          color: LAYER_COLORS[draft.layers.length % LAYER_COLORS.length],
          tokens: '',
        },
      ],
    })
  }

  const canSave = draft.layers.some((layer) => layer.tokens.trim() !== '')

  return (
    <Panel className="border-indigo-800/60">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-300">
                <span aria-hidden="true" className="mr-1">
                  🪑
                </span>
                Position
              </span>
              <select
                value={draft.position}
                onChange={(e) => onChange({ ...draft, position: e.target.value as Position })}
                className="rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200"
              >
                {POSITIONS.map((position) => (
                  <option key={position} value={position}>
                    {position}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-300">
                <span aria-hidden="true" className="mr-1">
                  ⚖️
                </span>
                Model
              </span>
              <select
                value={draft.format}
                onChange={(e) => onChange({ ...draft, format: e.target.value as ChartFormat })}
                className="rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200"
              >
                {FORMATS.map((format) => (
                  <option key={format} value={format}>
                    {format}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-300">
                <span aria-hidden="true" className="mr-1">
                  🪙
                </span>
                Stack
              </span>
              <span className="relative">
                <input
                  type="number"
                  value={draft.stackBb}
                  onChange={(e) => onChange({ ...draft, stackBb: Number(e.target.value) })}
                  className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                  bb
                </span>
              </span>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-300">
                <span aria-hidden="true" className="mr-1">
                  🎬
                </span>
                Action
              </span>
              <input
                type="text"
                value={draft.action}
                onChange={(e) => onChange({ ...draft, action: e.target.value })}
                placeholder="RFI, vs BTN open…"
                className="rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600"
              />
            </label>
          </div>

          {draft.layers.map((layer, index) => (
            <LayerEditor
              key={layer.id}
              layer={layer}
              index={index}
              canRemove={draft.layers.length > 1}
              onChange={(patch) => setLayer(index, patch)}
              onPickColor={(color) => pinColor(layer, color)}
              onRemove={() =>
                onChange({ ...draft, layers: draft.layers.filter((_, i) => i !== index) })
              }
            />
          ))}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={addLayer}
              className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-800"
            >
              + Add range layer
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={!canSave}
              className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              Save chart
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-slate-500 transition-colors hover:text-slate-300"
            >
              Cancel
            </button>
          </div>

          {resolved.errors.length > 0 && (
            <ul className="space-y-1 rounded-md border border-rose-900/60 bg-rose-950/30 p-3 text-xs text-rose-300">
              {resolved.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <ChartMatrix chart={draft} />
          <ChartLegend chart={draft} />
        </div>
      </div>
    </Panel>
  )
}

function LayerEditor({
  layer,
  index,
  canRemove,
  onChange,
  onPickColor,
  onRemove,
}: {
  layer: ChartLayer
  index: number
  canRemove: boolean
  onChange: (patch: Partial<ChartLayer>) => void
  onPickColor: (color: LayerColor) => void
  onRemove: () => void
}) {
  const parsed = useMemo(() => parseRangeString(layer.tokens), [layer.tokens])
  const combos = comboCount(parsed.labels)
  const canonical = useMemo(() => formatRange(parsed.labels), [parsed.labels])

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={layer.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder={`Range ${index + 1}`}
          className="w-32 rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-600"
        />
        <div className="flex gap-1">
          {LAYER_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={COLOR_CLASSES[color].name}
              title={COLOR_CLASSES[color].name}
              onClick={() => onPickColor(color)}
              className={`h-5 w-5 rounded-sm ${COLOR_CLASSES[color].swatch} ${
                layer.color === color ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-950' : 'opacity-50'
              }`}
            />
          ))}
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="ml-auto text-xs text-slate-600 transition-colors hover:text-rose-400"
          >
            Remove
          </button>
        )}
      </div>

      <textarea
        value={layer.tokens}
        onChange={(e) => onChange({ tokens: e.target.value })}
        rows={2}
        placeholder="22+, Ax, K6s+, 76s"
        className="w-full resize-y rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
      />

      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 text-[11px]">
        <span className="tabular-nums text-slate-400">
          {combos} combos · {((combos / 1326) * 100).toFixed(1)}%
        </span>
        {canonical && <span className="font-mono text-slate-600">{canonical}</span>}
      </div>

      {parsed.errors.length > 0 && (
        <p className="mt-1.5 text-[11px] text-rose-400">{parsed.errors.join(' · ')}</p>
      )}
    </div>
  )
}

function DrillPanel({ charts }: { charts: PreflopChart[] }) {
  const [question, setQuestion] = useState<DrillQuestion | null>(() => nextQuestion(charts))
  const [answer, setAnswer] = useState<string | null>(null)
  const [right, setRight] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)

  // Restart whenever the chart set in scope changes.
  const [scopeKey, setScopeKey] = useState(() => charts.map((chart) => chart.id).join('|'))
  const currentKey = charts.map((chart) => chart.id).join('|')
  if (currentKey !== scopeKey) {
    setScopeKey(currentKey)
    setQuestion(nextQuestion(charts))
    setAnswer(null)
    setRight(0)
    setWrong(0)
    setStreak(0)
    setBestStreak(0)
  }

  if (charts.length === 0) {
    return (
      <Panel>
        <p className="py-8 text-center text-sm text-slate-500">
          No charts in scope. Widen the filters above to drill.
        </p>
      </Panel>
    )
  }

  if (!question) {
    return (
      <Panel>
        <p className="py-8 text-center text-sm text-slate-500">Nothing to deal.</p>
      </Panel>
    )
  }

  const options = answerOptions(question.chart)
  const correct = answer !== null && question.accepted.includes(answer)
  const answered = right + wrong

  const submit = (choice: string) => {
    if (answer !== null) return
    setAnswer(choice)
    if (question.accepted.includes(choice)) {
      setRight((value) => value + 1)
      setStreak((value) => {
        const next = value + 1
        setBestStreak((best) => Math.max(best, next))
        return next
      })
    } else {
      setWrong((value) => value + 1)
      setStreak(0)
    }
  }

  const advance = () => {
    setQuestion(nextQuestion(charts))
    setAnswer(null)
  }

  return (
    <Panel>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="text-slate-400">
          Dealing from {charts.length} chart{charts.length === 1 ? '' : 's'}
        </span>
        <span className="flex items-center gap-3">
          <span className="text-emerald-400">{right} right</span>
          <span className="text-rose-400">{wrong} wrong</span>
          {answered > 0 && (
            <span className="text-slate-500">{Math.round((right / answered) * 100)}%</span>
          )}
          <span className="text-slate-500">
            streak {streak} · best {bestStreak}
          </span>
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {question.chart.position} · {question.chart.stackBb}bb · {question.chart.action}
              <span
                className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                  question.chart.format === 'ICM'
                    ? 'bg-violet-900/70 text-violet-300'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {question.chart.format}
              </span>
            </p>

            <div className="mt-4 flex items-center gap-4">
              <HoleCards cards={question.hand.cards} />
              <span className="text-lg font-semibold text-slate-300">{question.hand.label}</span>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {options.map((option) => {
                const layer = question.chart.layers.find((item) => item.label.trim() === option)
                const base = layer
                  ? COLOR_CLASSES[layer.color].button
                  : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'

                let style = base
                if (answer !== null) {
                  if (question.accepted.includes(option)) style = 'border-emerald-500 bg-emerald-900/50 text-emerald-100'
                  else if (option === answer) style = 'border-rose-600 bg-rose-950/50 text-rose-200'
                  else style = 'border-slate-800 bg-slate-950/40 text-slate-600'
                }

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => submit(option)}
                    disabled={answer !== null}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${style}`}
                  >
                    {option}
                    {answer !== null && question.accepted.includes(option) && <span className="ml-1.5">✓</span>}
                    {answer !== null && option === answer && !question.accepted.includes(option) && (
                      <span className="ml-1.5">✗</span>
                    )}
                  </button>
                )
              })}
            </div>

            {answer !== null && (
              <div className="mt-4">
                <p className={`text-sm font-semibold ${correct ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {correct
                    ? question.accepted.length > 1
                      ? `Correct — ${question.hand.label} is a mix, either answer is fine`
                      : 'Correct'
                    : `${question.hand.label} is a ${question.expected === FOLD_ANSWER ? 'fold' : question.expected} here`}
                </p>
                <button
                  type="button"
                  onClick={advance}
                  autoFocus
                  className="mt-3 w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
                >
                  Next hand
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {answer !== null ? (
            <>
              <ChartMatrix chart={question.chart} highlight={question.hand.label} />
              <ChartLegend chart={question.chart} />
            </>
          ) : (
            <div className="flex h-full min-h-[200px] items-center justify-center rounded-lg border border-dashed border-slate-800 p-4 text-center text-xs text-slate-600">
              The chart appears once you answer.
            </div>
          )}
        </div>
      </div>
    </Panel>
  )
}
