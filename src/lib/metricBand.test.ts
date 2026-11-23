import { describe, expect, it } from 'vitest'
import { BAND_TEXT, band } from './metricBand'

const column = [10, 20, 30, 40, 50, 60, 70, 80, 90]

describe('which band a number falls in', () => {
  it('puts the top of the column ahead', () => {
    expect(band(90, column)).toBe('ahead')
    expect(band(80, column)).toBe('ahead')
  })

  it('puts the bottom behind', () => {
    expect(band(10, column)).toBe('behind')
    expect(band(20, column)).toBe('behind')
  })

  it('leaves the middle in the middle', () => {
    expect(band(50, column)).toBe('middle')
  })

  it('turns round for a figure where lower is better', () => {
    // A finishing place: 10th is a better night than 90th.
    expect(band(10, column, false)).toBe('ahead')
    expect(band(90, column, false)).toBe('behind')
  })

  it('calls nobody ahead when every row is the same', () => {
    // Colouring one of them green would be inventing a difference.
    const flat = [7, 7, 7, 7]
    expect(flat.map((v) => band(v, flat))).toEqual(['middle', 'middle', 'middle', 'middle'])
  })

  it('has no opinion about a column of one', () => {
    expect(band(5, [5])).toBe('middle')
    expect(band(5, [])).toBe('middle')
  })

  it('splits ties down the middle rather than breaking them', () => {
    const tied = [1, 5, 5, 9]
    expect(band(5, tied)).toBe('middle')
    expect(band(9, tied)).toBe('ahead')
    expect(band(1, tied)).toBe('behind')
  })

  it('covers two rows without calling them both middling', () => {
    expect(band(2, [1, 2])).toBe('ahead')
    expect(band(1, [1, 2])).toBe('behind')
  })

  it('handles negatives, which a profit column has', () => {
    const swings = [-500, -100, 0, 100, 500]
    expect(band(-500, swings)).toBe('behind')
    expect(band(500, swings)).toBe('ahead')
  })

  it('has a colour for every band', () => {
    for (const key of ['behind', 'middle', 'ahead'] as const) {
      expect(BAND_TEXT[key]).toMatch(/^text-/)
    }
  })
})
