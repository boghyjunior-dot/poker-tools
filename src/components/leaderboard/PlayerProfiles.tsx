/**
 * The field, with faces on.
 *
 * Every number here is read off the same standings the table above shows, so
 * a card can never drift out of step with the row it belongs to: the cards
 * are a second view of one set of figures, not a second set.
 */

import { useT } from '../../lib/i18n'
import type { Format, LastLongerStanding, Standing } from '../../lib/leaderboard'
import { avatarTone, initials, profileFor, type PlayerCard } from '../../lib/playerProfiles'

const points = (value: number) => Math.round(value).toLocaleString('en-US')

/** A picture if they have one, their initials if they do not. */
export function Avatar({ card, size = 56 }: { card: PlayerCard; size?: number }) {
  const tone = avatarTone(card.name)

  if (card.avatar) {
    return (
      <img
        src={card.avatar}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        className="shrink-0 rounded-full object-cover ring-1 ring-slate-700"
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full font-bold ring-1 ring-slate-700"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: tone.background,
        color: tone.text,
      }}
    >
      {initials(card.name)}
    </span>
  )
}

function Figure({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  const t = useT()
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{t(label)}</p>
      <p className={`text-sm font-bold tabular-nums ${muted ? 'text-slate-500' : 'text-white'}`}>
        {value}
      </p>
    </div>
  )
}

export function PlayerProfiles({
  standings,
  lastLonger,
  cards,
  format,
}: {
  standings: readonly Standing[]
  lastLonger: readonly LastLongerStanding[]
  cards: readonly PlayerCard[]
  format: Format
}) {
  const t = useT()
  if (standings.length === 0) return null

  const nights = new Map(lastLonger.map((row) => [row.player, row]))

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {standings.map((row) => {
        const card = profileFor(row.player, cards)
        const won = nights.get(row.player)?.won ?? 0

        return (
          <article
            key={row.player}
            className="flex gap-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4"
          >
            <Avatar card={card} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <h3 className="truncate text-base font-semibold text-white">{row.player}</h3>
                <span
                  className={`shrink-0 text-xs font-bold tabular-nums ${
                    row.rank <= 3 ? 'text-amber-300' : 'text-slate-500'
                  }`}
                >
                  #{row.rank}
                </span>
              </div>
              <p className="mt-0.5 text-xs italic leading-relaxed text-slate-400">
                {card.description
                  ? t(card.description)
                  : t('No description yet — still scores all the same.')}
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
                <Figure label="Points" value={points(row.points)} />
                <Figure
                  label="Counting"
                  value={`${row.counted}/${format.best}`}
                  muted={row.counted < format.best}
                />
                <Figure label="Best" value={points(row.best)} />
                <Figure label="Last longers" value={String(won)} muted={won === 0} />
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
