/**
 * The road from knowing nothing to knowing enough to play anywhere.
 *
 * The rungs are what you understand, not what you play. Stakes make a bad
 * ladder: people move up on a heater and down on a downswing without their
 * game changing either way, and a player can grind micro for a decade while
 * genuinely understanding a great deal. Knowledge only moves one direction, so
 * it is the honest axis.
 *
 * Money and volume still appear, because a concept is not learned until it has
 * survived a sample — but they sit under the idea rather than above it.
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
  /** The one idea this stage is about — the road's sub-label. */
  concept: string
  /** What you can now explain, out loud, without notes. */
  skills: string[]
  /** The test for owning the stage, phrased as understanding rather than results. */
  proof: string
  /** What you cannot yet see from here. The most useful line on the page. */
  blindSpot: string
  /** Volume it takes before the idea is actually internalised. */
  volume: string
  /** Study hours per week the stage expects. */
  study: string
  /** Typical time spent here by someone who gets through it. */
  months: string
  /** Where this level of understanding usually shows up, if you are playing. */
  stakes: string
  /** The roll that level of play usually needs. Context, not the milestone. */
  bankroll: string
  /** What actually happens to most people here. */
  reality: string
  /** Tools in this suite that do the work of this stage. */
  tools: StageTool[]
  /** Accent colour, as a hex so the SVG and the cards agree. */
  color: string
}

export const STAGES: RoadmapStage[] = [
  {
    id: 'rules',
    step: 1,
    name: 'The mechanics',
    tagline: 'You know what beats what, and whose turn it is.',
    concept: 'How the game runs',
    skills: [
      'Hand rankings without stopping to think',
      'The seat names, and why acting last is worth something',
      'Blinds, antes, and how a tournament clock changes the game',
      'Pot odds as a fraction you can actually work out',
    ],
    proof: 'You can explain why the button is the best seat without saying "because it is".',
    blindSpot:
      'You do not yet know that most of your decisions are made before the flop, so you are still thinking of a hand as five cards rather than as a range.',
    volume: '~50 hands played slowly, out loud',
    study: '2–3 h/week',
    months: '2–4 weeks',
    stakes: 'Play money · freerolls',
    bankroll: '$0',
    reality:
      'The cheapest stage and the one people rush. Every hour here saves ten later, because everything above is built on it.',
    tools: [{ href: 'quiz.html', label: 'Quiz Me' }],
    color: '#64748b',
  },
  {
    id: 'ranges',
    step: 2,
    name: 'Ranges, not hands',
    tagline: 'You think in the set of hands you could have, not the two you do.',
    concept: 'Range thinking',
    skills: [
      'An opening range for every seat, and the reason it differs',
      'Why a hand that looks playable from the button is a fold from UTG',
      'Combos: why AK is 16 hands and AA is only 6',
      'Shove and call ranges when the stack gets short',
    ],
    proof: 'You can write out your opening range from any seat and defend each edge of it.',
    blindSpot:
      'You know your own range and have barely thought about theirs, so every flop still feels like it is about your cards.',
    volume: '500–1,000 hands with a chart open',
    study: '3–5 h/week',
    months: '2–4 months',
    stakes: '$0.10 – $2',
    bankroll: '$100 – $200',
    reality:
      'Most players never finish this stage — they learn ranges, then abandon them the first time a disciplined session gets boring.',
    tools: [
      { href: 'charts.html', label: 'Preflop Charts' },
      { href: 'quiz.html', label: 'Quiz Me' },
    ],
    color: '#0ea5e9',
  },
  {
    id: 'boards',
    step: 3,
    name: 'Boards and equity',
    tagline: 'You can say what a flop did to both ranges, not just to your hand.',
    concept: 'Whose board is it?',
    skills: [
      'Reading a texture for who it favours and why',
      'Equity as a number you can estimate, then check',
      'C-betting because the board earns it, not out of habit',
      'Which draws are worth continuing with and which only look like it',
    ],
    proof: 'Shown a flop and two ranges, you can name who it favours and roughly by how much.',
    blindSpot:
      'You can read one street. Turn and river still arrive as surprises rather than as branches you planned for.',
    volume: '3,000–5,000 hands, reviewed afterwards',
    study: '5–8 h/week',
    months: '6–12 months',
    stakes: '$1 – $5',
    bankroll: '$500 – $1,500',
    reality:
      'The first real filter, and where most self-taught players stall — reading a board well is much harder than memorising a chart.',
    tools: [
      { href: 'equity.html', label: 'Equity Calculator' },
      { href: 'leakfinder.html', label: 'Leak Finder' },
    ],
    color: '#22c55e',
  },
  {
    id: 'frequencies',
    step: 4,
    name: 'Frequencies',
    tagline: 'You defend by number, and plan streets before you reach them.',
    concept: 'How often, not just what',
    skills: [
      'Minimum defence frequency, and when it stops applying',
      'Choosing a river before you bet the turn',
      'Blockers: why the hand you hold changes what they can have',
      'Balancing a line, and knowing when balance is a waste of effort',
    ],
    proof: 'You can say what fraction of your range continues against a bet, and why that number.',
    blindSpot:
      'Everything you know assumes chips are worth chips. In a tournament they stop being worth chips exactly when the pots get big.',
    volume: '10,000+ hands, with the leaks tracked',
    study: '8–12 h/week',
    months: '1–2 years',
    stakes: '$5 – $22',
    bankroll: '$3,000 – $8,000',
    reality:
      'Where most serious players top out, and there is nothing wrong with that. This is already more than most people at the table understand.',
    tools: [
      { href: 'mdf.html', label: 'MDF Range Tool' },
      { href: 'practice.html', label: 'MDF Practice' },
      { href: 'leakfinder.html', label: 'Leak Finder' },
    ],
    color: '#eab308',
  },
  {
    id: 'icm',
    step: 5,
    name: 'Tournament theory',
    tagline: 'You know when a chip stops being worth a chip.',
    concept: 'Chips are not money',
    skills: [
      'ICM on the bubble, on pay jumps, and at a final table',
      'Why the same shove is right at 40bb and terrible at 12bb',
      'Bounties, and what they do to a calling range',
      'Reading a payout structure before you register',
    ],
    proof: 'You can explain to somebody else why a clear chipEV call can be a clear ICM fold.',
    blindSpot:
      'You know the theory and still play the baseline against everybody. You have not yet learned to leave it on purpose.',
    volume: '15,000+ hands, including deep runs',
    study: '10–15 h/week',
    months: '2–4 years',
    stakes: '$22 – $215',
    bankroll: '$15,000 – $50,000',
    reality:
      'The point where your opponents study too. Understanding stops being rare, and the edge moves to who applies it consistently.',
    tools: [
      { href: 'bounty.html', label: 'Mystery Bounty' },
      { href: 'variance.html', label: 'MTT Variance' },
      { href: 'bankroll.html', label: 'Bankroll' },
    ],
    color: '#f97316',
  },
  {
    id: 'deviation',
    step: 6,
    name: 'Deliberate deviation',
    tagline: 'You know the baseline well enough to leave it on purpose.',
    concept: 'Knowing why, not just what',
    skills: [
      'Why the solver does what it does, not only what it outputs',
      'Exploits you can switch on for one player and off for the next',
      'Diagnosing your own game without waiting for someone to tell you',
      'Explaining any of it clearly enough to teach it',
    ],
    proof: 'You can name a spot where you deviate, say who you deviate against, and say what it costs if you are wrong.',
    blindSpot:
      'Nothing structural is missing. From here it is upkeep — the game moves, and staying level means never quite stopping.',
    volume: 'Selective study beats raw volume',
    study: '15+ h/week, usually with a group',
    months: 'Ongoing',
    stakes: '$215 – $10,000+',
    bankroll: '$100,000+ or backing',
    reality:
      'Very few players get here, and knowing this much does not by itself pay. It is necessary for the top games, not sufficient.',
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
 * The parts that are true at every stage, and that no single rung owns.
 */
export const TRUTHS: Truth[] = [
  {
    title: 'Knowing and doing are different rungs',
    body: 'You can explain minimum defence frequency perfectly and still fold too much at the table on a bad night. A concept is not yours until it survives being tired, tilted and behind.',
  },
  {
    title: 'Volume is what turns study into knowledge',
    body: 'Reading about board texture teaches you the words. A few thousand hands teaches you the pattern. Neither substitutes for the other, and study without volume produces players who can argue but not play.',
  },
  {
    title: 'Study time is not optional',
    body: 'A rough working ratio is one hour of study for every three or four of play. Players who only play improve for about a year and then stop, because the game keeps moving and they do not.',
  },
  {
    title: 'Stakes are a consequence, not a rung',
    body: 'Moving up should follow understanding and a bankroll, never a heater. Plenty of players sit at stakes their game does not support, and plenty of strong players stay low on purpose.',
  },
  {
    title: 'The mental game is the last thing to close',
    body: 'Tilt costs more than any strategic error most players will ever make, and it compounds — a bad session becomes a bad week through decisions made while upset rather than through cards.',
  },
  {
    title: 'Most people stop at stage three or four',
    body: 'Very few players ever really own frequencies, let alone ICM. Knowing that in advance turns the climb into a choice rather than a disappointment.',
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
