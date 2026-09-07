import { useT } from '../lib/i18n'
import { LanguageSwitcher } from './LanguageSwitcher'

const CONTACT_EMAIL = 'snapper.gto@gmail.com'

/** Site-wide footer note. Rendered at the bottom of every tool page. */
export function Footer({ className = '' }: { className?: string }) {
  const t = useT()

  return (
    <footer
      className={`mt-10 flex flex-col items-center gap-2 border-t border-slate-800/80 pt-4 pb-6 text-center ${className}`}
    >
      <p className="text-xs text-slate-500">
        {t('Questions and suggestions:')}{' '}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="text-slate-400 underline decoration-slate-700 underline-offset-2 transition-colors hover:text-slate-200 hover:decoration-slate-500"
        >
          {CONTACT_EMAIL}
        </a>
      </p>
      <LanguageSwitcher />
    </footer>
  )
}
