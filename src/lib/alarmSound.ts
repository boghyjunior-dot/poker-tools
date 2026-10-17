/**
 * The sound an alarm makes.
 *
 * A single beep is easy to miss, which is the one thing an alarm must not be:
 * you are looking at another table when it fires, and half a second of sine
 * wave is gone before you turn your head. So it rings in bursts and keeps
 * going, long enough to be noticed and short enough that forgetting to
 * dismiss it does not leave a tone running in a tab you walked away from.
 */

/** One burst every this long, which reads as an alarm rather than a chime. */
export const ALARM_BURST_MS = 1200

/** How long it rings for if nobody stops it. */
export const ALARM_RING_MS = 30_000

/** The two notes of a burst, in hertz. Two tones carry further than one. */
const NOTES = [880, 1175] as const
const NOTE_MS = 180
const NOTE_GAP_MS = 220

/**
 * When each burst starts, in seconds from the beginning.
 *
 * Every burst is scheduled against the audio clock up front rather than fired
 * off a repeating timer: a timer in a background tab is throttled to once a
 * second or worse, which is exactly where an alarm needs to be reliable.
 */
export function burstOffsets(durationMs: number, burstMs: number = ALARM_BURST_MS): number[] {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return []
  if (!Number.isFinite(burstMs) || burstMs <= 0) return [0]
  const offsets: number[] = []
  // A burst must finish inside the ring, so the last one cannot start later
  // than its own length before the end.
  for (let at = 0; at + NOTE_GAP_MS + NOTE_MS <= durationMs; at += burstMs) {
    offsets.push(at / 1000)
  }
  return offsets.length > 0 ? offsets : [0]
}

type AudioCtor = typeof AudioContext

function audioContextCtor(): AudioCtor | null {
  if (typeof window === 'undefined') return null
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext ??
    null
  )
}

function scheduleNote(ctx: AudioContext, hz: number, at: number) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = hz
  // Ramped rather than switched on: a square edge on a sine clicks.
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(0.25, at + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + NOTE_MS / 1000)
  osc.connect(gain).connect(ctx.destination)
  osc.start(at)
  osc.stop(at + NOTE_MS / 1000 + 0.02)
}

/**
 * Start ringing. The returned function stops it, and is safe to call twice.
 *
 * Silence is never an error here: a browser with no audio, or one that has
 * not been given permission to make a noise yet, still shows the banner and
 * the notification. The alarm is quieter than intended, not broken.
 */
export function startAlarm(durationMs: number = ALARM_RING_MS): () => void {
  const Ctx = audioContextCtor()
  if (!Ctx) return () => {}

  let ctx: AudioContext
  try {
    ctx = new Ctx()
  } catch {
    return () => {}
  }

  let stopped = false
  const stop = () => {
    if (stopped) return
    stopped = true
    // Closing takes every note still queued with it, which is what makes
    // Dismiss instant rather than "instant after the current burst".
    void ctx.close().catch(() => {})
  }

  try {
    for (const offset of burstOffsets(durationMs)) {
      const at = ctx.currentTime + offset
      scheduleNote(ctx, NOTES[0], at)
      scheduleNote(ctx, NOTES[1], at + NOTE_GAP_MS / 1000)
    }
  } catch {
    stop()
    return () => {}
  }

  if (typeof window !== 'undefined') {
    window.setTimeout(stop, durationMs + 500)
  }
  return stop
}
