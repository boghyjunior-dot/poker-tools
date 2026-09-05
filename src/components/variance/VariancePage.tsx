import { useState } from 'react'
import { BackToMenu } from '../BackToMenu'
import { Footer } from '../Footer'
import { FanChart, ResultHistogram } from './VarianceCharts'
import { formatMoney } from '../../lib/formatNumber'
import {
  MAX_SAMPLES,
  MAX_TOURNAMENTS,
  simulateVariance,
  type VarianceResult,
} from '../../lib/mttVariance'

interface FormState {
  buyIn: string
  fee: string
  fieldSize: string
  itmPct: string
  roiPct: string
  tournaments: string
  samples: string
  bankroll: string
  seed: string
}

const DEFAULTS: FormState = {
  buyIn: '25',
  fee: '8',
  fieldSize: '1000',
  itmPct: '15',
  roiPct: '20',
  tournaments: '1000',
  samples: '1000',
  bankroll: '5000',
  seed: '1',
}

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

function Stat({
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  label: string
  value: string
  sub?: string
  tone?: 'neutral' | 'good' | 'bad'
}) {
  const toneClass =
    tone === 'good' ? 'text-emerald-400' : tone === 'bad' ? 'text-rose-400' : 'text-white'
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold ${toneClass}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
    </div>
  )
}

function Legend() {
  const items = [
    { color: '#e2e8f0', label: 'Median', dash: false },
    { color: '#f59e0b', label: 'Expected value', dash: true },
    { color: '#6366f1', label: '25–75% / 5–95% of runs', dash: false, block: true },
    { color: '#94a3b8', label: '20 individual runs', dash: false },
  ]
  return (
    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-[11px] text-slate-500">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          {item.block ? (
            <span className="h-2.5 w-4 rounded-sm" style={{ backgroundColor: item.color, opacity: 0.3 }} />
          ) : (
            <span
              className="inline-block h-0.5 w-4"
              style={{
                backgroundColor: item.dash ? 'transparent' : item.color,
                backgroundImage: item.dash
                  ? `repeating-linear-gradient(to right, ${item.color} 0 4px, transparent 4px 7px)`
                  : undefined,
              }}
            />
          )}
          {item.label}
        </span>
      ))}
    </div>
  )
}

export function VariancePage() {
  const [form, setForm] = useState<FormState>(DEFAULTS)
  const [result, setResult] = useState<VarianceResult | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (key: keyof FormState) => (value: string) => setForm((prev) => ({ ...prev, [key]: value }))

  const run = () => {
    const buyIn = Number(form.buyIn)
    const fee = Number(form.fee)
    const fieldSize = Math.floor(Number(form.fieldSize))
    const itmPct = Number(form.itmPct)
    const roiPct = Number(form.roiPct)
    const tournaments = Math.floor(Number(form.tournaments))
    const samples = Math.floor(Number(form.samples))
    const bankroll = form.bankroll.trim() === '' ? undefined : Number(form.bankroll)
    const seed = Math.floor(Number(form.seed)) || 1

    if (!(buyIn > 0)) return setError('Buy-in must be greater than 0.')
    if (!(fee >= 0)) return setError('Fee cannot be negative.')
    if (!(fieldSize >= 2)) return setError('Field size must be at least 2.')
    if (!(itmPct > 0 && itmPct <= 100)) return setError('Paid places must be between 0 and 100%.')
    if (!(roiPct > -100)) return setError('ROI must be greater than -100%.')
    if (!(tournaments >= 1)) return setError('Run at least 1 tournament.')
    if (!(samples >= 1)) return setError('Run at least 1 simulation.')
    if (bankroll !== undefined && !(bankroll > 0)) return setError('Bankroll must be greater than 0.')

    setError(null)
    setRunning(true)
    // Yield a frame so the button can paint its running state before the
    // simulation blocks the main thread.
    setTimeout(() => {
      try {
        setResult(
          simulateVariance({
            buyIn,
            fee,
            fieldSize,
            itmPct,
            roiPct,
            tournaments,
            samples,
            bankroll,
            seed,
          }),
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Simulation failed')
      } finally {
        setRunning(false)
      }
    }, 0)
  }

  const stats = result?.stats
  const cost = stats?.costPerTournament ?? 0
  const inBuyIns = (value: number) => (cost > 0 ? `${(value / cost).toFixed(1)} buy-ins` : '')

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="mx-auto w-full max-w-4xl">
        <BackToMenu className="mb-3" />
        <h1 className="text-3xl font-bold text-white">MTT Variance</h1>
        <p className="mb-6 text-sm text-slate-400">
          Simulate a tournament sample: downswings, confidence bands and risk of ruin.
        </p>

        <div className="flex flex-col gap-4">
          <Panel>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label="Buy-in" emoji="💵" value={form.buyIn} onChange={set('buyIn')} hint="Prize-pool portion" />
              <Field label="Fee / rake" emoji="🧾" value={form.fee} onChange={set('fee')} hint="Added on top" />
              <Field label="Field size" emoji="👥" value={form.fieldSize} onChange={set('fieldSize')} hint="Average entrants" />
              <Field label="Paid places" emoji="🏆" value={form.itmPct} onChange={set('itmPct')} suffix="%" hint="Top % of field" />
              <Field label="Your ROI" emoji="📈" value={form.roiPct} onChange={set('roiPct')} suffix="%" hint="Return on total cost" />
              <Field
                label="Tournaments" emoji="🎟️"
                value={form.tournaments}
                onChange={set('tournaments')}
                hint={`Sample size · max ${MAX_TOURNAMENTS.toLocaleString('en-US')}`}
              />
              <Field
                label="Simulations" emoji="🔁"
                value={form.samples}
                onChange={set('samples')}
                hint={`Runs to average · max ${MAX_SAMPLES.toLocaleString('en-US')}`}
              />
              <Field
                label="Bankroll" emoji="🏦"
                value={form.bankroll}
                onChange={set('bankroll')}
                placeholder="optional"
                hint="For risk of ruin"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={run}
                disabled={running}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-700"
              >
                {running ? 'Simulating…' : 'Run simulation'}
              </button>
              <label className="flex items-center gap-2 text-xs text-slate-500">
                <span aria-hidden="true">🌱</span>
                Seed
                <input
                  type="number"
                  value={form.seed}
                  onChange={(e) => set('seed')(e.target.value)}
                  className="w-20 rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
                <span>same seed → same run</span>
              </label>
            </div>

            {error && (
              <p className="mt-3 rounded-md border border-rose-900/60 bg-rose-950/30 p-3 text-xs text-rose-300">
                {error}
              </p>
            )}
          </Panel>

          {!result && !running && (
            <Panel>
              <p className="py-8 text-center text-sm text-slate-500">
                Set your numbers and run a simulation to see the spread of outcomes.
              </p>
            </Panel>
          )}

          {result && stats && (
            <>
              <Panel>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat
                    label="Expected profit"
                    value={formatMoney(stats.expectedProfit)}
                    sub={inBuyIns(stats.expectedProfit)}
                    tone={stats.expectedProfit >= 0 ? 'good' : 'bad'}
                  />
                  <Stat
                    label="Std deviation"
                    value={formatMoney(stats.stdDevFinal)}
                    sub={inBuyIns(stats.stdDevFinal)}
                  />
                  <Stat
                    label="Chance of loss"
                    value={`${(stats.probLoss * 100).toFixed(1)}%`}
                    sub={`after ${Number(form.tournaments).toLocaleString('en-US')} MTTs`}
                    tone={stats.probLoss > 0.5 ? 'bad' : 'neutral'}
                  />
                  <Stat
                    label="ITM"
                    value={`${(stats.itmProbability * 100).toFixed(1)}%`}
                    sub={`${stats.paidPlaces.toLocaleString('en-US')} places paid`}
                  />
                  <Stat
                    label="Typical downswing"
                    value={formatMoney(stats.avgMaxDrawdown)}
                    sub={inBuyIns(stats.avgMaxDrawdown)}
                  />
                  <Stat
                    label="Worst downswing"
                    value={formatMoney(stats.worstMaxDrawdown)}
                    sub={inBuyIns(stats.worstMaxDrawdown)}
                    tone="bad"
                  />
                  <Stat
                    label="5th–95th percentile"
                    value={`${formatMoney(stats.percentiles.p5)} … ${formatMoney(stats.percentiles.p95)}`}
                    sub="90% of runs land here"
                  />
                  <Stat
                    label="Risk of ruin"
                    value={stats.riskOfRuin === null ? '—' : `${(stats.riskOfRuin * 100).toFixed(1)}%`}
                    sub={stats.riskOfRuin === null ? 'enter a bankroll' : 'busted at some point'}
                    tone={stats.riskOfRuin !== null && stats.riskOfRuin > 0.05 ? 'bad' : 'neutral'}
                  />
                </div>
              </Panel>

              <Panel>
                <h2 className="text-sm font-semibold text-white">Bankroll over time</h2>
                <p className="mb-2 text-xs text-slate-500">
                  {Number(form.samples).toLocaleString('en-US')} simulated runs of{' '}
                  {Number(form.tournaments).toLocaleString('en-US')} tournaments.
                </p>
                <FanChart result={result} />
                <Legend />
              </Panel>

              <Panel>
                <h2 className="text-sm font-semibold text-white">Where the runs finished</h2>
                <p className="mb-2 text-xs text-slate-500">
                  Final profit of every run. Red bars finished below break even.
                </p>
                <ResultHistogram bins={result.histogram} />
                <p className="mt-2 text-xs text-slate-500">
                  Median run finished at{' '}
                  <span className="text-slate-300">{formatMoney(stats.percentiles.p50)}</span> · a quarter
                  finished below{' '}
                  <span className="text-slate-300">{formatMoney(stats.percentiles.p25)}</span> and a quarter
                  above <span className="text-slate-300">{formatMoney(stats.percentiles.p75)}</span>.
                </p>
              </Panel>
            </>
          )}

          <Panel>
            <details>
              <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-300">
                How the model works
              </summary>
              <div className="mt-3 space-y-2 text-xs leading-relaxed text-slate-400">
                <p>
                  <span className="text-slate-300">Payouts.</span> The top slice of the field is paid, with
                  the prize for place <em>i</em> proportional to 1/<em>i</em> across the pool. That curve
                  tracks real MTT structures closely: the winner takes about 30% of the pool in a 100-runner
                  event, 18% at 1,000 entrants and 13% at 10,000, with a min-cash near one buy-in.
                </p>
                <p>
                  <span className="text-slate-300">Finishes.</span> Each tournament draws a finishing
                  position. A break-even player finishes uniformly across the field; a winning player's
                  finishes are skewed toward the top. The skew is solved numerically so the long-run result
                  matches the ROI you entered.
                </p>
                <p>
                  <span className="text-slate-300">Caveat.</span> This assumes a fixed field size, a fixed
                  ROI and no re-entries, and it says nothing about whether your ROI estimate is right. Treat
                  the spread as indicative, not a forecast.
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
