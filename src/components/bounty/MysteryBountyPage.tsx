import { useMemo, useState } from 'react'
import { BackToMenu } from '../BackToMenu'
import { Footer } from '../Footer'
import { formatMoney } from '../../lib/formatNumber'
import { callingRequirement, calculateMysteryBounty } from '../../lib/mysteryBounty'

interface FormState {
  entrants: string
  prizePoolPerEntry: string
  bountyPerEntry: string
  feePerEntry: string
  bountyStartPlayers: string
  startingStack: string
  bigBlind: string
  topPrize: string
  topPrizeCount: string
  shoveBb: string
  deadBb: string
}

const DEFAULTS: FormState = {
  entrants: '1000',
  prizePoolPerEntry: '500',
  bountyPerEntry: '450',
  feePerEntry: '50',
  bountyStartPlayers: '150',
  startingStack: '20000',
  bigBlind: '5000',
  topPrize: '',
  topPrizeCount: '1',
  shoveBb: '12',
  deadBb: '1.5',
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

const num = (value: string) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function MysteryBountyPage() {
  const [form, setForm] = useState<FormState>(DEFAULTS)
  const set = (key: keyof FormState) => (value: string) => setForm((prev) => ({ ...prev, [key]: value }))

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

  const calling = result
    ? callingRequirement(num(form.shoveBb), num(form.deadBb), result.averageBountyBb)
    : null

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

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="mx-auto w-full max-w-4xl">
        <BackToMenu className="mb-3" />
        <h1 className="text-3xl font-bold text-white">Mystery Bounty</h1>
        <p className="mb-6 text-sm text-slate-400">
          What an average bounty is really worth — in cash and in big blinds.
        </p>

        <div className="flex flex-col gap-4">
          <Panel>
            <h2 className="mb-3 text-sm font-semibold text-white">Tournament</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label="Entries" emoji="👥" value={form.entrants} onChange={set('entrants')} hint="Including re-entries" />
              <Field
                label="Prize pool / entry" emoji="🏆"
                value={form.prizePoolPerEntry}
                onChange={set('prizePoolPerEntry')}
                hint="Buy-in share that plays"
              />
              <Field
                label="Bounty / entry" emoji="🎯"
                value={form.bountyPerEntry}
                onChange={set('bountyPerEntry')}
                hint="Buy-in share for bounties"
              />
              <Field label="Fee / entry" emoji="🧾" value={form.feePerEntry} onChange={set('feePerEntry')} hint="Rake" />
              <Field
                label="Bounty phase starts" emoji="🚩"
                value={form.bountyStartPlayers}
                onChange={set('bountyStartPlayers')}
                hint="Players left when envelopes begin"
              />
              <Field
                label="Starting stack" emoji="🪙"
                value={form.startingStack}
                onChange={set('startingStack')}
                hint="Chips"
              />
              <Field label="Current big blind" emoji="🔼" value={form.bigBlind} onChange={set('bigBlind')} hint="Chips" />
              <Field
                label="Top prize" emoji="💎"
                value={form.topPrize}
                onChange={set('topPrize')}
                placeholder="optional"
                hint="Value of each top envelope"
              />
              <Field
                label="Top prizes available" emoji="🔢"
                value={form.topPrizeCount}
                onChange={set('topPrizeCount')}
                hint="How many envelopes at that value"
              />
            </div>

            {error && (
              <p className="mt-4 rounded-md border border-rose-900/60 bg-rose-950/30 p-3 text-xs text-rose-300">
                {error}
              </p>
            )}
          </Panel>

          {result && (
            <>
              <Panel>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-indigo-800/60 bg-indigo-950/30 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-indigo-300">Average bounty</p>
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
                        ? 'Average excluding the top envelopes'
                        : `${result.typicalBountyBb.toFixed(1)} big blinds`}
                    </p>
                    <p className={`mt-2 text-xs ${tierTooBig ? 'text-amber-400' : 'text-slate-500'}`}>
                      {typicalNote}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: 'Bounty pool', value: formatMoney(result.bountyPool) },
                    { label: 'Envelopes drawn', value: result.draws.toLocaleString('en-US') },
                    {
                      label: 'vs your contribution',
                      value: `${result.multipleOfEntryBounty.toFixed(1)}×`,
                      sub: `each entry put in ${formatMoney(bountyPerEntry)}`,
                    },
                    { label: 'Regular prize pool', value: formatMoney(result.prizePool) },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">{item.label}</p>
                      <p className="mt-0.5 text-lg font-semibold text-white">{item.value}</p>
                      {item.sub && <p className="text-[11px] text-slate-500">{item.sub}</p>}
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel>
                <h2 className="text-sm font-semibold text-white">As the blinds grow</h2>
                <p className="mb-3 text-xs text-slate-500">
                  The bounty is a fixed amount of cash, so it buys fewer big blinds every level.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-left text-[11px] uppercase tracking-wide text-slate-500">
                        <th className="pb-2 font-medium">Big blind</th>
                        <th className="pb-2 font-medium">Average bounty</th>
                        <th className="pb-2 font-medium">Worth to a 30bb stack</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-300">
                      {result.levels.map((level) => (
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

              {calling && (
                <Panel>
                  <h2 className="text-sm font-semibold text-white">What it does to a call</h2>
                  <p className="mb-3 text-xs text-slate-500">
                    You cover a shorter stack who jams. Winning the pot also wins the bounty, so you can call wider.
                  </p>

                  <div className="grid grid-cols-2 gap-4 sm:max-w-xs">
                    <Field label="Their shove" emoji="💥" value={form.shoveBb} onChange={set('shoveBb')} suffix="bb" />
                    <Field label="Dead money" emoji="💵" value={form.deadBb} onChange={set('deadBb')} suffix="bb" />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Without bounty</p>
                      <p className="mt-0.5 text-lg font-semibold text-slate-300">
                        {(calling.without * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/30 px-3 py-2.5">
                      <p className="text-[11px] uppercase tracking-wide text-emerald-400">With bounty</p>
                      <p className="mt-0.5 text-lg font-semibold text-emerald-300">
                        {(calling.with * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Equity saved</p>
                      <p className="mt-0.5 text-lg font-semibold text-white">
                        {((calling.without - calling.with) * 100).toFixed(1)} pts
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    Equity needed to break even on the call. The bounty adds{' '}
                    <span className="text-slate-300">{result.averageBountyBb.toFixed(1)} bb</span> of dead money
                    to the pot whenever you knock them out.
                  </p>
                </Panel>
              )}
            </>
          )}

          <Panel>
            <details>
              <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-300">
                How this is worked out
              </summary>
              <div className="mt-3 space-y-2 text-xs leading-relaxed text-slate-400">
                <p>
                  <span className="text-slate-300">Why the average is so big.</span> Every entry funds the
                  bounty pool, but envelopes are only drawn during the bounty phase. With 1,000 entries and
                  the phase starting at 150 players, 1,000 contributions are shared over 149 knockouts — so
                  the average bounty is about 6.7× what each player put in. The later the phase starts, the
                  bigger the average.
                </p>
                <p>
                  <span className="text-slate-300">Chips per unit of cash.</span> Big-blind values convert
                  through the prize-pool share of the buy-in, not the total. Every chip in play is eventually
                  paid out of the regular prize pool, so a 20,000 stack bought by the $500 that reaches it is
                  worth 40 chips per dollar. Using the full buy-in would understate the bounty by the size of
                  the bounty split.
                </p>
                <p>
                  <span className="text-slate-300">Average vs typical.</span> Mystery structures are
                  top-heavy: a handful of envelopes can hold a large slice of the pool. The average is the
                  right number for EV over many knockouts, but the draw you actually make is usually nearer
                  the typical figure. Enter the announced top prize and how many envelopes are worth it to
                  see both, along with your odds of hitting one. Splitting the same money across more top
                  envelopes leaves the average untouched and pulls the typical draw down.
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
