/**
 * A title, worn as a badge.
 *
 * Shown in two places now: under the name in the player window, and under
 * the name in the standings, which is where people are actually looking. One
 * component for both, because two badges for the same title that disagreed
 * about its colour or its wording would read as two different titles.
 *
 * A colour each and an emoji each rather than one house amber for all four.
 * In the table they sit at the size of a footnote, and at that size the
 * colour and the shape are read long before the words are — which is the
 * whole point of a badge on a row you are scanning.
 */

import { AWARD_LABELS, type Award, type AwardId } from '../../lib/awards'
import { useT, type TranslateFn } from '../../lib/i18n'

/**
 * One emoji each, legible at ten pixels.
 *
 * The blade for the giant, the target for the bounties, the ruler for the
 * month that never wavered, and a guitar for the man still touring on one
 * song.
 */
const AWARD_EMOJI: Record<AwardId, string> = {
  giantKiller: '🗡️',
  bountyHunter: '🎯',
  consistent: '📏',
  oneHitWonder: '🎸',
}

/**
 * A colour each, from four different parts of the wheel.
 *
 * Not shades of one colour: a player can hold more than one of these at
 * once, and two badges a hue apart sitting side by side are one badge as far
 * as a glance down the table is concerned.
 */
const AWARD_TONE: Record<AwardId, string> = {
  giantKiller: 'border-violet-700/60 bg-violet-950/50 text-violet-300',
  bountyHunter: 'border-rose-700/60 bg-rose-950/50 text-rose-300',
  consistent: 'border-sky-700/60 bg-sky-950/50 text-sky-300',
  oneHitWonder: 'border-amber-700/60 bg-amber-950/50 text-amber-300',
}

const pct = (value: number, places = 1) => `${(value * 100).toFixed(places)}%`

/**
 * What the title means and what it was won with.
 *
 * Takes the translator rather than calling the hook, so it stays a plain
 * function of an award and reads the same from anywhere in the badge.
 */
function awardWhy(t: TranslateFn, award: Award): string {
  switch (award.id) {
    case 'giantKiller':
      return t(
        'The best finish in the biggest field anybody played this period. Largest field first, then the highest place in it: {place} of {entrants}.',
        {
          place: award.value.toLocaleString('en-US'),
          entrants: (award.entrants ?? 0).toLocaleString('en-US'),
        },
      )
    case 'bountyHunter':
      return t(
        'The largest share of a total that came out of the bounty term. Their bounty points over their points: {pct}.',
        { pct: pct(award.value) },
      )
    case 'consistent':
      return t(
        'The steadiest full quota of counting scores. The spread of those scores over their own average, so it is unevenness relative to their level rather than in points: {pct}. Needs a full quota, and at least one other player with one.',
        { pct: pct(award.value, 0) },
      )
    case 'oneHitWonder':
      return t(
        'The total leaning hardest on a single night. Their best score over their points: {pct}. Needs a full quota, and at least one other player with one.',
        { pct: pct(award.value, 0) },
      )
  }
}

/**
 * The badge itself.
 *
 * The label is the whole of it and the reason sits in the tooltip, because a
 * row of badges is read at a glance and a row of sentences is not. Compact
 * drops it to footnote size for the standings, where it is a note under a
 * name rather than a heading of its own.
 */
export function AwardBadge({
  award,
  compact = false,
}: {
  award: Award
  compact?: boolean
}) {
  const t = useT()
  return (
    <span
      title={awardWhy(t, award)}
      className={`inline-flex cursor-help items-center gap-1 whitespace-nowrap rounded-full border font-semibold uppercase tracking-wider ${
        AWARD_TONE[award.id]
      } ${compact ? 'px-1.5 py-px text-[9px]' : 'px-2 py-0.5 text-[10px]'}`}
    >
      {/* Decoration: the label already says which title this is. */}
      <span aria-hidden="true" className="not-italic">
        {AWARD_EMOJI[award.id]}
      </span>
      {t(AWARD_LABELS[award.id])}
    </span>
  )
}
