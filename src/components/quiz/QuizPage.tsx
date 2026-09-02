import { useMemo, useRef, useState } from 'react'
import { BackToMenu } from '../BackToMenu'
import { Footer } from '../Footer'
import bundledDeckFile from '../../content/quizDecks.json'
import {
  collectTags,
  mergeDecks,
  parseQuizFile,
  selectCards,
  shuffle,
  type QuizCard,
  type QuizCardType,
  type QuizDeck,
} from '../../lib/quiz'

const STORAGE_KEY = 'poker-tools:quiz:imported-decks'

type StudyMode = 'flashcards' | 'quiz' | 'reference'

const MODE_LABELS: Record<StudyMode, string> = {
  flashcards: 'Flashcards',
  quiz: 'Quiz',
  reference: 'Reference',
}

const MODE_TYPES: Record<StudyMode, QuizCardType[]> = {
  flashcards: ['flashcard', 'heuristic'],
  quiz: ['choice'],
  reference: ['heuristic'],
}

const BUNDLED_DECKS: QuizDeck[] = parseQuizFile(JSON.stringify(bundledDeckFile)).decks

function loadImportedDecks(): QuizDeck[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = parseQuizFile(raw)
    return parsed.decks
  } catch {
    return []
  }
}

function persistImportedDecks(decks: QuizDeck[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, decks }))
  } catch {
    // Private browsing or a full quota — the session still works, it just will not persist.
  }
}

function Chip({
  active,
  onClick,
  children,
  tone = 'indigo',
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  tone?: 'indigo' | 'slate'
}) {
  const activeClass = tone === 'indigo' ? 'bg-indigo-600 text-white' : 'bg-slate-600 text-white'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
        active ? activeClass : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
      }`}
    >
      {children}
    </button>
  )
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-slate-800 bg-slate-900/60 p-5 ${className}`}>
      {children}
    </section>
  )
}

interface Session {
  key: string
  queue: QuizCard[]
  position: number
  revealed: boolean
  picked: number | null
  right: number
  wrong: number
  replayed: number
}

function newSession(key: string, pool: QuizCard[], mode: StudyMode): Session {
  return {
    key,
    // Reference mode is a browsable list, so it keeps the authored order.
    queue: mode === 'reference' ? pool : shuffle(pool),
    position: 0,
    revealed: false,
    picked: null,
    right: 0,
    wrong: 0,
    replayed: 0,
  }
}

/** Advance past the current card, clearing the per-card reveal/answer state. */
function nextCard(session: Session): Session {
  return { ...session, position: session.position + 1, revealed: false, picked: null }
}

/** Push the current card to the back of the queue so it comes round again. */
function requeueCurrent(session: Session): Session {
  const card = session.queue[session.position]
  if (!card) return nextCard(session)
  return nextCard({ ...session, queue: [...session.queue, card], replayed: session.replayed + 1 })
}

function cardTitle(card: QuizCard): string {
  if (card.type === 'heuristic') return card.title
  if (card.type === 'flashcard') return card.front
  return card.question
}

function cardAnswer(card: QuizCard): string {
  if (card.type === 'heuristic') return card.body
  if (card.type === 'flashcard') return card.back
  return card.options[card.answer]
}

export function QuizPage() {
  const [importedDecks, setImportedDecks] = useState<QuizDeck[]>(() => loadImportedDecks())
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [importNotice, setImportNotice] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [mode, setMode] = useState<StudyMode>('flashcards')
  const [activeDeckIds, setActiveDeckIds] = useState<string[]>([])
  const [activeTags, setActiveTags] = useState<string[]>([])

  const allDecks = useMemo(() => mergeDecks(BUNDLED_DECKS, importedDecks), [importedDecks])
  const availableTags = useMemo(() => collectTags(allDecks), [allDecks])

  const pool = useMemo(
    () =>
      selectCards(allDecks, {
        deckIds: activeDeckIds,
        types: MODE_TYPES[mode],
        tags: activeTags,
      }),
    [allDecks, activeDeckIds, activeTags, mode],
  )

  // The session is keyed on everything that decides what is in scope. When the
  // key changes the session is rebuilt during render, so the queue can never
  // hold cards the current filters have excluded.
  const sessionKey = useMemo(
    () =>
      [mode, activeDeckIds.join('+'), activeTags.join('+'), allDecks.map((deck) => deck.id).join('+')].join(
        '|',
      ),
    [mode, activeDeckIds, activeTags, allDecks],
  )

  const [storedSession, setSession] = useState<Session>(() => newSession(sessionKey, pool, mode))
  let session = storedSession
  if (session.key !== sessionKey) {
    session = newSession(sessionKey, pool, mode)
    setSession(session)
  }

  const { queue, position, revealed, picked, right, wrong, replayed } = session
  const current = queue[position]
  const finished = queue.length > 0 && position >= queue.length
  const answered = right + wrong

  const toggle = (list: string[], value: string, set: (next: string[]) => void) => {
    set(list.includes(value) ? list.filter((item) => item !== value) : [...list, value])
  }

  const advance = () => setSession(nextCard)

  const restart = () => setSession(newSession(sessionKey, pool, mode))

  const answerChoice = (index: number) => {
    setSession((prev) => {
      const card = prev.queue[prev.position]
      if (prev.picked !== null || card?.type !== 'choice') return prev
      const correct = index === card.answer
      return {
        ...prev,
        picked: index,
        right: prev.right + (correct ? 1 : 0),
        wrong: prev.wrong + (correct ? 0 : 1),
      }
    })
  }

  const gradeFlashcard = (knew: boolean) => {
    setSession((prev) =>
      knew
        ? nextCard({ ...prev, right: prev.right + 1 })
        : requeueCurrent({ ...prev, wrong: prev.wrong + 1 }),
    )
  }

  const handleFile = async (file: File) => {
    setImportErrors([])
    setImportNotice(null)
    const text = await file.text()
    const { decks, errors } = parseQuizFile(text, file.name.replace(/\.[^.]+$/, ''))

    if (decks.length > 0) {
      const next = mergeDecks(importedDecks, decks)
      setImportedDecks(next)
      persistImportedDecks(next)
      const cards = decks.reduce((sum, deck) => sum + deck.cards.length, 0)
      setImportNotice(
        `Imported ${decks.length} deck${decks.length === 1 ? '' : 's'} · ${cards} card${cards === 1 ? '' : 's'} from ${file.name}`,
      )
    }
    setImportErrors(errors)
  }

  const removeImported = (deckId: string) => {
    const next = importedDecks.filter((deck) => deck.id !== deckId)
    setImportedDecks(next)
    persistImportedDecks(next)
    setActiveDeckIds((prev) => prev.filter((id) => id !== deckId))
    setImportNotice(null)
  }

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="mx-auto w-full max-w-3xl">
        <BackToMenu className="mb-3" />
        <h1 className="text-3xl font-bold text-white">Quiz Me</h1>
        <p className="mb-6 text-sm text-slate-400">
          Heuristics, flashcards and questions. Study the bundled decks or import your own file.
        </p>

        <div className="flex flex-col gap-4">
          <Panel>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-sm text-slate-400">Mode:</span>
              {(Object.keys(MODE_LABELS) as StudyMode[]).map((value) => (
                <Chip key={value} active={mode === value} onClick={() => setMode(value)}>
                  {MODE_LABELS[value]}
                </Chip>
              ))}
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-sm text-slate-400">Decks:</span>
              <Chip active={activeDeckIds.length === 0} onClick={() => setActiveDeckIds([])} tone="slate">
                All
              </Chip>
              {allDecks.map((deck) => (
                <Chip
                  key={deck.id}
                  active={activeDeckIds.includes(deck.id)}
                  onClick={() => toggle(activeDeckIds, deck.id, setActiveDeckIds)}
                >
                  {deck.name}
                </Chip>
              ))}
            </div>

            {availableTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-sm text-slate-400">Tags:</span>
                <Chip active={activeTags.length === 0} onClick={() => setActiveTags([])} tone="slate">
                  Any
                </Chip>
                {availableTags.map((tag) => (
                  <Chip
                    key={tag}
                    active={activeTags.includes(tag)}
                    onClick={() => toggle(activeTags, tag, setActiveTags)}
                  >
                    {tag}
                  </Chip>
                ))}
              </div>
            )}
          </Panel>

          {mode === 'reference' ? (
            <ReferenceList cards={queue} />
          ) : (
            <Panel>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                <span className="text-slate-400">
                  {queue.length === 0
                    ? 'No cards match'
                    : finished
                      ? `${queue.length} card${queue.length === 1 ? '' : 's'} done`
                      : `Card ${position + 1} of ${queue.length}`}
                </span>
                <span className="flex items-center gap-3 text-xs">
                  <span className="text-emerald-400">{right} right</span>
                  <span className="text-rose-400">{wrong} wrong</span>
                  {answered > 0 && (
                    <span className="text-slate-500">
                      {Math.round((right / answered) * 100)}%
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={restart}
                    className="rounded-md bg-slate-800 px-2.5 py-1 font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
                  >
                    Restart
                  </button>
                </span>
              </div>

              {queue.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-500">
                  Nothing to study with these filters. Widen the deck or tag selection, or import a deck below.
                </p>
              )}

              {finished && (
                <div className="py-8 text-center">
                  <p className="text-2xl font-bold text-white">
                    {answered > 0 ? `${Math.round((right / answered) * 100)}%` : 'Done'}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {right} right · {wrong} wrong
                    {replayed > 0 && ` · ${replayed} replayed`}
                  </p>
                  <button
                    type="button"
                    onClick={restart}
                    className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
                  >
                    Go again
                  </button>
                </div>
              )}

              {current && !finished && current.type === 'choice' && (
                <ChoiceView card={current} picked={picked} onPick={answerChoice} onNext={advance} />
              )}

              {current && !finished && current.type !== 'choice' && (
                <FlashcardView
                  card={current}
                  revealed={revealed}
                  onReveal={() => setSession((prev) => ({ ...prev, revealed: true }))}
                  onGrade={gradeFlashcard}
                />
              )}
            </Panel>
          )}

          <Panel>
            <h2 className="mb-1 text-sm font-semibold text-white">Import a deck</h2>
            <p className="mb-3 text-xs leading-relaxed text-slate-500">
              Pick a <code className="text-slate-400">.json</code> or{' '}
              <code className="text-slate-400">.md</code> deck file. It is stored in this browser only —
              to add cards for everyone, edit{' '}
              <code className="text-slate-400">src/content/quizDecks.json</code> in the repo.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.md,.markdown,.txt,application/json,text/markdown,text/plain"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleFile(file)
                e.target.value = ''
              }}
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700"
              >
                Choose deck file…
              </button>
              {importNotice && <span className="text-xs text-emerald-400">{importNotice}</span>}
            </div>

            {importErrors.length > 0 && (
              <ul className="mt-3 space-y-1 rounded-md border border-rose-900/60 bg-rose-950/30 p-3 text-xs text-rose-300">
                {importErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            )}

            {importedDecks.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 text-xs uppercase tracking-wide text-slate-500">Imported decks</h3>
                <ul className="space-y-1.5">
                  {importedDecks.map((deck) => (
                    <li
                      key={deck.id}
                      className="flex items-center justify-between rounded-md bg-slate-800/60 px-3 py-1.5 text-xs"
                    >
                      <span className="text-slate-300">
                        {deck.name}{' '}
                        <span className="text-slate-500">
                          · {deck.cards.length} card{deck.cards.length === 1 ? '' : 's'}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeImported(deck.id)}
                        className="text-slate-500 transition-colors hover:text-rose-400"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <details className="mt-4">
              <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-300">
                Deck file format
              </summary>
              <pre className="mt-2 overflow-x-auto rounded-md bg-slate-950/70 p-3 text-[11px] leading-relaxed text-slate-400">
{`# Deck name
Optional description.

## H: Minimum Defense Frequency
MDF = pot / (pot + bet).
Tags: mdf

## F: MDF vs a pot-sized bet
50% defend / 50% fold
Tags: mdf

## Q: Pot 100, villain bets 50. MDF?
- 50%
- [x] 67%
- 75%
> MDF = 100 / 150 = 67%.`}
              </pre>
            </details>
          </Panel>
        </div>

        <Footer />
      </div>
    </div>
  )
}

function FlashcardView({
  card,
  revealed,
  onReveal,
  onGrade,
}: {
  card: QuizCard
  revealed: boolean
  onReveal: () => void
  onGrade: (knew: boolean) => void
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onReveal}
        disabled={revealed}
        className="w-full rounded-lg border border-slate-700 bg-slate-950/50 p-6 text-left transition-colors enabled:hover:border-slate-600"
      >
        <p className="text-lg font-semibold leading-snug text-white">{cardTitle(card)}</p>
        {revealed ? (
          <p className="mt-4 whitespace-pre-line border-t border-slate-800 pt-4 text-sm leading-relaxed text-indigo-200">
            {cardAnswer(card)}
          </p>
        ) : (
          <p className="mt-4 text-xs text-slate-500">Click to reveal</p>
        )}
      </button>

      {card.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {card.tags.map((tag) => (
            <span key={tag} className="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-500">
              {tag}
            </span>
          ))}
        </div>
      )}

      {revealed && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onGrade(false)}
            className="flex-1 rounded-md border border-rose-900/70 bg-rose-950/40 px-4 py-2 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-950/70"
          >
            Again
          </button>
          <button
            type="button"
            onClick={() => onGrade(true)}
            className="flex-1 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
          >
            Got it
          </button>
        </div>
      )}
    </div>
  )
}

function ChoiceView({
  card,
  picked,
  onPick,
  onNext,
}: {
  card: Extract<QuizCard, { type: 'choice' }>
  picked: number | null
  onPick: (index: number) => void
  onNext: () => void
}) {
  return (
    <div>
      <p className="text-lg font-semibold leading-snug text-white">{card.question}</p>

      <div className="mt-4 flex flex-col gap-2">
        {card.options.map((option, index) => {
          const isCorrect = index === card.answer
          const isPicked = index === picked
          let style = 'border-slate-700 bg-slate-950/50 text-slate-200 hover:border-slate-600'
          if (picked !== null) {
            if (isCorrect) style = 'border-emerald-600 bg-emerald-950/40 text-emerald-200'
            else if (isPicked) style = 'border-rose-700 bg-rose-950/40 text-rose-200'
            else style = 'border-slate-800 bg-slate-950/30 text-slate-500'
          }
          return (
            <button
              key={option}
              type="button"
              onClick={() => onPick(index)}
              disabled={picked !== null}
              className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors ${style}`}
            >
              {option}
              {picked !== null && isCorrect && <span className="ml-2 text-xs">✓</span>}
              {picked !== null && isPicked && !isCorrect && <span className="ml-2 text-xs">✗</span>}
            </button>
          )
        })}
      </div>

      {picked !== null && (
        <>
          {card.explanation && (
            <p className="mt-4 rounded-md border border-slate-800 bg-slate-950/50 p-3 text-sm leading-relaxed text-slate-300">
              {card.explanation}
            </p>
          )}
          <button
            type="button"
            onClick={onNext}
            className="mt-4 w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            Next
          </button>
        </>
      )}
    </div>
  )
}

function ReferenceList({ cards }: { cards: QuizCard[] }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return cards
    return cards.filter((card) =>
      `${cardTitle(card)} ${cardAnswer(card)} ${card.tags.join(' ')}`.toLowerCase().includes(needle),
    )
  }, [cards, query])

  return (
    <Panel>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search heuristics…"
        className="mb-4 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
      />

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">No heuristics match.</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((card) => (
            <li key={card.id} className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
              <p className="font-semibold text-white">{cardTitle(card)}</p>
              <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-400">
                {cardAnswer(card)}
              </p>
              {card.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {card.tags.map((tag) => (
                    <span key={tag} className="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-500">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
