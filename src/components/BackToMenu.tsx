import { useT } from '../lib/i18n'

/**
 * Back to the menu this page was opened from.
 *
 * Which menu that is stopped being obvious when the site grew a front door:
 * a tool belongs to the toolbox, not to the two cards in front of it, and
 * sending somebody up two levels to come back down one is a small tax paid
 * on every tool, every time. So the destination is a prop, defaulting to the
 * root for the pages that really are one level down.
 */
export function BackToMenu({
  className = '',
  href = './',
  label = 'Main menu',
}: {
  className?: string
  href?: string
  label?: string
}) {
  const t = useT()

  return (
    <a
      href={href}
      className={`inline-flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-slate-300 ${className}`}
    >
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-3 w-3" aria-hidden>
        <path d="M10 12 6 8l4-4" />
      </svg>
      {t(label)}
    </a>
  )
}
