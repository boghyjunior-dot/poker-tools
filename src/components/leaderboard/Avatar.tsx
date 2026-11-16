import { avatarTone, initials, type PlayerCard } from '../../lib/playerProfiles'

/**
 * A picture if they have one, their initials if they do not.
 *
 * Decorative in both cases: every place this appears, the player's name is
 * written beside it, and a screen reader announcing "Snapper, Snapper" helps
 * nobody.
 */
export function Avatar({
  card,
  size = 56,
  lazy = true,
}: {
  card: PlayerCard
  size?: number
  /** False where the picture is the point, so it is never briefly a hole. */
  lazy?: boolean
}) {
  const tone = avatarTone(card.name)

  if (card.avatar) {
    return (
      <img
        src={card.avatar}
        alt=""
        width={size}
        height={size}
        loading={lazy ? 'lazy' : 'eager'}
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
