import { describe, expect, it } from 'vitest'
import { parseFieldNumber } from './numberField'

describe('what a half-typed field is worth', () => {
  it('reads an emptied box as zero rather than refusing', () => {
    // The bug this exists to stop: the box may be empty, the pot may not.
    expect(parseFieldNumber('')).toBe(0)
    expect(parseFieldNumber('   ')).toBe(0)
  })

  it('reads a number the obvious way', () => {
    expect(parseFieldNumber('25000')).toBe(25_000)
    expect(parseFieldNumber('2.5')).toBe(2.5)
    expect(parseFieldNumber('-1200')).toBe(-1200)
  })

  it('survives the moment a decimal is half typed', () => {
    // "2." is what the field holds between the 2 and the 5 of "2.5".
    expect(parseFieldNumber('2.')).toBe(2)
    expect(parseFieldNumber('.5')).toBe(0.5)
  })

  it('falls back to zero on anything that is not a number', () => {
    expect(parseFieldNumber('abc')).toBe(0)
    expect(parseFieldNumber('1e')).toBe(0)
    expect(parseFieldNumber('Infinity')).toBe(0)
    expect(parseFieldNumber('NaN')).toBe(0)
  })
})
