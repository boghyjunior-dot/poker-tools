/**
 * The sound an alarm makes.
 *
 * A single beep is easy to miss, which is the one thing an alarm must not be:
 * you are looking at another table when it fires, and half a second of sine
 * wave is gone before you turn your head. Two bursts is the answer — the
 * second is what tells you the first was not the kettle — and then it stops.
 * The banner is what persists; the sound only has to turn your head towards it.
 */

/** One burst every this long, which reads as an alarm rather than a chime. */
export const ALARM_BURST_MS = 1200

/** Bursts per alarm. Two: one to hear, one to be sure of. */
export const ALARM_BURSTS = 2

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
export function burstOffsets(bursts: number = ALARM_BURSTS, burstMs: number = ALARM_BURST_MS): number[] {
  if (!Number.isFinite(bursts) || bursts < 1) return []
  const gap = Number.isFinite(burstMs) && burstMs > 0 ? burstMs : ALARM_BURST_MS
  return Array.from({ length: Math.floor(bursts) }, (_, i) => (i * gap) / 1000)
}

/** How long a run of bursts takes, last note included. */
export function alarmDurationMs(
  bursts: number = ALARM_BURSTS,
  burstMs: number = ALARM_BURST_MS,
): number {
  const offsets = burstOffsets(bursts, burstMs)
  if (offsets.length === 0) return 0
  return offsets[offsets.length - 1] * 1000 + NOTE_GAP_MS + NOTE_MS
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
export function startAlarm(bursts: number = ALARM_BURSTS): () => void {
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
    for (const offset of burstOffsets(bursts)) {
      const at = ctx.currentTime + offset
      scheduleNote(ctx, NOTES[0], at)
      scheduleNote(ctx, NOTES[1], at + NOTE_GAP_MS / 1000)
    }
  } catch {
    stop()
    return () => {}
  }

  // Closed once the last note has sounded, so an alarm nobody dismissed does
  // not leave an audio context open for the rest of the session.
  if (typeof window !== 'undefined') {
    window.setTimeout(stop, alarmDurationMs(bursts) + 500)
  }
  return stop
}
