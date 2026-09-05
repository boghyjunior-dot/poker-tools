import { formatMoney } from './formatNumber'
import type {
  CallEvaluation,
  DepletionRow,
  MysteryBountyResult,
  RemainingBountiesResult,
} from './mysteryBounty'

export interface BountyReportInput {
  name?: string
  full: MysteryBountyResult
  remaining?: RemainingBountiesResult | null
  depletion?: DepletionRow[]
  call?: CallEvaluation | null
  bigBlind: number
  savedAt?: Date
}

const pct = (value: number) => `${(value * 100).toFixed(1)}%`

/**
 * The whole picture as Markdown, for a study journal or a railbird chat.
 */
export function bountyReportToMarkdown(input: BountyReportInput): string {
  const { full, remaining, depletion, call, bigBlind, savedAt = new Date() } = input
  const lines: string[] = []

  lines.push(`# Mystery bounty — ${input.name?.trim() || 'untitled event'}`)
  lines.push('')
  lines.push(`Generated ${savedAt.toISOString().slice(0, 10)} · big blind ${bigBlind.toLocaleString('en-US')}`)
  lines.push('')

  lines.push('## Start of the phase')
  lines.push('')
  lines.push(`- Bounty pool: ${formatMoney(full.bountyPool)} over ${full.draws.toLocaleString('en-US')} envelopes`)
  lines.push(`- Average bounty: ${formatMoney(full.averageBounty)} · ${full.averageBountyBb.toFixed(1)} bb`)
  lines.push(`- That is ${full.multipleOfEntryBounty.toFixed(1)}x what each entry contributed`)
  if (full.typicalBounty !== null) {
    lines.push(
      `- Typical draw once the top ${full.topPrizeCount} ${full.topPrizeCount === 1 ? 'envelope is' : 'envelopes are'} set aside: ${formatMoney(full.typicalBounty)}`,
    )
  }
  lines.push('')

  const drum = remaining ?? null
  if (drum) {
    lines.push('## What is left in the drum')
    lines.push('')
    lines.push(`- ${drum.envelopes.toLocaleString('en-US')} envelopes holding ${formatMoney(drum.pool)}`)
    lines.push(`- Average now: ${formatMoney(drum.averageBounty)} · ${drum.averageBountyBb.toFixed(1)} bb`)
    lines.push(`- Most likely draw: ${drum.mostLikely ? formatMoney(drum.mostLikely.value) : '—'} · median ${formatMoney(drum.medianBounty)}`)
    if (drum.richnessVsStart !== null) {
      lines.push(
        `- ${drum.richnessVsStart >= 1 ? 'Still rich' : 'Picked over'}: ${drum.richnessVsStart.toFixed(2)}x the start-of-phase average`,
      )
    }
    lines.push('')
    lines.push('| Envelope | Left | Chance per KO | Share of the money |')
    lines.push('| --- | --- | --- | --- |')
    for (const tier of drum.tiers) {
      lines.push(
        `| ${formatMoney(tier.value)} | ${tier.count.toLocaleString('en-US')} | ${pct(tier.chance)} | ${pct(tier.share)} |`,
      )
    }
    lines.push('')
  }

  if (depletion && depletion.length > 0) {
    lines.push('## How long the top rung lasts')
    lines.push('')
    lines.push('| Players left | Envelopes drawn from here | Top rung still live |')
    lines.push('| --- | --- | --- |')
    for (const row of depletion) {
      lines.push(
        `| ${row.playersLeft.toLocaleString('en-US')} | ${row.envelopesDrawn.toLocaleString('en-US')} | ${pct(row.survival)} |`,
      )
    }
    lines.push('')
  }
  if (call) {
    lines.push('## Calling an all-in')
    lines.push('')
    lines.push(`- Risking ${call.callBb.toFixed(1)} bb into a ${call.potBb.toFixed(1)} bb pot`)
    lines.push(`- Break-even equity without the bounty: ${pct(call.without)}`)
    lines.push(`- With ${call.bountyInPlayBb.toFixed(1)} bb of collectable bounty: ${pct(call.with)}`)
    lines.push(`- The bounty saves ${(call.saved * 100).toFixed(1)} points of equity`)
    if (call.bubbleFactor !== 1) {
      lines.push(`- Bubble factor ${call.bubbleFactor.toFixed(2)} applied to the risk side`)
    }
    if (call.uncoveredCount > 0) {
      lines.push(
        `- ${formatMoney(call.unreachableBountyBb)} bb of bounty is unreachable: ${call.uncoveredCount} opponent${call.uncoveredCount === 1 ? '' : 's'} ${call.uncoveredCount === 1 ? 'has' : 'have'} you covered, so winning does not eliminate ${call.uncoveredCount === 1 ? 'them' : 'them all'}.`,
      )
    }
    lines.push('')
  }

  lines.push('---')
  lines.push('')
  lines.push(
    'Chip EV unless a bubble factor is set. Bounty value is cash and is not discounted by ICM, which is why it pushes against bubble pressure.',
  )

  return lines.join('\n')
}
