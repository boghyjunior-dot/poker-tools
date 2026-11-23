/**
 * Who is in the MTT Challenge.
 *
 * A roster rather than something inferred from the results, because a player
 * who has entered and not yet played is still in it: they have paid, they
 * are in the pot, and a table that hid them until their first result would
 * be telling everybody the field is smaller than it is.
 *
 * Add somebody by appending a card. A blank description is fine — they still
 * score, and the window says so rather than leaving a hole.
 */

import type { PlayerCard } from '../lib/playerProfiles'

export const CHALLENGE_PLAYERS: PlayerCard[] = [
  {
    name: 'Ferdi',
    description: '',
    avatar: './players/ferdi.webp',
  },
  {
    name: 'Snapper',
    description: 'I snap call ya',
    avatar: './players/snapper.webp',
  },
  {
    name: 'Sw1ngKKing',
    description: '',
  },
  {
    name: 'Simion',
    description: '',
  },
  {
    name: 'Alecs',
    description: '',
  },
  {
    name: 'LucianT',
    description: '',
  },
]

/** Just the names, for seeding a table with players who have not played. */
export const ROSTER: string[] = CHALLENGE_PLAYERS.map((player) => player.name)
