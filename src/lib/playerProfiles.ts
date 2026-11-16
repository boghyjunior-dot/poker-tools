/**
 * Who the names in the table are.
 *
 * A leaderboard of surnames is a spreadsheet. The thing that makes a
 * challenge worth entering is knowing who you are chasing — that the player
 * two rows above you only plays Sundays, or snap-calls everything, or has
 * never once bothered with the Main. So each player gets a face and a line of
 * their own, and the table stops being a list of strangers.
 *
 * Profiles are deliberately separate from results. A player with no profile
 * still scores, still ranks, and still shows up with their initials: nobody
 * is kept out of the standings for not having written a bio.
 */

export interface PlayerCard {
  name: string
  /** A line about how they play — theirs to write, not the app's to infer. */
  description: string
  /** Served path to a picture. Nothing means initials instead. */
  avatar?: string
}

/**
 * Up to two letters, from the parts of a name that carry it.
 *
 * "Mihai P." gives MP and "Snapper" gives SN — a single-word name keeps two
 * letters of itself rather than rendering one lonely capital in a circle.
 */
export function initials(name: string): string {
  const parts = name
    .split(/[\s._-]+/)
    .map((part) => part.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean)

  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * A colour for the fallback avatar, picked from the name.
 *
 * Hashed rather than assigned in order so a player keeps their colour when
 * somebody above them leaves the challenge — a face that changes because the
 * table re-sorted is a face you stop recognising.
 */
export function avatarTone(name: string): { background: string; text: string } {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  const hue = hash % 360
  return {
    background: `hsl(${hue} 42% 24%)`,
    text: `hsl(${hue} 72% 76%)`,
  }
}

/** The card for a name, or a blank one so the page never has a hole in it. */
export function profileFor(name: string, cards: readonly PlayerCard[]): PlayerCard {
  return cards.find((card) => card.name === name) ?? { name, description: '' }
}

/** The cards, in the order a list of standings puts their players. */
export function profilesFor(
  names: readonly string[],
  cards: readonly PlayerCard[],
): PlayerCard[] {
  return names.map((name) => profileFor(name, cards))
}
