/**
 * What every figure on the leaderboard means, and where it came from.
 *
 * A competition people pay into is one they will want to check, and a column
 * headed "Cutoff" explains nothing to somebody reading it for the first
 * time. Each of these says the two things a figure has to say: what it is,
 * and how it was worked out.
 *
 * One list rather than a sentence written beside each table, because the
 * standings and the player window show the same figures and a tooltip that
 * disagreed with the one two inches away would be worse than neither.
 *
 * English, like every other string here — the dictionary is keyed by the
 * source text, so these are the keys as well as the fallback.
 */
export const STAT_HELP = {
  rank: 'Ties share a rank, so two players level on points are both first and the next is third. Alphabetical within a tie, because the rules give no tiebreak and inventing one here would quietly decide who gets paid.',
  points:
    'The sum of their best {n} scores this period. Nothing below those {n} counts towards it, however many they played.',
  counting:
    'How many of the {n} that count are filled. Short of {n} every result adds to the total; once there are {n}, a new one has to beat the cutoff to change anything.',
  played: 'Every result they entered this period, the ones too far down to count included.',
  best: 'Their single highest score of the period, and the one the total leans on most.',
  cutoff:
    'The lowest score still counting. Once the quota is full a new result only moves the total if it beats this, which makes it the number to beat tonight.',
  fromBounties:
    'How much of their total came out of the bounty term — 25 × (Bty / Bi), scaled by the stake like the rest of the score — over the total itself.',
  prize:
    'Prize money over every result this period, scoring or not. Bounties are not in it and the buy-in is not taken off.',
  bounties:
    'Bounty money collected over the same results, counted as money rather than as the points it bought.',
  money:
    'Prize and bounties added together: what the period was worth. Rounded to whole dollars that add up to each other, so the two halves and this always agree.',
  payout:
    'Their share of the pot as the table stands, which is nothing outside the top three. The pot is split {split}, in whole dollars that add up to it exactly.',
  llWon: 'Nights of the Daily Main they outlasted everybody else who was contesting it.',
  llNights:
    'Nights of the Main they were in with at least one other player. A night somebody played alone is not a last longer, so it is not counted.',
  llWinPct: 'Nights won over nights contested.',
  llDeepest: 'The highest they have finished in the Main itself, whether or not they won the night.',
  llCashed:
    'Prize money from the nights they won the last longer, not from every night they played.',
} as const
