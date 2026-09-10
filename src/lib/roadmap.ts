/**
 * The road from knowing nothing to playing high stakes.
 *
 * Every stage carries the two numbers people skip past — the bankroll it needs
 * and the volume it takes — plus an honest note about how many players get
 * through it. A roadmap that only lists skills makes the climb look like a
 * reading list; the money and the hours are the part that actually stops people.
 */

export interface StageTool {
  href: string
  label: string
}

export interface RoadmapStage {
  id: string
  /** Position on the road, 1-indexed. */
  step: number
  name: string
  tagline: string
  /** Buy-in range this stage is played at. */
  stakes: string
  /** Bankroll the stage needs, in cash. */
  bankroll: string
  /** Bankroll in buy-ins, which is the number that actually governs it. */
  buyIns: string
  /** Typical time spent here by someone who makes it through. */
  months: string
  /** Tournaments to play before the results mean anything. */
  volume: string
  /** Study hours per week that the stage expects. */
  study: string
  /** What you have to learn to leave this stage. */
  skills: string[]
  /** The test for being ready to move up, rather than a feeling. */
  proof: string
  /** What actually happens to most people here. */
  reality: string
  /** Tools in this suite that do the work of this stage. */
  tools: StageTool[]
  /** Accent colour, as a Tailwind-ish hex so the SVG and cards agree. */
  color: string
}

export const STAGES: RoadmapStage[] = [
  {
    id: 'rules',
    step: 1,
    name: 'The rules',
    tagline: 'Know what beats what, and what a position is.',
    stakes: 'Play money · freerolls',
    bankroll: '$0',
    buyIns: '—',
    months: '2–4 weeks',
    volume: '~50 tournaments',
    study: '2–3 h/week',
    skills: [
      'Hand rankings without thinking about it',
      'The seat names and why position matters',
      'Blinds, antes, and how a tournament clock works',
      'Pot odds as a fraction, not a feeling',
    ],
    proof: 'You never misread your hand and never miss that you are last to act.',
    reality:
      'The cheapest stage and the one people rush. Every hour here saves ten later, because everything above is built on it.',
    tools: [{ href: 'quiz.html', label: 'Quiz Me' }],
    color: '#64748b',
  },
  {
    id: 'preflop',
    step: 2,
    name: 'Preflop discipline',
    tagline: 'Play a tight, positionally aware opening game.',
    stakes: '$0.10 – $2',
    bankroll: '$100 – $200',
    buyIns: '100 buy-ins',
    months: '2–4 months',
    volume: '500–1,000 tournaments',
    study: '3–5 h/week',
    skills: [
      'An opening range for every seat, memorised',
      'Folding the hands that look playable and are not',
      'Shove and call ranges under 15bb',
      '3-betting for value before 3-betting as a bluff',
    ],
    proof: 'You can name your open from any seat instantly, and your VPIP and PFR sit close together.',
    reality:
      'Most players never finish this stage — they learn ranges, then abandon them the first time a tight session gets boring.',
    tools: [
      { href: 'charts.html', label: 'Preflop Charts' },
      { href: 'quiz.html', label: 'Quiz Me' },
    ],
    color: '#0ea5e9',
  },
  {
    id: 'micro',
    step: 3,
    name: 'Micro stakes',
    tagline: 'Win for the first time, and prove it with volume.',
    stakes: '$1 – $5',
    bankroll: '$500 – $1,500',
    buyIns: '150–250 buy-ins',
    months: '6–12 months',
    volume: '3,000–5,000 tournaments',
    study: '5–8 h/week',
    skills: [
      'C-betting by board texture rather than by habit',
      'Reading a board for what it hits, not what you hold',
      'Basic ICM: why the bubble changes everything',
      'Tracking results honestly, including the losing months',
    ],
    proof: 'A positive ROI over 3,000+ tournaments — not 300, which tells you nothing.',
    reality:
      'The first real filter. Micro fields are soft but the rake is brutal, and a genuine winner here is often only making a few dollars an hour.',
    tools: [
      { href: 'leakfinder.html', label: 'Leak Finder' },
      { href: 'variance.html', label: 'MTT Variance' },
      { href: 'equity.html', label: 'Equity Calculator' },
    ],
    color: '#22c55e',
  },
  {
    id: 'low',
    step: 4,
    name: 'Low stakes',
    tagline: 'Turn a small edge into a repeatable one.',
    stakes: '$5 – $22',
    bankroll: '$3,000 – $8,000',
    buyIns: '200–300 buy-ins',
    months: '1–2 years',
    volume: '10,000+ tournaments',
    study: '8–12 h/week',
    skills: [
      'Solver work on the spots that actually recur',
      'Turn and river barrelling with a plan, not hope',
      'ICM in the money, not just on the bubble',
      'Bankroll rules you follow on a bad day',
    ],
    proof: 'You beat the level for a year, through at least one downswing you did not enjoy.',
    reality:
      'Where most serious players top out and stay — and there is nothing wrong with that. A good low-stakes grinder can make real money part-time.',
    tools: [
      { href: 'bankroll.html', label: 'Bankroll' },
      { href: 'mdf.html', label: 'MDF Range Tool' },
      { href: 'leakfinder.html', label: 'Leak Finder' },
    ],
    color: '#eab308',
  },
  {
    id: 'mid',
    step: 5,
    name: 'Mid stakes',
    tagline: 'Beat opponents who are also studying.',
    stakes: '$22 – $215',
    bankroll: '$15,000 – $50,000',
    buyIns: '250–400 buy-ins',
    months: '2–4 years',
    volume: '15,000+ tournaments',
    study: '10–15 h/week',
    skills: [
      'Population tendencies, not just theory',
      'Exploits you can turn on and off deliberately',
      'Mental game that survives a six-figure downswing',
      'Treating it as a business: records, tax, expenses',
    ],
    proof: 'A winrate that holds up when the same names sit down every night.',
    reality:
      'Your opponents now study as hard as you do. Edge comes from game selection and consistency, not from knowing one more line.',
    tools: [
      { href: 'variance.html', label: 'MTT Variance' },
      { href: 'bounty.html', label: 'Mystery Bounty' },
      { href: 'bankroll.html', label: 'Bankroll' },
    ],
    color: '#f97316',
  },
  {
    id: 'high',
    step: 6,
    name: 'High stakes',
    tagline: 'A small profession with very few seats.',
    stakes: '$215 – $10,000+',
    bankroll: '$100,000+ or backing',
    buyIns: '300+ buy-ins, or a stable',
    months: 'Ongoing',
    volume: 'Selective, not maximal',
    study: '15+ h/week, often with a group',
    skills: [
      'Game selection as the primary skill',
      'Swings measured in tens of thousands',
      'A network: staking, swaps, study groups',
      'Knowing when a game is not worth sitting in',
    ],
    proof: 'You are still here in five years, and the money is still yours.',
    reality:
      'Vanishingly few players arrive, and many who do are backed rather than playing their own roll. Most high-stakes careers are shorter than people imagine.',
    tools: [
      { href: 'bankroll.html', label: 'Bankroll' },
      { href: 'variance.html', label: 'MTT Variance' },
    ],
    color: '#ef4444',
  },
]

export interface Truth {
  title: string
  body: string
}

/**
 * The parts that are true at every stage, and that no single milestone owns.
 */
export const TRUTHS: Truth[] = [
  {
    title: 'Volume is the entry fee',
    body: 'Results under a few thousand tournaments are noise. A 10% ROI player can lose over 1,000 tournaments without doing anything wrong, so any conclusion drawn from a short sample is guesswork wearing a number.',
  },
  {
    title: 'Study time is not optional',
    body: 'A rough working ratio is one hour of study for every three or four hours of play. Players who only play get better for about a year and then stop, because the game keeps moving and they do not.',
  },
  {
    title: 'Bankroll rules break under pressure, not on paper',
    body: 'Everyone agrees with the numbers when they are up. The rule only exists for the day you are stuck and a bigger game looks like the way out — that is the day it is worth something.',
  },
  {
    title: 'Moving up is a decision, not a reward',
    body: 'Move up on a sample and a bankroll, never on a feeling or a heater. And be as willing to move back down: the players who survive are the ones who treat that as normal rather than as failure.',
  },
  {
    title: 'The mental game is the last leak to close',
    body: 'Tilt costs more than any strategic error most players will ever make, and it compounds — a bad session becomes a bad week through decisions made while upset rather than through cards.',
  },
  {
    title: 'Most people do not make it, and that is the honest part',
    body: 'The overwhelming majority of players never beat low stakes for a meaningful sample. Knowing that in advance makes the climb a choice rather than a disappointment.',
  },
]

/** Rough cumulative time to reach the start of each stage, in months. */
export function monthsToReach(step: number): { low: number; high: number } {
  const spans: [number, number][] = [
    [0, 0],
    [1, 1],
    [3, 5],
    [9, 17],
    [21, 41],
    [45, 89],
  ]
  const index = Math.max(0, Math.min(spans.length - 1, step - 1))
  const [low, high] = spans[index]
  return { low, high }
}

export const STORAGE_KEY = 'poker-tools:roadmap-stage'

/** Which stage the reader says they are on, if they have said. */
export function loadStage(): string | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return STAGES.some((stage) => stage.id === stored) ? stored : null
  } catch {
    return null
  }
}

export function saveStage(id: string | null): void {
  if (typeof localStorage === 'undefined') return
  try {
    if (id === null) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // Private mode — the choice just will not persist.
  }
}

export function stageIndex(id: string | null): number {
  if (!id) return -1
  return STAGES.findIndex((stage) => stage.id === id)
}
