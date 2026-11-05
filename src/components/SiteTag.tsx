import { siteStyle } from '../lib/sites'

/** A room, in its own colours. Nothing at all when there is no room. */
export function SiteTag({ site, className = '' }: { site: string; className?: string }) {
  const trimmed = site.trim()
  if (trimmed === '') return null
  return (
    <span
      className={`inline-block whitespace-nowrap rounded border px-1.5 py-0.5 text-[10px] font-semibold leading-tight ${siteStyle(trimmed).className} ${className}`}
    >
      {trimmed}
    </span>
  )
}

/**
 * Pick a room.
 *
 * A dropdown rather than free text, because five rooms covers almost every
 * row and typing the same word nightly is how "GGpoker" and "GG Poker" end
 * up as two sites in the filter. Anything already on the row stays in the
 * list, so an imported site is never silently replaced by the first option.
 */
export function SiteSelect({
  value,
  onChange,
  options,
  ariaLabel,
  placeholder = '—',
  className = '',
}: {
  value: string
  onChange: (site: string) => void
  options: string[]
  ariaLabel: string
  placeholder?: string
  /** Layout only — the colours come from whichever room is selected. */
  className?: string
}) {
  // Tinted by what is chosen, so a column of these reads as a column of tags
  // rather than a column of identical grey boxes you have to actually read.
  const tint = value.trim()
    ? siteStyle(value).className
    : 'border-slate-700 bg-slate-950/60 text-slate-400'
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`rounded border px-1.5 py-0.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${tint} ${className}`}
    >
      {/* The options themselves stay on the browser's own menu background,
          which no stylesheet here reliably controls. */}
      <option value="" className="bg-slate-900 text-slate-300">
        {placeholder}
      </option>
      {options.map((site) => (
        <option key={site} value={site} className="bg-slate-900 text-slate-200">
          {site}
        </option>
      ))}
    </select>
  )
}
