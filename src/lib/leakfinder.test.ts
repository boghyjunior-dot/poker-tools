import { describe, expect, it } from 'vitest'
import { PT4_SAMPLE_EXPORT } from './pt4SampleExport'
import {
  analyzeStats,
  evaluateStat,
  getStatRange,
  getStatTarget,
  matchPosition,
  parseNumber,
  parsePositionalReport,
  parseStatsReport,
  relevanceFromHands,
  STAT_DEFINITIONS,
  statAppliesTo,
} from './leakfinder'

function def(id: string) {
  return STAT_DEFINITIONS.find((d) => d.id === id)!
}

describe('parseStatsReport', () => {
  it('parses a PT4-style report with the supported stat set', () => {
    const text = `
      VPIP: 24.5
      Raise First: 19.2
      3Bet PF: 8.1
      2Bet PF & Fold: 52
      Fold to F Cbet (HU): 48
      All-In Adj BB/100: 3.2
    `
    const { values, matched } = parseStatsReport(text)
    expect(matched).toBe(6)
    expect(values.vpip).toBe(24.5)
    expect(values.raiseFirst).toBe(19.2)
    expect(values.threeBetPf).toBe(8.1)
    expect(values.twoBetPfAndFold).toBe(52)
    expect(values.foldToFCbetHu).toBe(48)
    expect(values.allInAdjBb100).toBe(3.2)
  })

  it('does not confuse 3Bet PF with 3Bet PF & Fold', () => {
    const { values } = parseStatsReport('3Bet PF & Fold 60\n3Bet PF 5')
    expect(values.threeBetPfAndFold).toBe(60)
    expect(values.threeBetPf).toBe(5)
  })

  it('handles tab/table layouts and comma decimals', () => {
    const { values } = parseStatsReport('VPIP\t32,5\tRaise First\t12')
    expect(values.vpip).toBe(32.5)
    expect(values.raiseFirst).toBe(12)
  })
})

describe('parseNumber', () => {
  it('parses dash blanks and quoted values', () => {
    expect(parseNumber('-')).toBeNull()
    expect(parseNumber('"28.43"')).toBe(28.43)
    expect(parseNumber('-16.91')).toBe(-16.91)
  })

  it('parses thousands separators used in PT4 Hand counts', () => {
    expect(parseNumber('34,820')).toBe(34820)
    expect(parseNumber('"34,820"')).toBe(34820)
    expect(parseNumber('1,234.56')).toBe(1234.56)
  })

  it('parses european decimal commas', () => {
    expect(parseNumber('32,5')).toBe(32.5)
  })
})

describe('evaluateStat', () => {
  it('flags values below range as low', () => {
    const result = evaluateStat(def('vpip'), 7, 'utg')
    expect(result.direction).toBe('low')
    expect(result.severity).toBe('major')
  })

  it('flags values above range with graded severity', () => {
    expect(evaluateStat(def('vpip'), 18, 'utg').severity).toBe('minor')
    expect(evaluateStat(def('vpip'), 20, 'utg').severity).toBe('moderate')
    expect(evaluateStat(def('vpip'), 23, 'utg').severity).toBe('major')
  })

  it('passes values within range', () => {
    const result = evaluateStat(def('raiseFirst'), 50, 'btn')
    expect(result.severity).toBe('ok')
    expect(result.direction).toBe('ok')
  })

  it('uses wider thresholds for bb/100 stats', () => {
    expect(evaluateStat(def('allInAdjBb100'), 7).severity).toBe('minor')
    expect(evaluateStat(def('allInAdjBb100'), 10).severity).toBe('moderate')
    expect(evaluateStat(def('allInAdjBb100'), 20).severity).toBe('major')
  })

  it('shows relevance from hand count only', () => {
    const result = evaluateStat(def('allInAdjBb100'), 5, undefined, { hands: 34820 })
    expect(result.relevance).toBe('medium')
    expect(result.relevanceNote).toBe('34,820 hands · moderately relevant')
  })

  it('does not use opportunity counts for percentage stats', () => {
    const result = evaluateStat(def('raiseFirst'), 28, 'sb', { hands: 34820 })
    expect(result.relevance).toBe('medium')
    expect(result.relevanceNote).toBe('34,820 hands · moderately relevant')
  })
})

describe('analyzeStats', () => {
  it('scores 100 with all stats in range', () => {
    const report = analyzeStats({ vpip: 46, raiseFirst: 50, threeBetPf: 10 }, 'btn')
    expect(report.score).toBe(100)
    expect(report.leaks).toHaveLength(0)
  })

  it('ranks worst leaks first and lowers score', () => {
    const report = analyzeStats({ vpip: 55 }, 'btn')
    expect(report.score).toBeLessThan(100)
    expect(report.leaks[0].def.id).toBe('vpip')
  })

  it('ignores missing stats', () => {
    const report = analyzeStats({ vpip: 24 })
    expect(report.results).toHaveLength(1)
  })

  it('uses position-adjusted MTT targets when a position is given', () => {
    expect(analyzeStats({ vpip: 44 }).leaks).toHaveLength(1)
    expect(analyzeStats({ vpip: 44 }, 'btn').leaks).toHaveLength(0)
    expect(analyzeStats({ vpip: 50 }, 'btn').leaks).toHaveLength(1)
  })

  it('skips stats that do not apply to the position', () => {
    const report = analyzeStats({ foldToSteal: 60, vpip: 18 }, 'utg')
    expect(report.results.map((r) => r.def.id)).toEqual(['vpip'])
    expect(statAppliesTo('raiseFirst', 'bb')).toBe(false)
    expect(statAppliesTo('foldBbVsSb', 'bb')).toBe(true)
    expect(statAppliesTo('limpRaise', 'utg')).toBe(false)
  })
})

describe('positional support', () => {
  it('maps position aliases to position groups', () => {
    expect(matchPosition('UTG+1')).toBe('utg1')
    expect(matchPosition('Hijack')).toBe('hj')
    expect(matchPosition('BU')).toBe('btn')
    expect(matchPosition('Big Blind')).toBe('bb')
    expect(matchPosition('All')).toBe('overall')
    expect(matchPosition('random text')).toBeNull()
  })

  it('overrides ranges per position from MTT targets', () => {
    const vpip = def('vpip')
    expect(getStatRange(vpip, 'btn')).toEqual([44, 48])
    expect(getStatTarget('vpip', 'btn')).toBe(46)
    expect(getStatRange(vpip, 'utg')).toEqual([13, 17])
    const cbetR = def('cbetR')
    expect(getStatRange(cbetR, 'btn')).toEqual([44, 48])
  })

  it('treats Raise First as position-specific with explicit ranges', () => {
    const { values } = parseStatsReport('Raise First: 22\n3Bet PF: 6')
    expect(values.raiseFirst).toBe(22)
    expect(values.threeBetPf).toBe(6)
    expect(getStatTarget('raiseFirst', 'btn')).toBeNull()
    expect(getStatRange(def('raiseFirst'), 'btn')).toEqual([47, 55])
    expect(getStatRange(def('raiseFirst'), 'utg')).toEqual([16, 20])
    expect(statAppliesTo('raiseFirst', 'bb')).toBe(false)
    expect(statAppliesTo('raiseFirst', 'btn')).toBe(true)
  })

  it('restricts blind-defense stats to positions with ranges', () => {
    expect(statAppliesTo('foldToSteal', 'btn')).toBe(false)
    expect(statAppliesTo('foldToSteal', 'sb')).toBe(true)
    expect(statAppliesTo('foldToSteal', 'bb')).toBe(true)
    expect(statAppliesTo('foldBbVsSb', 'bb')).toBe(true)
    expect(statAppliesTo('foldBbVsSb', 'sb')).toBe(false)
    expect(statAppliesTo('threeBetSteal', 'co')).toBe(false)
    expect(statAppliesTo('threeBetSteal', 'bb')).toBe(true)
    expect(statAppliesTo('limpRaise', 'sb')).toBe(true)
    expect(statAppliesTo('raiseSbOpenLimp', 'bb')).toBe(true)
  })
})

describe('parsePositionalReport', () => {
  const csv = `Position,Hands,All-In Adj BB/100,Raise First,3Bet PF,2Bet PF & Fold,Fold to Steal,CBet F IP (HU),Fold to F Cbet (HU),VPIP
UTG,1204,2.1,15.1,4.2,55,0,78,45,18.2
CO,1215,3.4,23.1,6.8,49,0,71,48,26.8
BTN,1240,5.2,36.5,9.4,47,0,68,50,44.1
BB,1230,-0.5,0,7.6,53,62,58,60,38.5`

  it('parses a PT4-style CSV export by position', () => {
    const { positions, matched, isTable } = parsePositionalReport(csv)
    expect(isTable).toBe(true)
    expect(matched).toBe(32)
    expect(positions.utg?.vpip).toBe(18.2)
    expect(positions.btn?.raiseFirst).toBe(36.5)
    expect(positions.bb?.threeBetPf).toBe(7.6)
    expect(positions.utg && 'hands' in positions.utg).toBe(false)
  })

  it('ignores Count columns from PT4 exports', () => {
    const text = `Position,Hands,Raise First,Raise First Count,3Bet PF,3Bet PF Count
BTN,1000,35,120,8,40`
    const { positions, hands } = parsePositionalReport(text)
    expect(positions.btn?.raiseFirst).toBe(35)
    expect(positions.btn?.threeBetPf).toBe(8)
    expect(positions.btn && 'raiseFirstCount' in positions.btn).toBe(false)
    expect(hands.btn).toBe(1000)
  })

  it('parses tab-separated exports', () => {
    const tsv = 'Position\tVPIP\tRaise First\nBTN\t44.1\t36.5\nSB\t34.0\t27.2'
    const { positions } = parsePositionalReport(tsv)
    expect(positions.btn?.vpip).toBe(44.1)
    expect(positions.sb?.raiseFirst).toBe(27.2)
  })

  it('averages rows that map to the same position group', () => {
    // MP2 and MP3 both land on the hijack; UTG and UTG+1 are their own seats.
    const text = 'Position,VPIP,Raise First\nMP2,16,12\nMP3,20,14\nUTG,15,11\nUTG+1,17,13\nBTN,44,36'
    const { positions } = parsePositionalReport(text)
    expect(positions.hj?.vpip).toBe(18)
    expect(positions.hj?.raiseFirst).toBe(13)
    expect(positions.utg?.vpip).toBe(15)
    expect(positions.utg1?.vpip).toBe(17)
    expect(positions.btn?.vpip).toBe(44)
  })

  it('handles quoted values and percent signs', () => {
    const text = 'Position,VPIP,Raise First\n"BTN","44.1%","36.5"'
    const { positions } = parsePositionalReport(text)
    expect(positions.btn?.vpip).toBe(44.1)
  })

  it('captures the All/Total row as overall', () => {
    const text = 'Position,VPIP,Raise First\nAll,25.1,19.4\nBTN,44.1,36.5'
    const { positions } = parsePositionalReport(text)
    expect(positions.overall?.vpip).toBe(25.1)
  })

  it('reports non-table text as not a table', () => {
    const { isTable, matched } = parsePositionalReport('VPIP: 24.5\nRaise First: 19.2')
    expect(isTable).toBe(false)
    expect(matched).toBe(0)
  })

  it('parses quoted PT4 CSV with thousands separators and dash blanks', () => {
    const pt4 = `"Position","Hands","All-In Adj BB/100","Raise First","Limp Open","Limp/Raise","Limp/Call","Limp/Fold","Raise SB Open Limp","Fold BB v SB","Fold to Steal","Call PF 2Bet","3Bet PF","3Bet Steal","3Bet NAI <35","2Bet PF & Fold","Raise & 4Bet+ PF ","3Bet PF & Fold","Fold to PF 4Bet After 3Bet <30 ","PF Squeeze","CBet F OOP (HU)","CBet F IP (HU)","Float F HU","Fold to F Cbet (HU)","Fold to F CBet (3B)","Fold to F Float HU","CBet F & Fold (HU)","Raise F CBet (HU)","XR Flop HU","Raise F CBet (3B)","Donk T (HU)","CBet T (HU)","Float T","Probe T (HU)","Probe T HU & Bet R","Fold to T CBet","F to T Pr (HU)","Raise T CBet","Raise T Probe (HU)","Donk R","CBet R","Fold to R CBet","Raise First Count","Limp Open Count","Limp/Raise Count","Limp/Call Count","Limp/Fold Count","Raise SB Open Limp Count","Fold BB v SB Count","Fold to Steal Count","Call PF 2Bet Count","3Bet PF Count","3Bet NAI <35 Count","3Bet Steal Count","Raise & 4Bet+ PF Count","2Bet PF & Fold Count","3Bet PF & Fold Count","Fold to PF 4Bet After 3Bet <30 Count","PF Squeeze Count","CBet F OOP (HU) Count","CBet F IP (HU) Count","Float F HU Count","Fold to F Cbet (HU) Count","Fold to F CBet (3B) Count","Fold to F Float HU Count","CBet F & Fold (HU) Count","Raise F CBet (HU) Count","XR Flop HU Count","Raise F CBet (3B) Count","Donk T (HU) Count","CBet T (HU) Count","Float T Count","Probe T (HU) Count","Probe T HU & Bet R Count","Fold to T CBet Count","F to T Pr (HU) Count","Raise T CBet Count","Raise T Probe (HU) Count","Donk R Count","CBet R Count","Fold to R CBet Count","VPIP"
"SB","34,820","-16.91","28.43","22.19","3.58","46.30","50.12","-","-","78.77","10.27","8.48","12.12","4.66","36.08","39.62","27.61","23.08","6.27","59.33","-","-","45.23","42.22","31.91","44.44","13.69","12.47","11.11","3.57","41.36","-","40.74","60.00","42.18","-","11.37","-","8.42","60.61","41.86","5156","5156.00","419.00","419.00","419.00","0.00","0.00","7395.00","23795.00","23159.00","12895.00","7102.00","53.00","97.00","134.00","39.00","5838.00","536.00","0.00","0.00","577.00","45.00","47.00","36.00","577.00","834.00","45.00","364.00","162.00","0.00","216.00","45.00","211.00","0.00","211.00","0.00","285.00","33.00","43.00","21.59"
"BTN","34,963","17.83","33.07","0.21","7.69","28.21","64.10","-","-","-","10.26","8.21","-","6.03","48.67","16.05","39.02","32.89","6.46","-","68.41","53.99","42.52","39.25","-","33.33","9.76","-","10.22","-","53.37","52.63","-","-","43.78","58.96","7.83","6.36","-","57.69","50.00","9145","9145.00","39.00","39.00","39.00","0.00","0.00","0.00","21447.00","21047.00","11772.00","0.00","405.00","676.00","205.00","76.00","3869.00","0.00","1358.00","263.00","461.00","186.00","0.00","141.00","461.00","0.00","186.00","0.00","371.00","171.00","0.00","0.00","217.00","173.00","217.00","173.00","0.00","78.00","56.00","21.25"`

    const { positions, matched, isTable } = parsePositionalReport(pt4)
    expect(isTable).toBe(true)
    expect(matched).toBeGreaterThan(60)
    expect(positions.sb?.vpip).toBe(21.59)
    expect(positions.sb?.raiseFirst).toBe(28.43)
    expect(positions.sb?.allInAdjBb100).toBe(-16.91)
    expect(positions.sb?.foldToSteal).toBe(78.77)
    expect(positions.sb?.cbetFOopHu).toBe(59.33)
    expect(positions.sb?.raiseSbOpenLimp).toBeUndefined()
    expect(positions.btn?.vpip).toBe(21.25)
    expect(positions.btn?.cbetFIpHu).toBe(68.41)
    expect(positions.btn?.floatFHu).toBe(53.99)
  })

  it('parses a full PT4 positional export with every position it carries', () => {
    const { positions, hands, matched, isTable, weightedOverallWinrate } = parsePositionalReport(PT4_SAMPLE_EXPORT)
    expect(isTable).toBe(true)
    expect(matched).toBe(211)
    expect(Object.keys(positions)).toHaveLength(7)
    expect(weightedOverallWinrate).toBe(true)
    expect(positions.utg?.vpip).toBe(15.91)
    expect(positions.utg?.raiseFirst).toBe(16.16)
    expect(positions.hj?.threeBetPf).toBe(5.84)
    expect(positions.co?.cbetFIpHu).toBe(68.26)
    expect(positions.bb?.foldBbVsSb).toBe(54.9)
    expect(positions.bb?.foldToSteal).toBe(48.48)
    expect(positions.sb?.limpOpen).toBe(22.19)
    expect(hands.sb).toBe(34820)
    expect(hands.overall).toBe(257691)
    expect(positions.overall?.allInAdjBb100).toBe(2.59)
    expect(relevanceFromHands(hands.overall!)).toBe('high')
  })
})
