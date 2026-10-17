import { describe, expect, it } from 'vitest'
import { ALARM_BURST_MS, ALARM_RING_MS, burstOffsets, startAlarm } from './alarmSound'

describe('how long the alarm rings for', () => {
  it('is long enough to be noticed across a table change', () => {
    // The point of the change: the old alarm was one burst of 0.6s.
    expect(ALARM_RING_MS).toBeGreaterThanOrEqual(20_000)
    expect(burstOffsets(ALARM_RING_MS).length).toBeGreaterThan(20)
  })

  it('spaces the bursts evenly, starting immediately', () => {
    const offsets = burstOffsets(6000, 1000)
    expect(offsets[0]).toBe(0)
    for (let i = 1; i < offsets.length; i += 1) {
      expect(offsets[i] - offsets[i - 1]).toBeCloseTo(1, 10)
    }
  })

  it('counts in seconds, because that is what the audio clock wants', () => {
    expect(burstOffsets(5000, 1000)).toEqual([0, 1, 2, 3, 4])
  })

  it('never starts a burst it cannot finish', () => {
    // The last one has to fit inside the ring, or the alarm ends mid-note.
    const duration = 5000
    const last = burstOffsets(duration, 1200).at(-1)!
    expect(last * 1000 + ALARM_BURST_MS).toBeLessThanOrEqual(duration + ALARM_BURST_MS)
    expect(last * 1000).toBeLessThan(duration)
  })

  it('still makes one sound when asked for almost no time at all', () => {
    // Better a single burst than an alarm that silently does nothing.
    expect(burstOffsets(1)).toEqual([0])
    expect(burstOffsets(100, 1200)).toEqual([0])
  })

  it('refuses a duration that is not one rather than looping forever', () => {
    expect(burstOffsets(0)).toEqual([])
    expect(burstOffsets(-5000)).toEqual([])
    expect(burstOffsets(Number.NaN)).toEqual([])
    expect(burstOffsets(5000, 0)).toEqual([0])
  })
})

describe('starting the alarm where there is no audio', () => {
  it('hands back a stop function instead of throwing', () => {
    // Node has no AudioContext, which is the same shape as a browser that
    // will not give one out: the banner and notification still do their job.
    const stop = startAlarm()
    expect(typeof stop).toBe('function')
    expect(() => {
      stop()
      stop()
    }).not.toThrow()
  })
})
