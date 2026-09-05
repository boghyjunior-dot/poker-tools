import { describe, expect, it } from 'vitest'
import bundled from '../content/quizDecks.json'
import { ALL_CELLS } from './matrix'
import {
  collectTags,
  mergeDecks,
  parseQuizFile,
  selectCards,
  shuffle,
  slugify,
  type ChoiceCard,
  type FlashCard,
  type HeuristicCard,
} from './quiz'

describe('parseQuizFile — JSON', () => {
  it('reads the { decks: [...] } wrapper', () => {
    const { decks, errors } = parseQuizFile(
      JSON.stringify({
        decks: [
          {
            name: 'Sample',
            cards: [{ type: 'flashcard', front: 'MDF vs pot', back: '50%' }],
          },
        ],
      }),
    )
    expect(errors).toEqual([])
    expect(decks).toHaveLength(1)
    expect(decks[0].id).toBe('sample')
    expect(decks[0].cards[0]).toMatchObject({ type: 'flashcard', front: 'MDF vs pot', back: '50%' })
  })

  it('accepts a bare array and a single deck object', () => {
    const cards = [{ type: 'flashcard', front: 'a', back: 'b' }]
    expect(parseQuizFile(JSON.stringify([{ name: 'One', cards }])).decks).toHaveLength(1)
    expect(parseQuizFile(JSON.stringify({ name: 'One', cards })).decks).toHaveLength(1)
  })

  it('resolves a choice answer given as option text or as an index', () => {
    const base = { type: 'choice', question: 'MDF vs half pot?', options: ['50%', '67%'] }
    const byText = parseQuizFile(JSON.stringify({ name: 'd', cards: [{ ...base, answer: '67%' }] }))
    const byIndex = parseQuizFile(JSON.stringify({ name: 'd', cards: [{ ...base, answer: 1 }] }))
    expect((byText.decks[0].cards[0] as ChoiceCard).answer).toBe(1)
    expect((byIndex.decks[0].cards[0] as ChoiceCard).answer).toBe(1)
  })

  it('keeps good cards and reports only the bad ones', () => {
    const { decks, errors } = parseQuizFile(
      JSON.stringify({
        name: 'Mixed',
        cards: [
          { type: 'flashcard', front: 'good', back: 'card' },
          { type: 'flashcard', front: 'missing back' },
          { type: 'choice', question: 'too few options', options: ['only one'], answer: 0 },
          { type: 'wat', title: 'bad type', body: 'x' },
        ],
      }),
    )
    expect(decks[0].cards).toHaveLength(1)
    expect(errors).toHaveLength(3)
    expect(errors[0]).toContain('card 2')
    expect(errors[1]).toContain('at least 2 options')
    expect(errors[2]).toContain('unknown type')
  })

  it('reports invalid JSON without throwing', () => {
    const { decks, errors } = parseQuizFile('{ not json')
    expect(decks).toEqual([])
    expect(errors[0]).toContain('Invalid JSON')
  })

  it('reports an empty file', () => {
    expect(parseQuizFile('   ').errors).toEqual(['File is empty'])
  })
})

describe('parseQuizFile — Markdown', () => {
  const source = [
    '# Preflop drills',
    'Shortcuts worth memorising.',
    '',
    '## H: Rule of 2 and 4',
    'Outs x 4 on the flop, outs x 2 on the turn.',
    'Tags: equity, outs',
    '',
    '## F: MDF vs a pot-sized bet',
    '50% defend / 50% fold',
    'Tags: mdf',
    '',
    '## Q: Pot 100, villain bets 50. MDF?',
    '- 50%',
    '- [x] 67%',
    '- 75%',
    '> MDF = 100 / 150.',
    'Tags: mdf',
  ].join('\n')

  it('parses all three card types from one file', () => {
    const { decks, errors } = parseQuizFile(source)
    expect(errors).toEqual([])
    expect(decks).toHaveLength(1)

    const deck = decks[0]
    expect(deck.name).toBe('Preflop drills')
    expect(deck.description).toBe('Shortcuts worth memorising.')
    expect(deck.cards.map((card) => card.type)).toEqual(['heuristic', 'flashcard', 'choice'])

    const heuristic = deck.cards[0] as HeuristicCard
    expect(heuristic.title).toBe('Rule of 2 and 4')
    expect(heuristic.body).toBe('Outs x 4 on the flop, outs x 2 on the turn.')
    expect(heuristic.tags).toEqual(['equity', 'outs'])

    const flashcard = deck.cards[1] as FlashCard
    expect(flashcard.back).toBe('50% defend / 50% fold')

    const choice = deck.cards[2] as ChoiceCard
    expect(choice.options).toEqual(['50%', '67%', '75%'])
    expect(choice.answer).toBe(1)
    expect(choice.explanation).toBe('MDF = 100 / 150.')
  })

  it('splits multiple decks on each # heading', () => {
    const { decks } = parseQuizFile('# One\n## F: a\nb\n\n# Two\n## F: c\nd')
    expect(decks.map((deck) => deck.name)).toEqual(['One', 'Two'])
  })

  it('falls back to the given deck name when the file has no # heading', () => {
    const { decks } = parseQuizFile('## F: front\nback', 'notes.md')
    expect(decks[0].name).toBe('notes.md')
  })

  it('flags a choice card with no correct option marked', () => {
    const { decks, errors } = parseQuizFile('# D\n## Q: pick one\n- a\n- b')
    expect(decks).toEqual([])
    expect(errors[0]).toContain('[x]')
  })

  it('flags an unknown card marker', () => {
    const { errors } = parseQuizFile('# D\n## Z: what\nbody')
    expect(errors[0]).toContain('Unknown card marker')
  })
})

describe('deck helpers', () => {
  const deckA = {
    id: 'a',
    name: 'A',
    cards: [
      { type: 'flashcard' as const, id: 'a:0', front: 'f', back: 'b', tags: ['mdf'] },
      { type: 'heuristic' as const, id: 'a:1', title: 't', body: 'b', tags: ['icm'] },
    ],
  }
  const deckB = {
    id: 'b',
    name: 'B',
    cards: [{ type: 'flashcard' as const, id: 'b:0', front: 'f', back: 'b', tags: ['mdf'] }],
  }

  it('lets a later deck shadow an earlier one with the same id', () => {
    const shadow = { ...deckA, name: 'A (imported)' }
    const merged = mergeDecks([deckA, deckB], [shadow])
    expect(merged).toHaveLength(2)
    expect(merged.find((deck) => deck.id === 'a')!.name).toBe('A (imported)')
  })

  it('collects tags across decks, sorted and deduped', () => {
    expect(collectTags([deckA, deckB])).toEqual(['icm', 'mdf'])
  })

  it('filters by deck, type and tag', () => {
    expect(selectCards([deckA, deckB])).toHaveLength(3)
    expect(selectCards([deckA, deckB], { deckIds: ['b'] })).toHaveLength(1)
    expect(selectCards([deckA, deckB], { types: ['heuristic'] })).toHaveLength(1)
    expect(selectCards([deckA, deckB], { tags: ['mdf'] })).toHaveLength(2)
  })

  it('shuffles without dropping or duplicating items', () => {
    const items = [1, 2, 3, 4, 5]
    const shuffled = shuffle(items, () => 0.42)
    expect([...shuffled].sort()).toEqual(items)
    expect(items).toEqual([1, 2, 3, 4, 5])
  })

  it('slugifies names for use as deck ids', () => {
    expect(slugify('MDF & pot odds')).toBe('mdf-pot-odds')
    expect(slugify('!!!')).toBe('deck')
  })
})

describe('bundled deck file', () => {
  it('parses with no errors', () => {
    const { decks, errors } = parseQuizFile(JSON.stringify(bundled))
    expect(errors).toEqual([])
    expect(decks.length).toBeGreaterThanOrEqual(3)
  })

  it('ships all three card types and every choice answer is in range', () => {
    const { decks } = parseQuizFile(JSON.stringify(bundled))
    const cards = selectCards(decks)
    expect(new Set(cards.map((card) => card.type))).toEqual(
      new Set(['heuristic', 'flashcard', 'choice']),
    )
    for (const card of cards) {
      if (card.type !== 'choice') continue
      expect(card.answer).toBeGreaterThanOrEqual(0)
      expect(card.answer).toBeLessThan(card.options.length)
    }
  })

  it('gives every card a unique id', () => {
    const { decks } = parseQuizFile(JSON.stringify(bundled))
    const ids = selectCards(decks).map((card) => card.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('combo maths deck', () => {
  const { decks } = parseQuizFile(JSON.stringify(bundled))
  const deck = decks.find((d) => d.id === 'combo-maths')!
  const cards = deck.cards

  /** Recompute the real figures from the matrix rather than trusting the deck. */
  const actual = (() => {
    let pairs = 0
    let suited = 0
    let offsuit = 0
    for (const cell of ALL_CELLS) {
      if (cell.type === 'pair') pairs += cell.combos
      else if (cell.type === 'suited') suited += cell.combos
      else offsuit += cell.combos
    }
    const total = pairs + suited + offsuit
    const pct = (n: number) => `${((n / total) * 100).toFixed(1)}%`
    return { total, pairs, suited, offsuit, pct }
  })()

  const choiceFor = (needle: string) =>
    cards.find((c) => c.type === 'choice' && c.question.includes(needle)) as ChoiceCard | undefined

  it('exists with all three card types', () => {
    expect(deck).toBeDefined()
    expect(new Set(cards.map((c) => c.type))).toEqual(new Set(['heuristic', 'flashcard', 'choice']))
  })

  it('states the right total number of combos', () => {
    expect(actual.total).toBe(1326)
    const card = choiceFor('How many hand combinations')!
    expect(card.options[card.answer]).toBe('1,326')
  })

  it('states the right share for each hand type', () => {
    expect(actual.pct(actual.pairs)).toBe('5.9%')
    expect(actual.pct(actual.suited)).toBe('23.5%')
    expect(actual.pct(actual.offsuit)).toBe('70.6%')

    const pairs = choiceFor('pocket pairs?')!
    const suited = choiceFor('suited hands?')!
    const offsuit = choiceFor('offsuit hands?')!
    expect(pairs.options[pairs.answer]).toBe(actual.pct(actual.pairs))
    expect(suited.options[suited.answer]).toBe(actual.pct(actual.suited))
    expect(offsuit.options[offsuit.answer]).toBe(actual.pct(actual.offsuit))
  })

  it('offers the grid-share figure as a wrong answer, since that is the real trap', () => {
    // 13/169 and 78/169 are what people reach for by eye.
    expect(choiceFor('pocket pairs?')!.options).toContain('7.7%')
    expect(choiceFor('suited hands?')!.options).toContain('46.2%')
  })

  it('keeps every choice answer inside its own options', () => {
    for (const card of cards) {
      if (card.type !== 'choice') continue
      expect(card.answer).toBeGreaterThanOrEqual(0)
      expect(card.answer).toBeLessThan(card.options.length)
      expect(new Set(card.options).size).toBe(card.options.length)
    }
  })

  it('covers blockers as well as raw counting', () => {
    const blockers = cards.filter((c) => c.tags.includes('blockers'))
    expect(blockers.length).toBeGreaterThanOrEqual(2)
  })
})
