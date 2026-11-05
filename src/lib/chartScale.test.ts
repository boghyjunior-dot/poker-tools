import { describe, expect, it } from 'vitest'
import { niceBounds, niceStep } from './chartScale'

describe('axis steps', () => {
  it('rounds to something a person reads off an axis', () => {
    expect(niceStep(100, 5)).toBe(50)
    expect(niceStep(97, 5)).toBe(20)
    expect(niceStep(1, 5)).toBe(0.5)
  })

  it('refuses a nonsense span rather than returning NaN', () => {
    expect(niceStep(0, 5)).toBe(1)
    expect(niceStep(-10, 5)).toBe(1)
    expect(niceStep(Number.NaN, 5)).toBe(1)
    expect(niceStep(100, 0)).toBeGreaterThan(0)
  })
})

describe('axis bounds', () => {
  it('keeps zero on the axis, so losses read as losses', () => {
    const bounds = niceBounds(-500, -120)
    expect(bounds.max).toBe(0)
    expect(bounds.min).toBeLessThanOrEqual(-500)
    expect(bounds.ticks).toContain(0)
  })

  it('snaps outwards, never cutting a point off', () => {
    const bounds = niceBounds(-37, 412)
    expect(bounds.min).toBeLessThanOrEqual(-37)
    expect(bounds.max).toBeGreaterThanOrEqual(412)
  })

  it('still has an axis when every value is zero', () => {
    const bounds = niceBounds(0, 0)
    expect(bounds.max).toBeGreaterThan(bounds.min)
    expect(bounds.ticks.length).toBeGreaterThan(1)
  })

  it('runs its ticks from one end to the other', () => {
    const bounds = niceBounds(0, 100)
    expect(bounds.ticks[0]).toBe(bounds.min)
    expect(bounds.ticks[bounds.ticks.length - 1]).toBe(bounds.max)
  })

  it('does not label a tick 0.30000000000000004', () => {
    for (const tick of niceBounds(0, 1).ticks) {
      expect(String(tick).length).toBeLessThan(6)
    }
  })

  it('survives values it cannot use', () => {
    const bounds = niceBounds(Number.NaN, Number.POSITIVE_INFINITY)
    expect(Number.isFinite(bounds.min)).toBe(true)
    expect(Number.isFinite(bounds.max)).toBe(true)
  })
})
