import { describe, expect, it } from 'vitest'
import {
  ALARM_BURST_MS,
  ALARM_BURSTS,
  alarmDurationMs,
  alarmTestReport,
  burstOffsets,
  canPlayAlarm,
  startAlarm,
} from './alarmSound'

describe('how the alarm rings', () => {
  it('is two bursts, which is one more than you can mistake for something else', () => {
    expect(ALARM_BURSTS).toBe(2)
    expect(burstOffsets()).toHaveLength(2)
  })

  it('starts the first burst at once and spaces the rest evenly', () => {
    const offsets = burstOffsets(5, 1000)
    expect(offsets).toEqual([0, 1, 2, 3, 4])
  })

  it('counts in seconds, because that is what the audio clock wants', () => {
    expect(burstOffsets(2, 1200)).toEqual([0, 1.2])
  })

  it('is over in a few seconds, not half a minute', () => {
    // The banner is what persists. The sound only has to turn your head.
    expect(alarmDurationMs()).toBeLessThan(3000)
    expect(alarmDurationMs()).toBeGreaterThan(ALARM_BURST_MS)
  })

  it('counts the last note in the length, so nothing is cut off', () => {
    expect(alarmDurationMs(1, 1200)).toBeGreaterThan(0)
    expect(alarmDurationMs(3, 1000)).toBeGreaterThan(2000)
  })

  it('rings once if asked for one', () => {
    expect(burstOffsets(1)).toEqual([0])
  })

  it('refuses a count that is not one rather than looping forever', () => {
    expect(burstOffsets(0)).toEqual([])
    expect(burstOffsets(-3)).toEqual([])
    expect(burstOffsets(Number.NaN)).toEqual([])
    expect(alarmDurationMs(0)).toBe(0)
  })

  it('falls back to the usual spacing when given a nonsense gap', () => {
    expect(burstOffsets(2, 0)).toEqual([0, ALARM_BURST_MS / 1000])
    expect(burstOffsets(2, Number.NaN)).toEqual([0, ALARM_BURST_MS / 1000])
  })

  it('ignores a fractional count rather than scheduling half a burst', () => {
    expect(burstOffsets(2.7, 1000)).toEqual([0, 1])
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

describe('what a test alarm reports back', () => {
  const report = (over: Partial<Parameters<typeof alarmTestReport>[0]> = {}) =>
    alarmTestReport({ audible: true, notified: false, permission: 'granted', ...over })

  it('says both halves worked when both did', () => {
    expect(report({ notified: true })).toMatch(/sounded twice and sent a notification/)
  })

  it('names the mute when the sound is the half that failed', () => {
    expect(report({ audible: false, notified: true })).toMatch(/would not make a sound/)
  })

  it('tells you an alarm cannot reach you while permission is unasked', () => {
    // The whole point of the button: finding this out tonight rather than
    // the night it mattered.
    expect(report({ permission: 'default' })).toMatch(/have not been allowed yet/)
  })

  it('distinguishes blocked from merely unasked', () => {
    expect(report({ permission: 'denied' })).toMatch(/blocked for this site/)
    expect(report({ permission: 'denied' })).not.toMatch(/have not been allowed yet/)
  })

  it('does not blame permission on a browser that has no notifications', () => {
    expect(report({ permission: 'unsupported' })).toMatch(/no notifications/)
  })

  it('admits it when permission was granted and the notification still failed', () => {
    expect(report({ permission: 'granted' })).toMatch(/did not go out/)
  })

  it('says the banner is all there is when nothing else worked', () => {
    expect(report({ audible: false, permission: 'denied' })).toMatch(/banner above is all/)
  })

  it('always gives the page a sentence to show', () => {
    for (const audible of [true, false]) {
      for (const notified of [true, false]) {
        for (const permission of ['granted', 'denied', 'default', 'unsupported'] as const) {
          expect(alarmTestReport({ audible, notified, permission }).length).toBeGreaterThan(20)
        }
      }
    }
  })
})

describe('whether this browser can make a noise', () => {
  it('says no where there is no audio, rather than guessing', () => {
    expect(canPlayAlarm()).toBe(false)
  })
})
