/**
 * What a result would be worth, before you play it.
 *
 * The formula is on the page already, and a formula is not an answer — "is
 * the Sunday at the top of the band worth more to me than two cheap ones"
 * is a question people will ask every week, and working it out by hand with
 * a fourth root is not something anybody is going to do twice. So: four
 * boxes, and the arithmetic broken out rather than handed over as a single
 * number, because the interesting part is usually which term moved.
 */

import { useState } from 'react'
import { useT } from '../../lib/i18n'
import {
  STAKE_CEILING,
  STAKE_FLOOR,
  bountyPoints,
  finishPoints,
  stakeFactor,
} from '../../lib/leaderboard'

const points = (value: number) => Math.round(value).toLocaleString('en-US')

/** A number from a half-typed box, with a floor so nothing divides by zero. */
function read(text: string, least = 0): number {
  const value = Number(text)
  return Number.isFinite(value) ? Math.max(least, value) : least
}

function Field({
  label,
  hint,
  value,
  onChange,
}: {
  label: string
  hint: string
  value: string
  onChange: (value: string) => void
}) {
  const t = useT()
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-slate-500">{t(label)}</span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={t(label)}
        className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm tabular-nums text-slate-100"
      />
      <span className="text-[10px] text-slate-600">{t(hint)}</span>
    </label>
  )
}

function Line({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  const t = useT()
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-slate-800/60 py-1.5 last:border-0">
      <span className="text-xs text-slate-500">{t(label)}</span>
      <span className={`text-sm font-semibold tabular-nums ${muted ? 'text-slate-500' : 'text-slate-200'}`}>
        {value}
      </span>
    </div>
  )
}

export function ScoreCalculator() {
  const t = useT()
  const [entrants, setEntrants] = useState('1000')
  const [place, setPlace] = useState('150')
  const [buyIn, setBuyIn] = useState('22')
  const [bounties, setBounties] = useState('0')

  const n = Math.max(1, read(entrants, 1))
  const r = Math.max(1, read(place, 1))
  const bi = read(buyIn)
  const bty = read(bounties)

  const finish = finishPoints(n, r)
  const bounty = bountyPoints(bty, bi)
  const factor = stakeFactor(bi)
  const total = (finish + bounty) * factor

  const allowed = bi >= STAKE_FLOOR && bi <= STAKE_CEILING
  const deeper = r > n

  /**
   * The same finishing depth at each end of the band.
   *
   * Finish only, with the bounty left out on purpose: Bty/Bi is a ratio, so
   * carrying a fixed pile of bounty money across a stake change silently
   * alters that term too, and the line would end up claiming the cheap game
   * pays more — which is the opposite of what the multiplier does.
   */
  const atFloor = finish * stakeFactor(STAKE_FLOOR)
  const atCeiling = finish * stakeFactor(STAKE_CEILING)

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      <div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
          <Field
            label="Entries"
            hint="N — the size of the field"
            value={entrants}
            onChange={setEntrants}
          />
          <Field label="Place" hint="R — where you finished" value={place} onChange={setPlace} />
          <Field label="Buy-in" hint="Bi — what the seat cost" value={buyIn} onChange={setBuyIn} />
          <Field
            label="Bounties"
            hint="Bty — heads collected, in money"
            value={bounties}
            onChange={setBounties}
          />
        </div>

        {!allowed && (
          <p className="mt-3 rounded-md border border-amber-900/60 bg-amber-950/30 px-3 py-2 text-[11px] leading-relaxed text-amber-300">
            {t(
              'A ${bi} buy-in is outside the ${low}–${high} band, so a result like this would not be in the challenge at all. The score below is what the arithmetic gives, not what you would be credited.',
              { bi: bi || 0, low: STAKE_FLOOR, high: STAKE_CEILING },
            )}
          </p>
        )}
        {deeper && (
          <p className="mt-3 rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-[11px] leading-relaxed text-slate-400">
            {t('Nobody finishes below the size of the field, so this is being scored as last.')}
          </p>
        )}
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
        <Line label="Finish — 100 × √(N / R)" value={points(finish)} />
        <Line label="Bounty — 25 × (Bty / Bi)" value={points(bounty)} muted={bounty === 0} />
        <Line label="Stake — ⁴√(Bi / 5)" value={`×${factor.toFixed(3)}`} />
        <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-slate-700 pt-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t('Score')}
          </span>
          <span className="text-2xl font-bold tabular-nums text-white">{points(total)}</span>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
          {t(
            'That finishing depth alone is worth {low} at the bottom of the band and {high} at the top, before bounties.',
            { low: points(atFloor), high: points(atCeiling) },
          )}
        </p>
      </div>
    </div>
  )
}
