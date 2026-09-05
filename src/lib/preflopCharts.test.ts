import { describe, expect, it } from 'vitest'
import starter from '../content/preflopCharts.json'
import {
  COLOR_CLASSES,
  FORMATS,
  LAYER_COLORS,
  suggestColor,
  FOLD_ANSWER,
  POSITIONS,
  TOTAL_COMBOS,
  acceptedAnswers,
  actionFor,
  answerOptions,
  comboCount,
  distinctStacks,
  nextQuestion,
  parseChartFile,
  randomHand,
  resolveChart,
  serializeCharts,
  sortCharts,
  type PreflopChart,
} from './preflopCharts'

const chart = (layers: { label: string; tokens: string }[]): PreflopChart => ({
  id: 'test',
  position: 'BTN',
  format: 'cEV',
  stackBb: 40,
  action: 'RFI',
  layers: layers.map((layer, index) => ({
    id: `layer-${index}`,
    label: layer.label,
    color: 'red',
    tokens: layer.tokens,
  })),
})

/** Deterministic stand-in for Math.random that walks a fixed list. */
const seq = (values: number[]) => {
  let i = 0
  return () => values[i++ % values.length]
}

describe('resolveChart', () => {
  it('counts combos and the share of all hands', () => {
    const resolved = resolveChart(chart([{ label: 'Open', tokens: '22+' }]))
    expect(resolved.combos).toBe(78)
    expect(resolved.pct).toBeCloseTo((78 / TOTAL_COMBOS) * 100, 6)
  })

  it('gives an overlapping hand to the first layer that claims it', () => {
    const resolved = resolveChart(
      chart([
        { label: '3-bet', tokens: 'AA, KK' },
        { label: 'Call', tokens: 'AA, QQ' },
      ]),
    )
    expect(resolved.owner.get('AA')!.label).toBe('3-bet')
    expect(resolved.owner.get('QQ')!.label).toBe('Call')
    expect(resolved.layers[0].combos).toBe(12)
    expect(resolved.layers[1].combos).toBe(6)
    // AA is counted once, not twice.
    expect(resolved.combos).toBe(18)
  })

  it('surfaces parse errors tagged with their layer', () => {
    const resolved = resolveChart(chart([{ label: 'Open', tokens: '22+, banana' }]))
    expect(resolved.errors).toEqual(['Open: Could not read "banana"'])
    expect(resolved.combos).toBe(78)
  })
})

describe('actionFor', () => {
  const spot = chart([
    { label: '3-bet', tokens: 'QQ+, AKs' },
    { label: 'Call', tokens: '22+, AJs+' },
  ])

  it('names the layer holding the hand', () => {
    expect(actionFor(spot, 'AA')).toBe('3-bet')
    expect(actionFor(spot, 'AKs')).toBe('3-bet')
    expect(actionFor(spot, 'JJ')).toBe('Call')
    expect(actionFor(spot, 'AJs')).toBe('Call')
  })

  it('falls back to a fold when no layer wants it', () => {
    expect(actionFor(spot, '72o')).toBe(FOLD_ANSWER)
  })
})

describe('answerOptions', () => {
  it('lists each layer once and always offers a fold', () => {
    const options = answerOptions(chart([{ label: 'Raise', tokens: 'AA' }, { label: 'Call', tokens: 'KK' }]))
    expect(options).toEqual(['Raise', 'Call', FOLD_ANSWER])
  })

  it('drops blank and duplicate layer names', () => {
    const options = answerOptions(
      chart([
        { label: 'Raise', tokens: 'AA' },
        { label: 'Raise', tokens: 'KK' },
        { label: '   ', tokens: 'QQ' },
      ]),
    )
    expect(options).toEqual(['Raise', FOLD_ANSWER])
  })
})

describe('randomHand', () => {
  it('deals a suited hand with two matching suits', () => {
    // Walk the deck until a suited cell comes up, then check the suits agree.
    for (let i = 0; i < 200; i++) {
      const hand = randomHand(seq([i / 200, 0.1, 0.9]))
      if (!hand.label.endsWith('s')) continue
      expect(hand.cards[0].suit).toBe(hand.cards[1].suit)
      return
    }
    throw new Error('no suited hand dealt')
  })

  it('never deals two identical cards for a pair or offsuit hand', () => {
    for (let i = 0; i < 500; i++) {
      const hand = randomHand()
      if (hand.label.endsWith('s')) continue
      const [a, b] = hand.cards
      expect(`${a.rank}${a.suit}`).not.toBe(`${b.rank}${b.suit}`)
    }
  })

  it('always produces a label the matrix knows', () => {
    for (let i = 0; i < 300; i++) {
      expect(comboCount([randomHand().label])).toBeGreaterThan(0)
    }
  })

  it('deals offsuit hands far more often than suited ones', () => {
    let suited = 0
    let offsuit = 0
    for (let i = 0; i < 4000; i++) {
      const label = randomHand().label
      if (label.endsWith('s')) suited++
      else if (label.endsWith('o')) offsuit++
    }
    // 936 offsuit combos against 312 suited — about 3:1.
    expect(offsuit / suited).toBeGreaterThan(2.4)
    expect(offsuit / suited).toBeLessThan(3.6)
  })
})

describe('nextQuestion', () => {
  it('returns null with nothing selected', () => {
    expect(nextQuestion([])).toBeNull()
  })

  it('grades the dealt hand against the chart it picked', () => {
    const spot = chart([{ label: 'Open', tokens: '22+' }])
    for (let i = 0; i < 50; i++) {
      const question = nextQuestion([spot])!
      expect(question.chart.id).toBe('test')
      expect(question.expected).toBe(actionFor(spot, question.hand.label))
    }
  })

  it('never picks past the end of the list', () => {
    const spots = [chart([{ label: 'A', tokens: 'AA' }]), chart([{ label: 'B', tokens: 'KK' }])]
    spots[1].id = 'second'
    // A random() of exactly 1 would index out of bounds without clamping.
    const question = nextQuestion(spots, () => 0.999999)
    expect(question).not.toBeNull()
    expect(['test', 'second']).toContain(question!.chart.id)
  })
})

describe('parseChartFile', () => {
  it('reads the { charts: [...] } wrapper and a bare array', () => {
    const one = { position: 'BTN', stackBb: 40, action: 'RFI', layers: [{ label: 'Open', tokens: '22+' }] }
    expect(parseChartFile(JSON.stringify({ charts: [one] })).charts).toHaveLength(1)
    expect(parseChartFile(JSON.stringify([one])).charts).toHaveLength(1)
  })

  it('rejects a chart with an unknown position or no ranges', () => {
    const { charts, errors } = parseChartFile(
      JSON.stringify({
        charts: [
          { position: 'MARS', stackBb: 40, layers: [{ label: 'Open', tokens: '22+' }] },
          { position: 'BTN', stackBb: 40, layers: [] },
          { position: 'BTN', stackBb: 40, layers: [{ label: 'Open', tokens: '22+' }] },
        ],
      }),
    )
    expect(charts).toHaveLength(1)
    expect(errors).toHaveLength(2)
  })

  it('reports invalid JSON without throwing', () => {
    expect(parseChartFile('{ nope').errors[0]).toContain('Invalid JSON')
  })

  it('survives a round trip through serializeCharts', () => {
    const original = parseChartFile(JSON.stringify(starter)).charts
    const reparsed = parseChartFile(serializeCharts(original)).charts
    expect(reparsed.map((c) => c.id)).toEqual(original.map((c) => c.id))
  })
})

describe('library ordering', () => {
  const charts = parseChartFile(JSON.stringify(starter)).charts

  it('groups by model, then sorts by position and stack depth', () => {
    const seed = charts[0]
    const mixed: PreflopChart[] = [
      { ...seed, id: 'icm-utg', format: 'ICM', position: 'UTG', stackBb: 40 },
      { ...seed, id: 'cev-btn', format: 'cEV', position: 'BTN', stackBb: 40 },
      { ...seed, id: 'cev-utg-100', format: 'cEV', position: 'UTG', stackBb: 100 },
      { ...seed, id: 'cev-utg-25', format: 'cEV', position: 'UTG', stackBb: 25 },
    ]
    // cEV block first, then ICM; inside a block, position then stack depth.
    expect(sortCharts(mixed).map((chart) => chart.id)).toEqual([
      'cev-utg-25',
      'cev-utg-100',
      'cev-btn',
      'icm-utg',
    ])
  })

  it('sorts the bundled charts by position', () => {
    const sorted = sortCharts(charts)
    for (let i = 1; i < sorted.length; i++) {
      expect(POSITIONS.indexOf(sorted[i - 1].position)).toBeLessThanOrEqual(
        POSITIONS.indexOf(sorted[i].position),
      )
    }
  })

  it('lists the distinct stack depths in play', () => {
    expect(distinctStacks(charts)).toEqual([100])
  })
})

describe('bundled starter charts', () => {
  const charts = parseChartFile(JSON.stringify(starter)).charts

  it('all load with no errors', () => {
    expect(parseChartFile(JSON.stringify(starter)).errors).toEqual([])
    expect(charts.length).toBeGreaterThanOrEqual(8)
  })

  it('have no unreadable range tokens', () => {
    for (const spot of charts) {
      expect(resolveChart(spot).errors).toEqual([])
    }
  })

  it('open wider from later positions', () => {
    const width = (position: string) =>
      resolveChart(charts.find((c) => c.position === position && c.action === 'RFI')!).pct

    const seats = ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN']
    for (let i = 1; i < seats.length; i++) {
      expect(width(seats[i - 1]), seats[i]).toBeLessThan(width(seats[i]))
    }
  })

  it('keep every range inside the deck', () => {
    for (const spot of charts) {
      const resolved = resolveChart(spot)
      expect(resolved.combos).toBeGreaterThan(0)
      expect(resolved.combos).toBeLessThanOrEqual(TOTAL_COMBOS)
      expect(resolved.pct).toBeLessThanOrEqual(100)
    }
  })

  it('give every BB defend chart a 3-bet range tighter than its calling range', () => {
    const defends = charts.filter((c) => c.position === 'BB' && c.layers.length > 1)
    expect(defends.length).toBeGreaterThan(0)
    for (const bb of defends) {
      const resolved = resolveChart(bb)
      expect(resolved.layers[0].layer.label).toBe('3-bet')
      expect(resolved.layers[0].combos).toBeLessThan(resolved.layers[1].combos)
    }
  })
})

describe('layer colours', () => {
  it('offers red, dark red and green as the first three choices', () => {
    expect(LAYER_COLORS.slice(0, 3)).toEqual(['red', 'darkRed', 'green'])
  })

  it('names the three conventional colours by their action', () => {
    expect(COLOR_CLASSES.red.name).toBe('Raise / 3-bet')
    expect(COLOR_CLASSES.darkRed.name).toBe('All in')
    expect(COLOR_CLASSES.green.name).toBe('Call')
  })

  it('paints red brighter than dark red', () => {
    expect(COLOR_CLASSES.red.cell).toContain('bg-red-600')
    expect(COLOR_CLASSES.darkRed.cell).toContain('bg-red-900')
    expect(COLOR_CLASSES.green.cell).toContain('bg-green-600')
  })

  it('suggests red for a raise or a 3-bet', () => {
    for (const label of ['Open', 'Raise', 'RFI', '3-bet', '4bet', 'Iso raise', 'Steal']) {
      expect(suggestColor(label)).toBe('red')
    }
  })

  it('suggests dark red for putting it in', () => {
    for (const label of ['Shove', 'All in', 'All-in', 'Jam', 'Push', 'Open shove']) {
      expect(suggestColor(label)).toBe('darkRed')
    }
  })

  it('suggests green for a call', () => {
    for (const label of ['Call', 'Flat', 'Defend', 'Limp', 'Complete']) {
      expect(suggestColor(label)).toBe('green')
    }
  })

  it('prefers dark red when a label says both raise and all in', () => {
    expect(suggestColor('3-bet shove')).toBe('darkRed')
    expect(suggestColor('Raise all in')).toBe('darkRed')
  })

  it('is case insensitive and ignores surrounding space', () => {
    expect(suggestColor('  CALL  ')).toBe('green')
    expect(suggestColor('sHoVe')).toBe('darkRed')
  })

  it('has no opinion on a label it does not recognise', () => {
    expect(suggestColor('Mixed')).toBeNull()
    expect(suggestColor('')).toBeNull()
  })
})

describe('legacy colour names', () => {
  const withColor = (color: string) =>
    parseChartFile(
      JSON.stringify({
        charts: [
          { position: 'BTN', stackBb: 40, layers: [{ label: 'Whatever', color, tokens: '22+' }] },
        ],
      }),
    ).charts[0].layers[0].color

  it('maps charts saved under the old palette onto the new one', () => {
    expect(withColor('emerald')).toBe('green')
    expect(withColor('rose')).toBe('red')
    expect(withColor('cyan')).toBe('sky')
  })

  it('keeps colours that are still valid', () => {
    expect(withColor('red')).toBe('red')
    expect(withColor('darkRed')).toBe('darkRed')
    expect(withColor('violet')).toBe('violet')
  })

  it('falls back to the label when the colour is unknown', () => {
    const charts = parseChartFile(
      JSON.stringify({
        charts: [
          { position: 'BTN', stackBb: 40, layers: [{ label: 'Call', color: 'chartreuse', tokens: '22+' }] },
        ],
      }),
    ).charts
    expect(charts[0].layers[0].color).toBe('green')
  })
})

describe('starter charts follow the colour convention', () => {
  const charts = parseChartFile(JSON.stringify(starter)).charts

  it('paints every raise red, every shove dark red and every call green', () => {
    for (const chartItem of charts) {
      for (const layer of chartItem.layers) {
        const expected = suggestColor(layer.label)
        if (expected) expect(layer.color).toBe(expected)
      }
    }
  })

  it('uses only colours from the convention', () => {
    const used = new Set(charts.flatMap((c) => c.layers.map((l) => l.color)))
    for (const color of used) expect(['red', 'darkRed', 'green']).toContain(color)
  })
})

describe('cEV and ICM coverage', () => {
  const charts = parseChartFile(JSON.stringify(starter)).charts
  const SEATS = ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB'] as const
  const find = (format: string, position: string, stack: number) =>
    charts.find((c) => c.format === format && c.position === position && c.stackBb === stack)

  // Only cEV at 100bb ships for now; the other depths and the ICM set are
  // waiting on ranges, so the bundle is deliberately just these eight.
  it('still supports both models, even though only cEV ships today', () => {
    // ICM charts were pulled pending ranges; the model side must stay ready.
    expect(FORMATS).toEqual(['cEV', 'ICM'])
  })

  it('ships every position once, at cEV 100bb only', () => {
    for (const seat of [...SEATS, 'BB']) {
      expect(find('cEV', seat, 100), seat).toBeDefined()
    }
    expect(charts).toHaveLength(8)
    expect(new Set(charts.map((c) => c.format))).toEqual(new Set(['cEV']))
    expect(new Set(charts.map((c) => c.stackBb))).toEqual(new Set([100]))
  })

  it('plays the deep small blind as a limp strategy rather than raise-or-fold', () => {
    const sb = find('cEV', 'SB', 100)!
    const resolved = resolveChart(sb)

    expect(sb.layers.map((l) => l.label)).toEqual(['Raise', 'Raise (mix)', 'Limp'])
    // Raising is the small slice; limping is the bulk of it.
    expect(resolved.layers[0].combos).toBeLessThan(resolved.layers[2].combos)
    // Only the listed offsuit junk folds, so almost every hand plays.
    expect(resolved.pct).toBeGreaterThan(88)
  })

  it('folds exactly the listed junk hands from the deep small blind', () => {
    const resolved = resolveChart(find('cEV', 'SB', 100)!)
    const folded = ['93o', '92o', '83o', '82o', '73o', '72o', '63o', '62o', '52o', '42o', '32o']
    for (const hand of folded) expect(resolved.owner.has(hand), hand).toBe(false)
    expect(TOTAL_COMBOS - resolved.combos).toBe(folded.length * 12)
  })

  it('raises suited broadways and big suited aces from the deep small blind', () => {
    const sb = find('cEV', 'SB', 100)!
    for (const hand of ['AKs', 'AQs', 'AJs', 'ATs']) {
      expect(actionFor(sb, hand), hand).toBe('Raise')
    }
    // Suited broadways and the wheel aces are half-frequency, so either the
    // raise or the limp is graded correct.
    for (const hand of ['KQs', 'KTs', 'QTs', 'JTs', 'A5s', 'A2s']) {
      expect(acceptedAnswers(sb, hand), hand).toEqual(['Raise (mix)', 'Limp'])
    }
    // Offsuit broadways and the rest come along as limps, not raises.
    expect(actionFor(sb, 'AKo')).toBe('Limp')
    expect(actionFor(sb, '22')).toBe('Limp')
  })

  it('paints every opening range red', () => {
    for (const seat of SEATS) {
      expect(find('cEV', seat, 100)!.layers[0].color, seat).toBe('red')
    }
  })

  it('gives the big blind a defence chart rather than an opening one', () => {
    const bb = find('cEV', 'BB', 100)!
    expect(bb.action).toContain('vs BTN')
    expect(bb.layers.some((layer) => layer.label === 'Call')).toBe(true)
  })

  it('parses every range in the library without error', () => {
    for (const chartItem of charts) {
      expect(resolveChart(chartItem).errors, chartItem.id).toEqual([])
    }
  })

  it('gives every chart a unique id', () => {
    const ids = charts.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('mixed frequencies', () => {
  const mixedChart = (): PreflopChart => ({
    id: 'mix',
    position: 'SB',
    format: 'cEV',
    stackBb: 100,
    action: 'Limp-heavy open',
    layers: [
      { id: 'l1', label: 'Raise', color: 'red', tokens: 'AA, KK' },
      { id: 'l2', label: 'Raise (mix)', color: 'amber', tokens: 'A5s, A4s', frequency: 50 },
      { id: 'l3', label: 'Limp', color: 'green', tokens: '22+, A2s+' },
    ],
  })

  it('accepts a single answer for a full-frequency hand', () => {
    expect(acceptedAnswers(mixedChart(), 'AA')).toEqual(['Raise'])
    expect(acceptedAnswers(mixedChart(), 'QQ')).toEqual(['Limp'])
  })

  it('accepts either the mix or what would claim the hand otherwise', () => {
    expect(acceptedAnswers(mixedChart(), 'A5s')).toEqual(['Raise (mix)', 'Limp'])
  })

  it('falls back to a fold when nothing else claims a mixed hand', () => {
    const chartItem = mixedChart()
    chartItem.layers = chartItem.layers.slice(0, 2)
    expect(acceptedAnswers(chartItem, 'A5s')).toEqual(['Raise (mix)', FOLD_ANSWER])
  })

  it('accepts only a fold for a hand no layer wants', () => {
    expect(acceptedAnswers(mixedChart(), '72o')).toEqual([FOLD_ANSWER])
  })

  it('hands the drill every accepted answer', () => {
    for (let i = 0; i < 40; i++) {
      const question = nextQuestion([mixedChart()])!
      expect(question.accepted).toEqual(acceptedAnswers(question.chart, question.hand.label))
      expect(question.accepted).toContain(question.expected)
    }
  })

  it('keeps the frequency through a save and reload', () => {
    const round = parseChartFile(serializeCharts([mixedChart()])).charts[0]
    expect(round.layers[1].frequency).toBe(50)
    expect(round.layers[0].frequency).toBeUndefined()
  })

  it('ignores a frequency of 0 or 100 or nonsense', () => {
    const withFreq = (frequency: unknown) =>
      parseChartFile(
        JSON.stringify({
          charts: [
            {
              position: 'BTN',
              stackBb: 40,
              layers: [{ label: 'Open', color: 'red', tokens: '22+', frequency }],
            },
          ],
        }),
      ).charts[0].layers[0].frequency

    expect(withFreq(100)).toBeUndefined()
    expect(withFreq(0)).toBeUndefined()
    expect(withFreq(-5)).toBeUndefined()
    expect(withFreq('half')).toBeUndefined()
    expect(withFreq(50)).toBe(50)
  })

  it('gives the bundled small blind a half-frequency bluff layer', () => {
    const charts = parseChartFile(JSON.stringify(starter)).charts
    const sb = charts.find((c) => c.format === 'cEV' && c.position === 'SB' && c.stackBb === 100)!
    const bluff = sb.layers.find((l) => l.label === 'Raise (mix)')!
    expect(bluff.frequency).toBe(50)
    // A wheel ace can be raised or limped; both are graded correct.
    expect(acceptedAnswers(sb, 'A5s')).toEqual(['Raise (mix)', 'Limp'])
  })
})
