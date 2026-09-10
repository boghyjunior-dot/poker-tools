import { useT } from '../lib/i18n'

/**
 * Says out loud that a page is not on the live site.
 *
 * Five pages are held back now, so the notice is one component rather than
 * five copies of a paragraph — and naming the variable in the banner means the
 * way to ship the page is written on the page itself.
 */
export function LocalOnlyBanner({
  published,
  variable,
  className = 'mb-6',
}: {
  /** True once the page's flag is set, in which case nothing renders. */
  published: boolean
  variable: string
  className?: string
}) {
  const t = useT()
  if (published) return null

  return (
    <p
      className={`rounded-lg border border-amber-900/60 bg-amber-950/30 px-4 py-3 text-xs text-amber-300 ${className}`}
    >
      {t(
        'Local only — this page is not on the published site. Build with {variable}=true to ship it.',
        { variable },
      )}
    </p>
  )
}
