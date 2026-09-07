import { useCallback, useSyncExternalStore } from 'react'
import { ro } from './locales/ro'

/**
 * Translation, keyed by the English string itself.
 *
 * There is no key namespace to invent or keep in sync: the JSX still reads as
 * English prose, and anything without a translation falls through to the
 * original rather than rendering a missing-key placeholder. That matters here
 * because the suite is large and translating it is a rolling job — a page that
 * has not been covered yet simply stays in English.
 *
 * Poker vocabulary is deliberately left alone. Romanian players say buy-in,
 * bounty, bankroll, range, flop, shove, 3-bet and ROI in English, so
 * translating them would make the tools harder to read, not easier.
 */

export const LOCALES = ['en', 'ro'] as const
export type Locale = (typeof LOCALES)[number]

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  ro: 'Română',
}

/** Short label for the switcher, where space is tight. */
export const LOCALE_SHORT: Record<Locale, string> = {
  en: 'EN',
  ro: 'RO',
}

export type Dictionary = Record<string, string>

const DICTIONARIES: Record<Locale, Dictionary> = {
  en: {},
  ro,
}

const STORAGE_KEY = 'poker-tools:locale'

function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

function readStored(): Locale {
  if (typeof localStorage === 'undefined') return 'en'
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isLocale(stored)) return stored
  } catch {
    // Private mode — fall through to the browser's preference.
  }
  if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('ro')) {
    return 'ro'
  }
  return 'en'
}

let current: Locale = readStored()
const listeners = new Set<() => void>()

function syncDocumentLang(locale: Locale): void {
  if (typeof document !== 'undefined') document.documentElement.lang = locale
}

syncDocumentLang(current)

export function getLocale(): Locale {
  return current
}

export function setLocale(locale: Locale): void {
  if (!isLocale(locale) || locale === current) return
  current = locale
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // Not persisting is survivable; the session still switches.
  }
  syncDocumentLang(locale)
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export type TranslateVars = Record<string, string | number>

/** Fill `{name}` placeholders from `vars`. */
function interpolate(text: string, vars?: TranslateVars): string {
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  )
}

export function translate(locale: Locale, text: string, vars?: TranslateVars): string {
  const dictionary = DICTIONARIES[locale]
  return interpolate(dictionary[text] ?? text, vars)
}

export type TranslateFn = (text: string, vars?: TranslateVars) => string

/** Subscribe a component to the active language. */
export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, getLocale, () => 'en' as Locale)
}

/**
 * The translation function for the active language.
 *
 * `const t = useT()` then `t('Choose a tool to get started')`.
 */
export function useT(): TranslateFn {
  const locale = useLocale()
  return useCallback(
    (text: string, vars?: TranslateVars) => translate(locale, text, vars),
    [locale],
  )
}

/** How much of the interface a locale actually covers, for the switcher. */
export function coverage(locale: Locale): number {
  return Object.keys(DICTIONARIES[locale]).length
}
