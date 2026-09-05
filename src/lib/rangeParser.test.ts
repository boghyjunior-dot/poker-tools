import { describe, expect, it } from 'vitest'
import { formatRange, parseRangeString } from './rangeParser'

const parse = (input: string) => parseRangeString(input)
const sorted = (input: string) => [...parseRangeString(input).labels].sort()

describe('parseRangeString — the example from the brief', () => {
  it('reads "22+, Ax+, K6s+, 76s" with no errors', () => {
    const { labels, errors } = parse('22+, Ax+, K6s+, 76s')
    expect(errors).toEqual([])

    // 13 pairs + every ace-high hand (24 non-pair) + K6s..KQs + 76s
    expect(labels.has('22')).toBe(true)
    expect(labels.has('AA')).toBe(true)
    expect(labels.has('A2o')).toBe(true)
    expect(labels.has('AKs')).toBe(true)
    expect(labels.has('K6s')).toBe(true)
    expect(labels.has('KQs')).toBe(true)
    expect(labels.has('76s')).toBe(true)

    // K5s is below the K6s+ floor, and K6o was never asked for.
    expect(labels.has('K5s')).toBe(false)
    expect(labels.has('K6o')).toBe(false)
    expect(labels.has('76o')).toBe(false)

    expect(labels.size).toBe(13 + 24 + 7 + 1)
  })
})

describe('pairs', () => {
  it('expands a pair-plus up to aces', () => {
    expect(sorted('TT+')).toEqual(['AA', 'JJ', 'KK', 'QQ', 'TT'])
  })

  it('reads a single pair', () => {
    expect(sorted('77')).toEqual(['77'])
  })

  it('reads a pair run in either direction', () => {
    expect(sorted('77-TT')).toEqual(['77', '88', '99', 'TT'])
    expect(sorted('TT-77')).toEqual(sorted('77-TT'))
  })

  it('expands 22+ to all thirteen pairs', () => {
    expect(parse('22+').labels.size).toBe(13)
  })
})

describe('suited and offsuit', () => {
  it('fixes the high card and climbs the kicker for a plus', () => {
    expect(sorted('K6s+')).toEqual(['K6s', 'K7s', 'K8s', 'K9s', 'KJs', 'KQs', 'KTs'])
  })

  it('reads one exact hand', () => {
    expect(sorted('76s')).toEqual(['76s'])
    expect(sorted('KQo')).toEqual(['KQo'])
  })

  it('reads a kicker run under one high card', () => {
    expect(sorted('A5s-A2s')).toEqual(['A2s', 'A3s', 'A4s', 'A5s'])
    expect(sorted('A2s-A5s')).toEqual(sorted('A5s-A2s'))
  })

  it('refuses a run that crosses high cards', () => {
    expect(parse('A5s-K2s').errors).toHaveLength(1)
  })

  it('refuses a run that mixes suitedness', () => {
    expect(parse('A5s-A2o').errors).toHaveLength(1)
  })
})

describe('no suffix means both', () => {
  it('expands an exact hand to suited and offsuit', () => {
    expect(sorted('AK')).toEqual(['AKo', 'AKs'])
  })

  it('expands a plus to both halves', () => {
    expect(sorted('AJ+')).toEqual(['AJo', 'AJs', 'AKo', 'AKs', 'AQo', 'AQs'])
  })

  it('treats a doubled rank as a pair', () => {
    expect(sorted('99')).toEqual(['99'])
    expect(sorted('99+')).toEqual(['99', 'AA', 'JJ', 'KK', 'QQ', 'TT'])
  })
})

describe('wildcards', () => {
  it('takes every hand whose top card is the named rank, pair included', () => {
    const labels = parse('Ax').labels
    expect(labels.size).toBe(25) // AA + 12 suited + 12 offsuit
    expect(labels.has('AA')).toBe(true)
    expect(labels.has('A2s')).toBe(true)
    expect(labels.has('A2o')).toBe(true)
  })

  it('does not sweep in hands where the rank is the kicker', () => {
    // AK is an ace-high hand, so it is not part of Kx.
    const labels = parse('Kx').labels
    expect(labels.has('AKs')).toBe(false)
    expect(labels.has('AKo')).toBe(false)
    expect(labels.has('KK')).toBe(true)
    expect(labels.has('KQs')).toBe(true)
    expect(labels.size).toBe(23) // KK + 11 suited + 11 offsuit
  })

  it('splits into suited and offsuit halves', () => {
    expect(parse('Axs').labels.size).toBe(12)
    expect(parse('Axo').labels.size).toBe(12)
    expect(parse('Axs').labels.has('AA')).toBe(false)
  })

  it('tolerates a pointless trailing plus', () => {
    expect(sorted('Ax+')).toEqual(sorted('Ax'))
    expect(sorted('Axs+')).toEqual(sorted('Axs'))
  })

  it('leaves the lowest rank with only its pair', () => {
    expect(sorted('2x')).toEqual(['22'])
  })
})

describe('input handling', () => {
  it('accepts commas, spaces, semicolons and newlines', () => {
    const a = parse('22+, AKs, 76s')
    const b = parse('22+ AKs 76s')
    const c = parse('22+;AKs\n76s')
    expect([...a.labels].sort()).toEqual([...b.labels].sort())
    expect([...b.labels].sort()).toEqual([...c.labels].sort())
  })

  it('is case insensitive', () => {
    expect(sorted('ax+, k6S+, 76s')).toEqual(sorted('AX+, K6s+, 76S'))
  })

  it('deduplicates overlapping tokens', () => {
    expect(parse('AKs, AKs, AK').labels.size).toBe(2)
  })

  it('returns an empty range for empty input', () => {
    expect(parse('   ').labels.size).toBe(0)
    expect(parse('   ').errors).toEqual([])
  })

  it('reports unreadable tokens but keeps the rest', () => {
    const { labels, errors } = parse('22+, banana, AKs')
    expect(labels.has('AA')).toBe(true)
    expect(labels.has('AKs')).toBe(true)
    expect(errors).toEqual(['Could not read "banana"'])
  })

  it('rejects an impossible rank', () => {
    expect(parse('1x').errors).toHaveLength(1)
  })
})

describe('formatRange', () => {
  const roundTrip = (input: string) => formatRange(parseRangeString(input).labels)

  it('collapses a full pair sweep to a plus', () => {
    expect(roundTrip('22+')).toBe('22+')
    expect(roundTrip('TT+')).toBe('TT+')
  })

  it('writes a partial pair run as a dash range', () => {
    expect(roundTrip('77-TT')).toBe('TT-77')
  })

  it('collapses kickers that reach the high card', () => {
    expect(roundTrip('K6s+')).toBe('K6s+')
  })

  it('writes a partial kicker run as a dash range', () => {
    expect(roundTrip('A5s-A2s')).toBe('A5s-A2s')
  })

  it('writes single hands plainly', () => {
    expect(roundTrip('76s')).toBe('76s')
  })

  it('orders pairs, then suited, then offsuit', () => {
    expect(roundTrip('KQo, 76s, 99')).toBe('99, 76s, KQo')
  })

  it('survives a round trip through the parser', () => {
    const original = parseRangeString('22+, Ax+, K6s+, 76s').labels
    const reparsed = parseRangeString(formatRange(original)).labels
    expect([...reparsed].sort()).toEqual([...original].sort())
  })

  it('returns an empty string for an empty range', () => {
    expect(formatRange(new Set())).toBe('')
  })
})
