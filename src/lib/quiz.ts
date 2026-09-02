/**
 * Quiz Me deck model.
 *
 * A deck file is either JSON or a light Markdown dialect. Both parse to the
 * same {@link QuizDeck} shape, so a bundled repo deck and a deck imported from
 * disk are indistinguishable once loaded. Parsing never throws on bad content:
 * it collects per-card errors so one malformed card cannot sink a whole file.
 */

export type QuizCardType = 'heuristic' | 'flashcard' | 'choice'

export interface HeuristicCard {
  type: 'heuristic'
  id: string
  title: string
  body: string
  tags: string[]
}

export interface FlashCard {
  type: 'flashcard'
  id: string
  front: string
  back: string
  tags: string[]
}

export interface ChoiceCard {
  type: 'choice'
  id: string
  question: string
  options: string[]
  answer: number
  explanation?: string
  tags: string[]
}

export type QuizCard = HeuristicCard | FlashCard | ChoiceCard

export interface QuizDeck {
  id: string
  name: string
  description?: string
  cards: QuizCard[]
}

export interface ParsedDeckFile {
  decks: QuizDeck[]
  errors: string[]
}

const TYPE_ALIASES: Record<string, QuizCardType> = {
  h: 'heuristic',
  heuristic: 'heuristic',
  rule: 'heuristic',
  f: 'flashcard',
  flashcard: 'flashcard',
  card: 'flashcard',
  q: 'choice',
  quiz: 'choice',
  choice: 'choice',
  question: 'choice',
  mcq: 'choice',
}

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'deck'
}

function asText(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

function normalizeTags(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : []
  const tags = raw.map((tag) => asText(tag).toLowerCase()).filter(Boolean)
  return [...new Set(tags)]
}

function resolveAnswer(raw: unknown, options: string[]): number | null {
  if (typeof raw === 'number' && Number.isInteger(raw) && raw >= 0 && raw < options.length) {
    return raw
  }
  const text = asText(raw)
  if (!text) return null
  const byText = options.findIndex((option) => option.toLowerCase() === text.toLowerCase())
  if (byText >= 0) return byText
  const asNumber = Number(text)
  if (Number.isInteger(asNumber) && asNumber >= 0 && asNumber < options.length) return asNumber
  return null
}

function normalizeCard(raw: unknown, id: string, label: string, errors: string[]): QuizCard | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    errors.push(`${label}: expected an object`)
    return null
  }

  const record = raw as Record<string, unknown>
  const rawType = asText(record.type).toLowerCase()
  const type = TYPE_ALIASES[rawType]
  if (!type) {
    errors.push(`${label}: unknown type "${rawType || '(missing)'}" — use heuristic, flashcard, or choice`)
    return null
  }

  const tags = normalizeTags(record.tags)

  if (type === 'heuristic') {
    const title = asText(record.title) || asText(record.front) || asText(record.question)
    const body = asText(record.body) || asText(record.back) || asText(record.answer)
    if (!title || !body) {
      errors.push(`${label}: heuristic needs both "title" and "body"`)
      return null
    }
    return { type, id, title, body, tags }
  }

  if (type === 'flashcard') {
    const front = asText(record.front) || asText(record.question) || asText(record.title)
    const back = asText(record.back) || asText(record.answer) || asText(record.body)
    if (!front || !back) {
      errors.push(`${label}: flashcard needs both "front" and "back"`)
      return null
    }
    return { type, id, front, back, tags }
  }

  const question = asText(record.question) || asText(record.front) || asText(record.title)
  const options = Array.isArray(record.options)
    ? record.options.map((option) => asText(option)).filter(Boolean)
    : []
  if (!question) {
    errors.push(`${label}: choice card needs a "question"`)
    return null
  }
  if (options.length < 2) {
    errors.push(`${label}: choice card needs at least 2 options`)
    return null
  }

  const answer = resolveAnswer(record.answer, options)
  if (answer === null) {
    errors.push(`${label}: "answer" must be a 0-based index or match one of the options exactly`)
    return null
  }

  const explanation = asText(record.explanation) || undefined
  return { type: 'choice', id, question, options, answer, explanation, tags }
}

function normalizeDeck(raw: unknown, position: number, errors: string[]): QuizDeck | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    errors.push(`Deck ${position + 1}: expected an object`)
    return null
  }

  const record = raw as Record<string, unknown>
  const name = asText(record.name) || asText(record.title) || `Deck ${position + 1}`
  const id = asText(record.id) || slugify(name)
  const description = asText(record.description) || undefined
  const rawCards = Array.isArray(record.cards) ? record.cards : []

  if (rawCards.length === 0) {
    errors.push(`Deck "${name}": no cards found`)
    return null
  }

  const cards: QuizCard[] = []
  rawCards.forEach((rawCard, index) => {
    const card = normalizeCard(rawCard, `${id}:${index}`, `Deck "${name}" card ${index + 1}`, errors)
    if (card) cards.push(card)
  })

  if (cards.length === 0) return null
  return { id, name, description, cards }
}

/** JSON deck file: `{ decks: [...] }`, a bare array of decks, or a single deck object. */
function parseJson(text: string, errors: string[]): QuizDeck[] {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch (err) {
    errors.push(`Invalid JSON: ${err instanceof Error ? err.message : 'could not parse file'}`)
    return []
  }

  let rawDecks: unknown[]
  if (Array.isArray(data)) {
    rawDecks = data
  } else if (data && typeof data === 'object' && Array.isArray((data as Record<string, unknown>).decks)) {
    rawDecks = (data as Record<string, unknown>).decks as unknown[]
  } else {
    rawDecks = [data]
  }

  const decks: QuizDeck[] = []
  rawDecks.forEach((rawDeck, index) => {
    const deck = normalizeDeck(rawDeck, index, errors)
    if (deck) decks.push(deck)
  })
  return decks
}

const DECK_HEADING = /^#\s+(.+)$/
const CARD_HEADING = /^##\s*([A-Za-z]+)\s*:\s*(.*)$/
const OPTION_LINE = /^[-*]\s+(\[[ xX]\]\s*)?(.+)$/
const EXPLANATION_LINE = /^>\s?(.*)$/
const TAGS_LINE = /^tags:\s*(.+)$/i

interface MarkdownCard {
  type: QuizCardType
  heading: string
  body: string[]
  options: { text: string; correct: boolean }[]
  explanation: string[]
  tags: string[]
}

interface MarkdownDeck {
  name: string
  description: string[]
  cards: MarkdownCard[]
}

/**
 * Markdown deck dialect:
 *
 *     # Deck name
 *     Optional description line(s).
 *
 *     ## H: Heuristic title
 *     Body text.
 *
 *     ## F: Flashcard front
 *     Flashcard back.
 *
 *     ## Q: Question text
 *     - a wrong option
 *     - [x] the correct option
 *     > explanation
 *     Tags: mdf, preflop
 */
function parseMarkdown(text: string, fallbackName: string, errors: string[]): QuizDeck[] {
  const lines = text.split(/\r?\n/)
  const decks: MarkdownDeck[] = []
  let card: MarkdownCard | null = null

  const startDeck = (name: string): MarkdownDeck => {
    const deck: MarkdownDeck = { name, description: [], cards: [] }
    decks.push(deck)
    card = null
    return deck
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()

    const deckMatch = DECK_HEADING.exec(line)
    if (deckMatch) {
      startDeck(deckMatch[1].trim())
      continue
    }

    const cardMatch = CARD_HEADING.exec(line)
    if (cardMatch) {
      const deck = decks[decks.length - 1] ?? startDeck(fallbackName)
      const type = TYPE_ALIASES[cardMatch[1].toLowerCase()]
      if (!type) {
        errors.push(`Unknown card marker "## ${cardMatch[1]}:" — use H:, F:, or Q:`)
        card = null
        continue
      }
      card = { type, heading: cardMatch[2].trim(), body: [], options: [], explanation: [], tags: [] }
      deck.cards.push(card)
      continue
    }

    if (!line.trim()) {
      if (card) card.body.push('')
      continue
    }

    if (!card) {
      const deck = decks[decks.length - 1]
      if (deck) deck.description.push(line.trim())
      continue
    }

    const trimmed = line.trim()

    const tagsMatch = TAGS_LINE.exec(trimmed)
    if (tagsMatch) {
      card.tags = normalizeTags(tagsMatch[1])
      continue
    }

    const explanationMatch = EXPLANATION_LINE.exec(trimmed)
    if (explanationMatch) {
      card.explanation.push(explanationMatch[1].trim())
      continue
    }

    const optionMatch = card.type === 'choice' ? OPTION_LINE.exec(trimmed) : null
    if (optionMatch) {
      const marker = optionMatch[1] ?? ''
      card.options.push({ text: optionMatch[2].trim(), correct: /[xX]/.test(marker) })
      continue
    }

    card.body.push(trimmed)
  }

  const result: QuizDeck[] = []
  for (const deck of decks) {
    const id = slugify(deck.name)
    const cards: QuizCard[] = []

    deck.cards.forEach((raw, index) => {
      const cardId = `${id}:${index}`
      const label = `Deck "${deck.name}" card ${index + 1}`
      const body = raw.body.join('\n').trim()

      if (raw.type === 'heuristic') {
        if (!raw.heading || !body) {
          errors.push(`${label}: "## H:" needs a title and at least one body line`)
          return
        }
        cards.push({ type: 'heuristic', id: cardId, title: raw.heading, body, tags: raw.tags })
        return
      }

      if (raw.type === 'flashcard') {
        if (!raw.heading || !body) {
          errors.push(`${label}: "## F:" needs a front and at least one back line`)
          return
        }
        cards.push({ type: 'flashcard', id: cardId, front: raw.heading, back: body, tags: raw.tags })
        return
      }

      if (raw.options.length < 2) {
        errors.push(`${label}: "## Q:" needs at least 2 "- option" lines`)
        return
      }
      const answer = raw.options.findIndex((option) => option.correct)
      if (answer < 0) {
        errors.push(`${label}: mark the correct option with "- [x] ..."`)
        return
      }
      cards.push({
        type: 'choice',
        id: cardId,
        question: raw.heading,
        options: raw.options.map((option) => option.text),
        answer,
        explanation: raw.explanation.join(' ').trim() || undefined,
        tags: raw.tags,
      })
    })

    if (cards.length === 0) {
      if (deck.cards.length === 0) errors.push(`Deck "${deck.name}": no cards found`)
      continue
    }

    result.push({
      id,
      name: deck.name,
      description: deck.description.join(' ').trim() || undefined,
      cards,
    })
  }

  return result
}

/** Parse a deck file. Format is detected from the content, not the extension. */
export function parseQuizFile(text: string, fallbackName = 'Imported deck'): ParsedDeckFile {
  const errors: string[] = []
  const trimmed = text.trim()

  if (!trimmed) return { decks: [], errors: ['File is empty'] }

  const decks =
    trimmed.startsWith('{') || trimmed.startsWith('[')
      ? parseJson(trimmed, errors)
      : parseMarkdown(text, fallbackName, errors)

  if (decks.length === 0 && errors.length === 0) errors.push('No decks found in file')

  return { decks, errors }
}

/** Later decks win on an id collision, so an imported deck can shadow a bundled one. */
export function mergeDecks(...groups: QuizDeck[][]): QuizDeck[] {
  const byId = new Map<string, QuizDeck>()
  for (const group of groups) {
    for (const deck of group) byId.set(deck.id, deck)
  }
  return [...byId.values()]
}

export function collectTags(decks: QuizDeck[]): string[] {
  const tags = new Set<string>()
  for (const deck of decks) {
    for (const card of deck.cards) {
      for (const tag of card.tags) tags.add(tag)
    }
  }
  return [...tags].sort()
}

export function selectCards(
  decks: QuizDeck[],
  filters: { deckIds?: string[]; types?: QuizCardType[]; tags?: string[] } = {},
): QuizCard[] {
  const { deckIds, types, tags } = filters
  const cards: QuizCard[] = []
  for (const deck of decks) {
    if (deckIds && deckIds.length > 0 && !deckIds.includes(deck.id)) continue
    for (const card of deck.cards) {
      if (types && types.length > 0 && !types.includes(card.type)) continue
      if (tags && tags.length > 0 && !card.tags.some((tag) => tags.includes(tag))) continue
      cards.push(card)
    }
  }
  return cards
}

/** Fisher-Yates on a copy. `random` is injectable so tests stay deterministic. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const swap = copy[i]
    copy[i] = copy[j]
    copy[j] = swap
  }
  return copy
}
