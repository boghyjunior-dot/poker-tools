import { LOCALES, LOCALE_LABELS, LOCALE_SHORT, setLocale, useLocale, useT } from '../lib/i18n'

/**
 * Language picker.
 *
 * Two languages, so a pair of buttons beats a dropdown: the alternative is
 * visible rather than hidden behind a click.
 */
export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const locale = useLocale()
  const t = useT()

  return (
    <div
      className={`inline-flex items-center gap-1 ${className}`}
      role="group"
      aria-label={t('Language')}
    >
      {LOCALES.map((option) => {
        const active = option === locale
        return (
          <button
            key={option}
            type="button"
            onClick={() => setLocale(option)}
            aria-pressed={active}
            title={LOCALE_LABELS[option]}
            className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
              active
                ? 'bg-slate-700 text-white'
                : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
            }`}
          >
            {LOCALE_SHORT[option]}
          </button>
        )
      })}
    </div>
  )
}
