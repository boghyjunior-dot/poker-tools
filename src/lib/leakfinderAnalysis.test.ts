import { describe, expect, it } from 'vitest'
import { PT4_SAMPLE_EXPORT } from './pt4SampleExport'
import {
  analyzeAll,
  analyzeStats,
  evaluateStat,
  matchPosition,
  parsePositionalReport,
  parseStatsReport,
  POSITION_KEYS,
  POSITION_LABELS,
  POSITION_ONLY,
  relevanceFromOpportunities,
  relevanceWeight,
  STAT_DEFINITIONS,
  statAppliesTo,
  type StatDefinition,
} from './leakfinder'
import { reportToMarkdown, reportToText } from './leakfinderExport'
import { fixFor } from './leakfinderFixes'
import { diffSnapshots, emptyState, parseState } from './leakfinderStorage'
import {
  getPositionRange,
  getStatTarget,
  setTargetOverrides,
  statAppliesToPosition,
} from './leakfinderTargets'

const def = (id: string): StatDefinition => STAT_DEFINITIONS.find((d) => d.id === id)!

const sample = () => parsePositionalReport(PT4_SAMPLE_EXPORT)

describe('eight-seat position model', () => {
  it('uses the same seats as the preflop charts tool', () => {
    expect(POSITION_ONLY).toEqual(['utg', 'utg1', 'lj', 'hj', 'co', 'btn', 'sb', 'bb'])
    expect(POSITION_KEYS[0]).toBe('overall')
    expect(POSITION_KEYS).toHaveLength(9)
  })

  it('maps tracker seat names onto those seats', () => {
    expect(matchPosition('UTG')).toBe('utg')
    expect(matchPosition('EP')).toBe('utg')
    expect(matchPosition('UTG+1')).toBe('utg1')
    expect(matchPosition('LJ')).toBe('lj')
    expect(matchPosition('MP1')).toBe('lj')
    // A bare "MP" is the seat before the cutoff at 6-max, which is the hijack.
    expect(matchPosition('MP')).toBe('hj')
    expect(matchPosition('Hijack')).toBe('hj')
    expect(matchPosition('Dealer')).toBe('btn')
  })

  it('gives every seat a target for the universal stats', () => {
    for (const position of POSITION_ONLY) {
      expect(statAppliesToPosition('vpip', position)).toBe(true)
      expect(statAppliesToPosition('threeBetPf', position)).toBe(true)
    }
  })

  it('opens tighter from earlier seats', () => {
    const width = (seat: 'utg' | 'utg1' | 'lj' | 'hj' | 'co' | 'btn') =>
      getPositionRange('raiseFirst', seat)![0]
    expect(width('utg')).toBeLessThan(width('utg1'))
    expect(width('utg1')).toBeLessThan(width('lj'))
    expect(width('lj')).toBeLessThan(width('hj'))
    expect(width('hj')).toBeLessThan(width('co'))
    expect(width('co')).toBeLessThan(width('btn'))
  })
})

describe('overall aggregation', () => {
  it('fills the Overall column a positional export does not contain', () => {
    const { positions } = sample()
    // Before aggregation this was the winrate and nothing else.
    expect(Object.keys(positions.overall ?? {}).length).toBeGreaterThan(35)
  })

  it('rescues the stats that only exist at Overall', () => {
    const { positions, hands, opportunities } = sample()
    const analysis = analyzeAll(positions, hands, opportunities)
    const graded = new Set(analysis.byPosition.overall!.results.map((r) => r.def.id))
    // Every one of these has no per-seat target, so Overall is its only home.
    for (const id of ['donkTHu', 'floatT', 'donkR', 'raiseTCbet', 'foldToPf4BetAfter3BetLt30']) {
      expect(graded.has(id)).toBe(true)
    }
  })

  it('weights each stat by its own opportunity count, not just hands', () => {
    // Equal hands, but four times as many river spots from the button.
    const text = [
      'Position,Hands,CBet R,CBet R Count,VPIP',
      'BTN,1000,60,400,44',
      'SB,1000,20,100,30',
    ].join('\n')
    const { positions, opportunities } = parsePositionalReport(text)

    expect(opportunities.btn?.cbetR).toBe(400)
    // A straight average would be 40. Weighted by river spots: (60*400 + 20*100) / 500.
    expect(positions.overall?.cbetR).toBe(52)
    // VPIP has no Count column, so it falls back to hands and averages evenly.
    expect(positions.overall?.vpip).toBe(37)
  })

  it('does not invent an Overall reading for seat-specific stats', () => {
    // Averaging a 60% SB limp rate with seats that never limp is arithmetic,
    // not a leak, so limping is graded at the SB and nowhere else.
    expect(statAppliesTo('limpOpen', 'overall')).toBe(false)
    expect(statAppliesTo('limpOpen', 'sb')).toBe(true)
    expect(statAppliesTo('foldBbVsSb', 'overall')).toBe(false)
    expect(statAppliesTo('raiseFirst', 'overall')).toBe(false)
    // Universal stats keep their blended Overall reading.
    expect(statAppliesTo('vpip', 'overall')).toBe(true)
    expect(statAppliesTo('cbetR', 'overall')).toBe(true)
    // Stats with no positional targets at all are global by nature.
    expect(statAppliesTo('wtsd', 'overall')).toBe(true)
  })

  it('keeps an explicit Overall row in preference to the aggregate', () => {
    const text = 'Position,Hands,VPIP,Donk R\nAll,100,25.1,9\nBTN,100,44.1,3\nSB,100,30,5'
    const { positions } = parsePositionalReport(text)
    expect(positions.overall?.vpip).toBe(25.1)
    expect(positions.overall?.donkR).toBe(9)
  })
})

describe('sample size', () => {
  it('scales opportunity thresholds to how often a spot comes up', () => {
    expect(relevanceFromOpportunities(50)).toBe('insufficient')
    expect(relevanceFromOpportunities(250)).toBe('low')
    expect(relevanceFromOpportunities(800)).toBe('medium')
    expect(relevanceFromOpportunities(5000)).toBe('high')
  })

  it('holds a major leak down to minor when the sample cannot prove it', () => {
    const context = { hands: 40_000, opportunities: { cbetR: 30 } }
    const result = evaluateStat(def('cbetR'), 95, 'btn', context)
    expect(result.rawSeverity).toBe('major')
    expect(result.severity).toBe('minor')
    expect(result.capped).toBe(true)
    expect(result.opportunities).toBe(30)
  })

  it('leaves a well-sampled leak at full severity', () => {
    const result = evaluateStat(def('cbetR'), 95, 'btn', {
      hands: 40_000,
      opportunities: { cbetR: 5_000 },
    })
    expect(result.severity).toBe('major')
    expect(result.capped).toBe(false)
  })

  it('does not treat an unknown sample as a thin one', () => {
    // Manual entry carries no counts; discounting it would flatten every score.
    const result = evaluateStat(def('vpip'), 23, 'utg')
    expect(result.sampleKnown).toBe(false)
    expect(result.severity).toBe('major')
    expect(relevanceWeight(result.relevance, result.sampleKnown)).toBe(1)
  })

  it('counts a thin stat for less in the score', () => {
    const thin = analyzeStats({ cbetR: 95 }, 'btn', { opportunities: { cbetR: 30 } })
    const solid = analyzeStats({ cbetR: 95 }, 'btn', { opportunities: { cbetR: 5_000 } })
    expect(thin.score).toBeGreaterThan(solid.score)
  })
})

describe('analyzeAll', () => {
  it('ranks every leak across every seat, worst first', () => {
    const { positions, hands, opportunities } = sample()
    const analysis = analyzeAll(positions, hands, opportunities)

    expect(analysis.ranked.length).toBeGreaterThan(10)
    for (let i = 1; i < analysis.ranked.length; i++) {
      expect(analysis.ranked[i - 1].priority).toBeGreaterThanOrEqual(analysis.ranked[i].priority)
    }
    // Every ranked leak knows which seat it came from.
    for (const leak of analysis.ranked) {
      expect(POSITION_KEYS).toContain(leak.positionKey)
      expect(leak.severity).not.toBe('ok')
    }
  })

  it('scores the whole game without double-counting the Overall column', () => {
    const { positions, hands, opportunities } = sample()
    const analysis = analyzeAll(positions, hands, opportunities)
    expect(analysis.overallScore).toBeGreaterThanOrEqual(0)
    expect(analysis.overallScore).toBeLessThanOrEqual(100)
    expect(analysis.positionsWithData).toContain('btn')
    expect(analysis.positionsWithData).toContain('overall')
  })

  it('falls back to the Overall score for a flat paste', () => {
    const { values } = parseStatsReport('VPIP: 31.2\nWTSD: 34\nW$SD: 44')
    const analysis = analyzeAll({ overall: values })
    expect(analysis.positionsWithData).toEqual(['overall'])
    expect(analysis.overallScore).toBe(analysis.byPosition.overall!.score)
  })

  it('returns an empty analysis for no data', () => {
    const analysis = analyzeAll({})
    expect(analysis.ranked).toEqual([])
    expect(analysis.positionsWithData).toEqual([])
    expect(analysis.overallScore).toBe(0)
  })
})

describe('tracker coverage', () => {
  it('reads the columns Hold\'em Manager and Hand2Note export', () => {
    const { values } = parseStatsReport(
      [
        'VPIP: 23.4',
        'PFR: 19.1',
        'Attempt to Steal: 38.2',
        'WTSD: 27.5',
        'W$SD: 52.1',
        'WWSF: 45.3',
        'Aggression Factor: 2.6',
        'Fold to 3Bet: 55',
      ].join('\n'),
    )
    expect(values.vpip).toBe(23.4)
    expect(values.pfr).toBe(19.1)
    expect(values.attemptToSteal).toBe(38.2)
    expect(values.wtsd).toBe(27.5)
    expect(values.wsd).toBe(52.1)
    expect(values.wwsf).toBe(45.3)
    expect(values.aggressionFactor).toBe(2.6)
    expect(values.twoBetPfAndFold).toBe(55)
  })

  it('parses an HM3-style positional table', () => {
    const hm3 = [
      'Position,Hands,VPIP,PFR,WTSD,W$SD,Agg Factor',
      'Early,12000,15.1,12.4,26.1,51.2,2.4',
      'Cutoff,12000,26.4,22.1,27.5,50.1,2.8',
      'Button,12000,45.1,38.2,28.9,49.4,3.1',
      'Big Blind,12000,38.5,12.1,30.1,47.2,2.2',
    ].join('\n')
    const { positions, hands, isTable } = parsePositionalReport(hm3)
    expect(isTable).toBe(true)
    expect(positions.utg?.vpip).toBe(15.1)
    expect(positions.btn?.pfr).toBe(38.2)
    expect(positions.bb?.aggressionFactor).toBe(2.2)
    expect(hands.overall).toBe(48000)
  })

  it('grades a ratio stat on its own scale', () => {
    expect(evaluateStat(def('aggressionFactor'), 2.6).severity).toBe('ok')
    expect(evaluateStat(def('aggressionFactor'), 0.9).direction).toBe('low')
  })
})

describe('fix links', () => {
  it('sends a preflop range leak to that seat in the charts tool', () => {
    const fix = fixFor('raiseFirst', 'btn')
    expect(fix?.href).toBe('charts.html')
    expect(fix?.label).toContain('BTN')
  })

  it('sends a defend-or-fold leak to the MDF tool', () => {
    expect(fixFor('foldToFCbetHu', 'bb')?.href).toBe('mdf.html')
    expect(fixFor('twoBetPfAndFold', 'co')?.href).toBe('mdf.html')
  })

  it('points every bundled stat somewhere', () => {
    const missing = STAT_DEFINITIONS.filter((d) => fixFor(d.id, 'btn') === null)
    expect(missing.map((d) => d.id)).toEqual([])
  })

  it('only links to tools that exist', () => {
    const pages = new Set(['charts.html', 'mdf.html', 'equity.html', 'quiz.html', 'variance.html'])
    for (const d of STAT_DEFINITIONS) {
      expect(pages.has(fixFor(d.id, 'overall')!.href)).toBe(true)
    }
  })
})

describe('markdown export', () => {
  it('leads with the ranked leaks and names the tool that fixes each one', () => {
    const { positions, hands, opportunities } = sample()
    const analysis = analyzeAll(positions, hands, opportunities)
    const md = reportToMarkdown(analysis, { savedAt: new Date('2026-01-15T00:00:00Z') })

    expect(md).toContain('# Leak Finder report')
    expect(md).toContain('2026-01-15')
    expect(md).toContain(`**Overall score: ${analysis.overallScore} / 100**`)
    expect(md).toContain('## Fix these first')
    expect(md).toContain('Next:')
    expect(md).toContain('## Every stat by position')
    expect(md).toContain(POSITION_LABELS.btn)
  })

  it('can leave out the per-position tables', () => {
    const analysis = analyzeAll(sample().positions)
    const short = reportToMarkdown(analysis, { includeAllStats: false })
    expect(short).not.toContain('## Every stat by position')
  })

  it('says so plainly when there are no leaks', () => {
    const analysis = analyzeAll({ overall: { wtsd: 27, wsd: 52 } })
    expect(reportToMarkdown(analysis)).toContain('No leaks found')
  })

  it('strips markup for the plain-text version', () => {
    const analysis = analyzeAll(sample().positions)
    const text = reportToText(analysis)
    expect(text).not.toContain('**')
    expect(text).not.toContain('# ')
  })
})

describe('persistence', () => {
  it('round-trips a saved session', () => {
    const state = {
      current: {
        values: { btn: { vpip: 44.1 }, overall: { wtsd: 27 } },
        hands: { btn: 1000 },
        opportunities: { btn: { cbetR: 200 } },
      },
      snapshots: [
        {
          id: 'snap-1',
          label: 'January',
          savedAt: '2026-01-01T00:00:00.000Z',
          values: { btn: { vpip: 40 } },
          hands: { btn: 900 },
          opportunities: {},
          score: 61,
        },
      ],
      overrides: {},
    }
    const parsed = parseState(JSON.parse(JSON.stringify(state)))
    expect(parsed.current.values.btn?.vpip).toBe(44.1)
    expect(parsed.current.opportunities.btn?.cbetR).toBe(200)
    expect(parsed.snapshots[0].label).toBe('January')
    expect(parsed.snapshots[0].score).toBe(61)
  })

  it('throws nothing at malformed storage', () => {
    expect(parseState(null)).toEqual(emptyState())
    expect(parseState('nonsense')).toEqual(emptyState())
    expect(parseState({ current: { values: { nowhere: { vpip: 1 } } } }).current.values).toEqual({})
    expect(parseState({ snapshots: [{ nope: true }] }).snapshots).toEqual([])
  })

  it('drops values that are not finite numbers', () => {
    const parsed = parseState({
      current: { values: { btn: { vpip: 'abc', threeBetPf: '8.5', cbetR: null } } },
    })
    expect(parsed.current.values.btn).toEqual({ threeBetPf: 8.5 })
  })

  it('shows what moved between two snapshots', () => {
    const before = { values: { btn: { vpip: 40, cbetR: 60 }, sb: { vpip: 30 } } }
    const after = { values: { btn: { vpip: 44, cbetR: 60 }, sb: { vpip: 31, wtsd: 27 } } }
    const diff = diffSnapshots(before, after)

    expect(diff.changed.map((d) => d.statId)).toEqual(['vpip', 'vpip'])
    expect(diff.changed[0]).toMatchObject({ positionKey: 'btn', before: 40, after: 44, change: 4 })
    // Unchanged stats are not noise in the list.
    expect(diff.changed.some((d) => d.statId === 'cbetR')).toBe(false)
    expect(diff.added).toBe(1)
    expect(diff.removed).toBe(0)
  })
})

describe('editable targets', () => {
  it('lets a user override a target for one seat', () => {
    setTargetOverrides({ vpip: { btn: { range: [50, 60] } } })
    expect(getPositionRange('vpip', 'btn')).toEqual([50, 60])
    expect(evaluateStat(def('vpip'), 55, 'btn').severity).toBe('ok')
    // Other seats keep the bundled numbers.
    expect(getStatTarget('vpip', 'co')).toBe(26)
    setTargetOverrides({})
    expect(evaluateStat(def('vpip'), 55, 'btn').severity).not.toBe('ok')
  })

  it('applies an all-seats override everywhere', () => {
    setTargetOverrides({ cbetR: { all: { target: 70 } } })
    expect(getStatTarget('cbetR', 'btn')).toBe(70)
    expect(getStatTarget('cbetR', 'sb')).toBe(70)
    setTargetOverrides({})
    expect(getStatTarget('cbetR', 'btn')).toBe(46)
  })

  it('can bring a stat that had no targets into the per-seat tabs', () => {
    expect(statAppliesTo('wtsd', 'btn')).toBe(false)
    setTargetOverrides({ wtsd: { btn: { range: [20, 30] } } })
    expect(statAppliesTo('wtsd', 'btn')).toBe(true)
    setTargetOverrides({})
  })
})
