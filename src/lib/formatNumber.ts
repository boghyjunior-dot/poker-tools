/** Whole-unit currency figure with thousands separators, rounded to the nearest unit. */
export function formatMoney(value: number): string {
  const text = Math.round(Math.abs(value)).toLocaleString('en-US')
  return value < 0 ? `-${text}` : text
}

/** Short axis-label form: 1.2k, 15k, 3.4M. */
export function formatCompact(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(abs >= 10_000 ? 0 : 1)}k`
  return `${sign}${Math.round(abs)}`
}
