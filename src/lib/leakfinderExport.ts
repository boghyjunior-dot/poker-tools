import {
  formatStatUnit,
  POSITION_LABELS,
  relevanceLabel,
  type FullAnalysis,
  type RankedLeak,
  type StatResult,
} from './leakfinder'
import { fixFor } from './leakfinderFixes'
import { BASELINE } from './leakfinderTargets'

const SEVERITY_WORD = {
  ok: 'ok',
  minor: 'minor',
  moderate: 'moderate',
  major: 'major',
} as const

function formatValue(result: StatResult): string {
  const unit = formatStatUnit(result.def.unit)
  return `${result.value}${unit}`
}

function formatTarget(result: StatResult): string {
  const unit = formatStatUnit(result.def.unit)
  const [min, max] = result.range
  return min === max ? `${min}${unit}` : `${min}–${max}${unit}`
}

function leakLine(leak: RankedLeak, index: number): string {
  const direction = leak.direction === 'low' ? 'too low' : 'too high'
  const fix = fixFor(leak.def.id, leak.positionKey)
  const parts = [
    `${index + 1}. **${leak.def.label}** (${POSITION_LABELS[leak.positionKey]}) — ` +
      `${formatValue(leak)} vs ${formatTarget(leak)}, ${direction} · ${SEVERITY_WORD[leak.severity]}`,
    `   - ${leak.advice}`,
  ]
  if (leak.relevanceNote) parts.push(`   - Sample: ${leak.relevanceNote}`)
  if (leak.capped) {
    parts.push(
      `   - Held at ${SEVERITY_WORD[leak.severity]} rather than ${SEVERITY_WORD[leak.rawSeverity]} — not enough sample to prove it.`,
    )
  }
  if (fix) parts.push(`   - Next: ${fix.label} (${fix.href})`)
  return parts.join('\n')
}

/**
 * The whole analysis as Markdown, for pasting into a coaching thread or a
 * study journal. Everything the screen shows, in reading order.
 */
export function reportToMarkdown(
  analysis: FullAnalysis,
  options: { topLeaks?: number; includeAllStats?: boolean; savedAt?: Date } = {},
): string {
  const { topLeaks = 10, includeAllStats = true, savedAt = new Date() } = options
  const lines: string[] = []

  lines.push('# Leak Finder report')
  lines.push('')
  lines.push(`Generated ${savedAt.toISOString().slice(0, 10)} · baseline: ${BASELINE.name}`)
  lines.push('')
  lines.push(`**Overall score: ${analysis.overallScore} / 100** · ${analysis.ranked.length} leaks across ${analysis.positionsWithData.length} position${analysis.positionsWithData.length === 1 ? '' : 's'}`)
  lines.push('')

  if (analysis.ranked.length > 0) {
    lines.push(`## Fix these first`)
    lines.push('')
    analysis.ranked.slice(0, topLeaks).forEach((leak, i) => {
      lines.push(leakLine(leak, i))
    })
    lines.push('')
  } else {
    lines.push('No leaks found — every stat with data sits inside its healthy band.')
    lines.push('')
  }

  if (!includeAllStats) return lines.join('\n')

  lines.push('## Every stat by position')
  lines.push('')
  for (const key of analysis.positionsWithData) {
    const report = analysis.byPosition[key]
    if (!report) continue
    lines.push(`### ${POSITION_LABELS[key]} — ${report.score}/100`)
    lines.push('')
    lines.push('| Stat | You | Target | Verdict | Sample |')
    lines.push('| --- | --- | --- | --- | --- |')
    for (const result of report.results) {
      const verdict =
        result.severity === 'ok'
          ? 'ok'
          : `${SEVERITY_WORD[result.severity]} · ${result.direction === 'low' ? 'too low' : 'too high'}`
      lines.push(
        `| ${result.def.label} | ${formatValue(result)} | ${formatTarget(result)} | ${verdict} | ${relevanceLabel(result.relevance)} |`,
      )
    }
    lines.push('')
  }

  lines.push('---')
  lines.push('')
  lines.push(BASELINE.note)

  return lines.join('\n')
}

/** Plain-text version for places that render Markdown as literal text. */
export function reportToText(analysis: FullAnalysis): string {
  return reportToMarkdown(analysis, { includeAllStats: false })
    .replace(/\*\*/g, '')
    .replace(/^#+ /gm, '')
}
