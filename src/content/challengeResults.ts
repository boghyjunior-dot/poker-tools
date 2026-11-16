/**
 * The MTT Challenge results, as entered.
 *
 * This file is the record. Results do not come from the app — there is no
 * form, no database and no server behind the challenge — they are handed
 * over and written in here, which means this list is the whole truth about
 * what has been counted and a diff of this file is the whole truth about
 * what changed.
 *
 * Add a result by appending an object. Nothing sorts it or dedupes it on the
 * way in, on purpose: the file reads in the order things were entered, and
 * two identical rows mean somebody really did enter it twice.
 *
 *     {
 *       id: 'r-0001',            // unique, never reused
 *       player: 'Snapper',
 *       date: '2027-01-14',      // the night it was played
 *       added: '2027-01-15',     // the day it was entered here
 *       event: 'Daily Main',
 *       site: 'GGPoker',
 *       entrants: 1842,          // N
 *       place: 97,               // R
 *       buyIn: 54,               // Bi — must be $5 to $60 to count
 *       bounties: 108,           // Bty, in money
 *       cashed: 141,             // prize money, bounties not included
 *     }
 *
 * Two things worth getting right, because nothing downstream can fix them.
 * `entrants` is the field size, which most results logs throw away and the
 * scoring formula cannot work without. And `cashed` is the prize only: the
 * buy-in is not taken off it and the bounties are not added to it.
 *
 * While this list is empty the page shows the mock field instead, and says
 * so. The first real row switches it over.
 */

import type { ChallengeResult } from '../lib/leaderboard'

export const CHALLENGE_RESULTS: ChallengeResult[] = []
