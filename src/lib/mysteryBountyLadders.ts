import type { BountyTier } from './mysteryBounty'

export interface LadderPreset {
  id: string
  label: string
  description: string
  /** Entries the published ladder was built for, so the tool can sanity-check. */
  entrants: number
  tiers: BountyTier[]
}

/**
 * Shapes of published mystery ladders, scaled to round numbers.
 *
 * These are illustrative structures rather than any one event's table — the
 * point is the *shape*, since that is what decides whether chasing the top
 * envelope is worth anything. Paste the real table over the top when you have
 * it.
 */
export const LADDER_PRESETS: LadderPreset[] = [
  {
    id: 'top-heavy',
    label: 'Top-heavy',
    description: 'One envelope holds a fifth of the pool. Chasing it is most of the format.',
    entrants: 1000,
    tiers: [
      { value: 100_000, count: 1 },
      { value: 25_000, count: 2 },
      { value: 10_000, count: 5 },
      { value: 5_000, count: 10 },
      { value: 2_000, count: 30 },
      { value: 1_000, count: 101 },
    ],
  },
  {
    id: 'balanced',
    label: 'Balanced',
    description: 'A visible top prize, but most of the money sits in the middle rungs.',
    entrants: 1000,
    tiers: [
      { value: 50_000, count: 1 },
      { value: 20_000, count: 3 },
      { value: 8_000, count: 10 },
      { value: 3_000, count: 35 },
      { value: 1_500, count: 100 },
    ],
  },
  {
    id: 'flat',
    label: 'Flat',
    description: 'Nearly every envelope is the same. The average is the number that matters.',
    entrants: 1000,
    tiers: [
      { value: 10_000, count: 2 },
      { value: 5_000, count: 7 },
      { value: 3_000, count: 140 },
    ],
  },
]

export interface LadderParse {
  tiers: BountyTier[]
  errors: string[]
}

const NUMBER = /-?[\d,.]+/g

/**
 * Read a pasted ladder table.
 *
 * Event pages publish these in every layout imaginable, so rather than parse a
 * format, take the first two numbers on each line as value and count. Lines
 * that carry fewer than two numbers are headers or footnotes and are skipped
 * quietly; anything else is reported so a mistyped table is not silently
 * turned into a smaller drum.
 */
export function parseLadderText(text: string): LadderParse {
  const tiers: BountyTier[] = []
  const errors: string[] = []

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line === '') continue

    const matches = line.match(NUMBER)
    if (!matches || matches.length < 2) continue

    const numbers = matches
      .map((token) => Number(token.replace(/,/g, '')))
      .filter((n) => Number.isFinite(n))

    if (numbers.length < 2) {
      errors.push(`Could not read "${line}"`)
      continue
    }

    // "1 x $100,000" reads as count first; "$100,000 x 1" reads value first.
    // The larger number is the envelope value in every real ladder.
    const [a, b] = numbers
    const value = Math.max(a, b)
    const count = Math.min(a, b)

    if (value <= 0 || count <= 0) {
      errors.push(`Skipped "${line}" — needs a value and a count above zero`)
      continue
    }
    tiers.push({ value, count: Math.floor(count) })
  }

  if (tiers.length === 0 && errors.length === 0) {
    errors.push('No rungs found. Each line needs an envelope value and how many there are.')
  }

  return { tiers, errors }
}
