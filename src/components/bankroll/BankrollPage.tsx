import { useMemo, useState } from 'react'
import { BackToMenu } from '../BackToMenu'
import { Footer } from '../Footer'
import { formatMoney } from '../../lib/formatNumber'
import {
  analyzeBankroll,
  classifyBuyIns,
  ruinRiskAt,
  shotAt,
  TIER_DEFINITIONS,
  type RiskTier,
} from '../../lib/bankroll'

interface FormState {
  bankroll: string
  roiPct: string
  fieldSize: string
  itmPct: string
  feePct: string
  tournaments: string
  samples: string
  currentBuyIn: string
}

const DEFAULTS: FormState = {
  bankroll: '5000',
  roiPct: '10',
  fieldSize: '1000',
  itmPct: '15',
  feePct: '10',
  tournaments: '500',
  samples: '2000',
  currentBuyIn: '22',
}

const TIER_STYLES: Record<RiskTier, { border: string; badge: string; text: string }> = {
  aggressive: {
    border: 'border-rose-800/60',
    badge: 'bg-rose-900/60 text-rose-300',
    text: 'text-rose-300',
  },
  normal: {
    border: 'border-amber-800/60',
    badge: 'bg-amber-900/60 text-amber-300',
    text: 'text-amber-300',
  },
  conservative: {
    border: 'border-emerald-800/60',
    badge: 'bg-emerald-900/60 text-emerald-300',
    text: 'text-emerald-300',
  },
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
}: {
  label: string
  emoji?: string
  value: string
  onChange: (value: string) => void
  hint?: string
  suffix?: string
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
          className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
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

/** Money on this page is cash you check against an account, so it gets a symbol. */
const money = (value: number) => `$${formatMoney(value)}`

export function BankrollPage() {
  const [form, setForm] = useState<FormState>(DEFAULTS)
  const set = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const bankroll = num(form.bankroll)
  const roiPct = num(form.roiPct)
  const fieldSize = Math.floor(num(form.fieldSize))
  const itmPct = num(form.itmPct)
  const feePct = num(form.feePct)
  const tournaments = Math.floor(num(form.tournaments))
  const samples = Math.floor(num(form.samples))
  const currentBuyIn = num(form.currentBuyIn)

  const error = useMemo(() => {
    if (!(bankroll > 0)) return 'Enter a bankroll greater than 0.'
    if (!(fieldSize >= 2)) return 'Field size must be at least 2.'
    if (!(itmPct > 0 && itmPct <= 100)) return 'Paid places must be between 0 and 100%.'
    if (feePct < 0) return 'Fee cannot be negative.'
    if (!(tournaments >= 1)) return 'Simulate at least 1 tournament.'
    if (!(samples >= 1)) return 'Run at least 1 simulation.'
    return null
  }, [bankroll, fieldSize, itmPct, feePct, tournaments, samples])

  const result = useMemo(() => {
    if (error) return null
    return analyzeBankroll({
      bankroll,
      roiPct,
      fieldSize,
      itmPct,
      feePct,
      tournaments,
      samples,
      seed: 1,
    })
  }, [error, bankroll, roiPct, fieldSize, itmPct, feePct, tournaments, samples])

  const verdicts = useMemo(
    () => (result ? classifyBuyIns(result, bankroll, feePct) : []),
    [result, bankroll, feePct],
  )

  const current = useMemo(() => {
    if (!result || currentBuyIn <= 0) return null
    const buyInsDeep = bankroll / currentBuyIn
    const risk = ruinRiskAt(result.lossDistribution, buyInsDeep)
    let tier: RiskTier | null = null
    for (const candidate of ['conservative', 'normal', 'aggressive'] as const) {
      if (risk <= TIER_DEFINITIONS[candidate].ruinTolerance) {
        tier = candidate
        break
      }
    }
    return { buyInsDeep, risk, tier, shot: shotAt(result, bankroll, currentBuyIn, 'normal') }
  }, [result, bankroll, currentBuyIn])

  const losing = result !== null && result.evPerTournament <= 0

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="mx-auto w-full max-w-4xl">
        <BackToMenu className="mb-3" />
        <h1 className="text-3xl font-bold text-white">Bankroll</h1>
        <p className="mb-6 text-sm text-slate-400">
          What you can afford to play, from your edge and the fields you play — not a rule of thumb.
        </p>

        <div className="flex flex-col gap-4">
          <Panel>
            <h2 className="mb-3 text-sm font-semibold text-white">Your situation</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label="Bankroll" emoji="🏦" value={form.bankroll} onChange={set('bankroll')} hint="What you can lose" />
              <Field label="Your ROI" emoji="📈" value={form.roiPct} onChange={set('roiPct')} suffix="%" hint="Return on total cost" />
              <Field label="Field size" emoji="👥" value={form.fieldSize} onChange={set('fieldSize')} hint="Typical entrants" />
              <Field label="Paid places" emoji="🏆" value={form.itmPct} onChange={set('itmPct')} suffix="%" hint="Top % of field" />
              <Field label="Fee" emoji="🧾" value={form.feePct} onChange={set('feePct')} suffix="%" hint="Rake on the buy-in" />
              <Field
                label="Over" emoji="🎟️"
                value={form.tournaments}
                onChange={set('tournaments')}
                hint="Tournaments the risk covers"
              />
              <Field label="Simulations" emoji="🔁" value={form.samples} onChange={set('samples')} hint="More = steadier" />
              <Field
                label="Buy-in you play" emoji="🎯"
                value={form.currentBuyIn}
                onChange={set('currentBuyIn')}
                hint="To check where you stand"
              />
            </div>

            {error && (
              <p className="mt-4 rounded-md border border-rose-900/60 bg-rose-950/30 p-3 text-xs text-rose-300">
                {error}
              </p>
            )}
          </Panel>

          {losing && (
            <p className="rounded-md border border-rose-900/60 bg-rose-950/30 p-4 text-sm text-rose-300">
              At a {roiPct}% ROI you lose money every time you register, so no bankroll is big
              enough — a bigger roll only buys a longer decline. The numbers below assume the ROI
              you entered is real; fix the edge before sizing the roll.
            </p>
          )}

          {result && !losing && (
            <>
              <Panel>
                <h2 className="mb-1 text-sm font-semibold text-white">What you can play</h2>
                <p className="mb-4 text-xs text-slate-500">
                  Each tier is a promise about how often a {tournaments.toLocaleString('en-US')}
                  -tournament stretch ends in busting the roll.
                </p>

                <div className="grid gap-3 sm:grid-cols-3">
                  {result.tiers.map((tier) => {
                    const styles = TIER_STYLES[tier.id]
                    return (
                      <div
                        key={tier.id}
                        className={`rounded-lg border bg-slate-950/40 p-4 ${styles.border}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-white">{tier.label}</h3>
                          <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${styles.badge}`}>
                            {pct(tier.ruinTolerance)} risk
                          </span>
                        </div>
                        <p className="mt-2 text-3xl font-bold text-white">
                          {money(tier.maxBuyIn)}
                        </p>
                        <p className={`text-xs ${styles.text}`}>biggest buy-in</p>
                        <p className="mt-2 text-sm text-slate-300">
                          Play {money(tier.minBuyIn)}–{money(tier.maxBuyIn)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {money(tier.minEntryCost)}–{money(tier.maxEntryCost)} an entry once the fee is on
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {tier.requiredBuyIns.toFixed(0)} buy-ins deep · {money(bankroll)} covers it
                        </p>
                        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{tier.blurb}</p>
                      </div>
                    )
                  })}
                </div>
              </Panel>

              {current && (
                <Panel>
                  <h2 className="mb-3 text-sm font-semibold text-white">
                    Where {money(currentBuyIn)} puts you
                  </h2>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Buy-ins deep</p>
                      <p className="mt-0.5 text-lg font-semibold text-white">
                        {current.buyInsDeep.toFixed(0)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Risk of ruin</p>
                      <p
                        className={`mt-0.5 text-lg font-semibold ${
                          current.tier ? TIER_STYLES[current.tier].text : 'text-rose-400'
                        }`}
                      >
                        {pct(current.risk)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Verdict</p>
                      <p
                        className={`mt-0.5 text-lg font-semibold ${
                          current.tier ? TIER_STYLES[current.tier].text : 'text-rose-400'
                        }`}
                      >
                        {current.tier ? TIER_DEFINITIONS[current.tier].label : 'Too big'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">
                        For the normal tier
                      </p>
                      <p className="mt-0.5 text-lg font-semibold text-white">
                        {money(current.shot.needed)}
                      </p>
                      {current.shot.shortfall > 0 && (
                        <p className="text-[11px] text-slate-500">
                          {money(current.shot.shortfall)} short
                        </p>
                      )}
                    </div>
                  </div>

                  {current.shot.shortfall > 0 && current.shot.tournaments !== null && (
                    <p className="mt-3 text-xs text-slate-400">
                      At this edge that is about{' '}
                      <span className="text-slate-200">
                        {current.shot.tournaments.toLocaleString('en-US')} more tournaments
                      </span>{' '}
                      at your current level before {money(currentBuyIn)} is a normal-tier game
                      rather than a shot.
                    </p>
                  )}
                </Panel>
              )}

              <Panel>
                <h2 className="text-sm font-semibold text-white">Every buy-in, judged</h2>
                <p className="mb-3 text-xs text-slate-500">
                  The cash each buy-in demands. Anything your {money(bankroll)} already covers is
                  coloured in; grey is what you cannot afford yet.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-left text-[11px] uppercase tracking-wide text-slate-500">
                        <th className="pb-2 font-medium">Buy-in</th>
                        <th className="pb-2 font-medium">Entry cost</th>
                        <th className="pb-2 font-medium">Roll needed · aggressive</th>
                        <th className="pb-2 font-medium">· normal</th>
                        <th className="pb-2 font-medium">· conservative</th>
                        <th className="pb-2 font-medium">Risk of ruin</th>
                        <th className="pb-2 font-medium">Verdict</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-300">
                      {verdicts.map((verdict) => (
                        <tr
                          key={verdict.buyIn}
                          className="border-b border-slate-800/60 last:border-0"
                        >
                          <td className="py-2 tabular-nums text-white">
                            {money(verdict.buyIn)}
                          </td>
                          <td className="py-2 tabular-nums text-slate-500">
                            {money(verdict.entryCost)}
                          </td>
                          {(['aggressive', 'normal', 'conservative'] as const).map((id) => (
                            <td
                              key={id}
                              className={`py-2 tabular-nums ${
                                verdict.bankrollNeeded[id] <= bankroll
                                  ? TIER_STYLES[id].text
                                  : 'text-slate-600'
                              }`}
                            >
                              {money(verdict.bankrollNeeded[id])}
                            </td>
                          ))}
                          <td className="py-2 tabular-nums">{pct(verdict.ruinRisk)}</td>
                          <td
                            className={`py-2 ${
                              verdict.tier ? TIER_STYLES[verdict.tier].text : 'text-slate-600'
                            }`}
                          >
                            {verdict.tier ? TIER_DEFINITIONS[verdict.tier].label : 'Out of range'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </>
          )}

          <Panel>
            <details>
              <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-300">
                How this is worked out
              </summary>
              <div className="mt-3 space-y-2 text-xs leading-relaxed text-slate-400">
                <p>
                  <span className="text-slate-300">Why not just say 100 buy-ins.</span> A 180-man
                  turbo and a 5,000-runner major have completely different variance, and a 25% ROI
                  grinder needs far less cushion than a 3% one. A flat number has to be wrong for
                  almost everybody, so this simulates the tournaments you actually play — the same
                  model the MTT Variance tool uses — and reads the answer off the results.
                </p>
                <p>
                  <span className="text-slate-300">What the tiers mean.</span> Each one is a
                  tolerance for going broke over the stretch you set: {pct(TIER_DEFINITIONS.aggressive.ruinTolerance)} for
                  aggressive, {pct(TIER_DEFINITIONS.normal.ruinTolerance)} for normal,{' '}
                  {pct(TIER_DEFINITIONS.conservative.ruinTolerance)} for conservative. The
                  simulation records how far below its starting point every run ever went, and the
                  required bankroll is the point that only the tolerated fraction of runs dipped
                  past.
                </p>
                <p>
                  <span className="text-slate-300">The horizon matters.</span> Risk of ruin is not a
                  fixed property of a bankroll — it grows with how long you play, because a longer
                  stretch gives the downswing more chances to happen. Doubling the tournaments
                  raises what you need. Set it to the volume you actually expect to put in.
                </p>
                <p>
                  <span className="text-slate-300">It is only as good as your ROI.</span> Everything
                  here hangs on the edge you type in, and most players guess high. If your ROI came
                  from a few hundred tournaments it is mostly noise — use the low end of what you
                  believe, and remember that the number you enter is over the total cost including
                  the fee.
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
