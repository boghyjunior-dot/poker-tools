import { useT } from '../lib/i18n'

export function BackToMenu({ className = '' }: { className?: string }) {
  const t = useT()

  return (
    <a
      href="./"
      className={`inline-flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-slate-300 ${className}`}
    >
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-3 w-3" aria-hidden>
        <path d="M10 12 6 8l4-4" />
      </svg>
      {t('Main menu')}
    </a>
  )
}
