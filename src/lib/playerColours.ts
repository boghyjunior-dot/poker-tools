/**
 * A colour per player, picked to be told apart.
 *
 * Hashing a name to a hue gives every player a stable colour and no promise
 * at all that two of them will not land a few degrees apart — which is fine
 * for a circle with initials in it, and useless for eight lines crossing
 * each other on one chart.
 *
 * So: a fixed palette, assigned by position in the roster. The order of the
 * palette is itself chosen so that consecutive entries are as far apart as
 * possible, because consecutive entries are what a small field gets.
 */

/** Twelve, ordered so neighbours are nothing like each other. */
export const PLAYER_PALETTE = [
  '#38bdf8', // sky
  '#fbbf24', // amber
  '#f472b6', // pink
  '#4ade80', // green
  '#a78bfa', // violet
  '#fb923c', // orange
  '#2dd4bf', // teal
  '#f87171', // red
  '#a3e635', // lime
  '#e879f9', // fuchsia
  '#60a5fa', // blue
  '#facc15', // yellow
] as const

/**
 * The colour for a player, by where they sit in the roster.
 *
 * Roster position rather than anything derived from the name, so a colour
 * only changes when the roster does — a line that changed colour because
 * somebody else had a good night would be unreadable.
 *
 * Somebody not on the roster still gets a colour, hashed, so a result from
 * a guest is drawn rather than dropped.
 */
export function playerColour(player: string, roster: readonly string[]): string {
  const seat = roster.indexOf(player)
  if (seat >= 0) return PLAYER_PALETTE[seat % PLAYER_PALETTE.length]

  let hash = 0
  for (let i = 0; i < player.length; i += 1) hash = (hash * 31 + player.charCodeAt(i)) >>> 0
  return PLAYER_PALETTE[hash % PLAYER_PALETTE.length]
}
