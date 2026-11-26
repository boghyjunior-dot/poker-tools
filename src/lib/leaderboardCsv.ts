/**
 * The standings as a file somebody else can open.
 *
 * A leaderboard people pay into is one they will want to check, argue with
 * and keep a copy of, and "take a screenshot" is not an answer to any of
 * those. A spreadsheet is.
 *
 * Every column the table shows and nothing it does not: the figures here are
 * handed in by the page rather than recomputed, so an export can never
 * disagree with the screen it was taken from.
 */

import type { Format, LastLongerStanding, Standing } from './leaderboard'

/**
 * One CSV field, quoted when it has to be.
 *
 * A player may put a comma, a quote or a newline in their name, and a file
 * that breaks on one of those is a file somebody only discovers is wrong
 * after they have pasted it into a spreadsheet.
 */
export function csvField(value: string | number): string {
  const text = String(value)
  if (!/[",\n\r]/.test(text)) return text
  return `"${text.replace(/"/g, '""')}"`
}

export function csvRows(rows: readonly (string | number)[][]): string {
  // CRLF, because that is what the spreadsheets this will be opened in
  // expect, and the ones that do not care do not care.
  return rows.map((row) => row.map(csvField).join(',')).join('\r\n')
}

/** The points table, as the page has it. */
export function standingsCsv(
  table: readonly Standing[],
  format: Format,
  /** Every dollar won, as the Prizes column has it: cashes and heads. */
  prizes: (player: string) => number,
  payout: (player: string) => number | undefined,
): string {
  const head = [
    'Rank',
    'Player',
    'Points',
    'Counting',
    'Of',
    'Played',
    'Best',
    'Cutoff',
    'Prizes',
    'Payout',
  ]
  const rows = table.map((row) => [
    row.rank,
    row.player,
    Math.round(row.points),
    row.counted,
    format.best,
    row.played,
    Math.round(row.best),
    row.cutoff === null ? '' : Math.round(row.cutoff),
    Math.round(prizes(row.player)),
    payout(row.player) === undefined ? '' : Math.round(payout(row.player) ?? 0),
  ])
  return csvRows([head, ...rows])
}

/** The last longer table, which has its own columns. */
export function lastLongerCsv(table: readonly LastLongerStanding[]): string {
  const head = ['Rank', 'Player', 'Won', 'Played', 'Win rate %', 'Deepest', 'Cashed']
  const rows = table.map((row) => [
    row.rank,
    row.player,
    row.won,
    row.played,
    row.winPct.toFixed(1),
    row.bestPlace === null ? '' : row.bestPlace,
    Math.round(row.cashFromWins),
  ])
  return csvRows([head, ...rows])
}

/** A filename that says what the file is and which period it covers. */
export function csvName(what: string, period: string): string {
  return `mtt-challenge-${what}-${period}.csv`
}

/**
 * Hand the file to the browser.
 *
 * Kept here beside the formatting so a second table wanting an export does
 * not reinvent the object-URL dance, and so the revoke is never forgotten.
 */
export function downloadCsv(name: string, csv: string): void {
  // A BOM, because Excel reads a plain UTF-8 CSV as the system codepage and
  // turns any name that is not ASCII into mojibake.
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}
