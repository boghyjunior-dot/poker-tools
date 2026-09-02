import { useCallback, useEffect, useRef, useState } from 'react'
import { BackToMenu } from './BackToMenu'
import { Footer } from './Footer'

const AUTO_INTERVAL_MS = 15_000

/**
 * Pop-out window size. Small enough to tuck into a screen corner beside a
 * table, big enough for the number and the roll button without scrolling —
 * the layout still holds if it is dragged smaller.
 */
const POPUP_W = 230
const POPUP_H = 260

function random1to100() {
  return Math.floor(Math.random() * 100) + 1
}

function valueColor(n: number): string {
  // red=1, yellow=25–50, green=50–100 with smooth blending between zones
  type RGB = { r: number; g: number; b: number }
  const lerp = (a: RGB, b: RGB, t: number): string => {
    const c = Math.max(0, Math.min(1, t))
    return `rgb(${Math.round(a.r + (b.r - a.r) * c)} ${Math.round(a.g + (b.g - a.g) * c)} ${Math.round(a.b + (b.b - a.b) * c)})`
  }
  const red: RGB = { r: 239, g: 68, b: 68 }
  const yellow: RGB = { r: 234, g: 179, b: 8 }
  const green: RGB = { r: 34, g: 197, b: 94 }

  if (n <= 25) return lerp(red, yellow, (n - 1) / 24)
  if (n < 50) return lerp(yellow, yellow, 0)
  return lerp(yellow, green, (n - 50) / 50)
}

function CountdownRing({ progress }: { progress: number }) {
  const r = 28
  const circ = 2 * Math.PI * r
  return (
    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#1e293b" strokeWidth="3" />
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke="#4f46e5"
        strokeWidth="3"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - progress)}
        strokeLinecap="round"
        className="transition-all duration-1000 ease-linear"
      />
    </svg>
  )
}

export function RandomizerPage() {
  const [value, setValue] = useState(() => random1to100())
  const [auto, setAuto] = useState(false)
  const [countdown, setCountdown] = useState(AUTO_INTERVAL_MS)
  // `?compact=1` strips the page down to the dial so it fits a corner window.
  const [compact] = useState(() => new URLSearchParams(window.location.search).has('compact'))
  const [popupBlocked, setPopupBlocked] = useState(false)
  const startRef = useRef<number>(0)
  const rafRef = useRef<number>(0)

  const roll = useCallback(() => setValue(random1to100()), [])

  const resetTimer = useCallback(() => {
    startRef.current = performance.now()
    setCountdown(AUTO_INTERVAL_MS)
  }, [])

  useEffect(() => {
    if (!auto) {
      cancelAnimationFrame(rafRef.current)
      return
    }

    const tick = () => {
      const elapsed = performance.now() - startRef.current
      const remaining = Math.max(0, AUTO_INTERVAL_MS - elapsed)
      setCountdown(remaining)
      if (remaining === 0) {
        roll()
        resetTimer()
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [auto, roll, resetTimer])

  const handleManualRoll = () => {
    roll()
    if (auto) resetTimer()
  }

  const progress = countdown / AUTO_INTERVAL_MS

  const openPopup = () => {
    const popup = window.open(
      'randomizer.html?compact=1',
      'poker-randomizer',
      `popup=yes,width=${POPUP_W},height=${POPUP_H}`,
    )
    setPopupBlocked(popup === null)
    popup?.focus()
  }

  const modeToggle = (size: 'full' | 'compact') => (
    <div className={`flex rounded-lg bg-slate-800 p-0.5 ${size === 'full' ? 'w-48' : 'w-full'}`}>
      <button
        type="button"
        onClick={() => {
          setAuto(false)
          setCountdown(AUTO_INTERVAL_MS)
        }}
        className={`flex-1 rounded-md font-medium transition-colors ${
          size === 'full' ? 'px-3 py-1.5 text-xs' : 'px-2 py-1 text-[11px]'
        } ${!auto ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
      >
        Manual
      </button>
      <button
        type="button"
        onClick={() => {
          roll()
          resetTimer()
          setAuto(true)
        }}
        className={`flex-1 rounded-md font-medium transition-colors ${
          size === 'full' ? 'px-3 py-1.5 text-xs' : 'px-2 py-1 text-[11px]'
        } ${auto ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
      >
        Auto / 15s
      </button>
    </div>
  )

  if (compact) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-2.5 overflow-hidden p-3">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
          {auto && <CountdownRing progress={progress} />}
          <span
            className="relative z-10 text-4xl font-bold tabular-nums transition-colors duration-300"
            style={{ color: valueColor(value) }}
          >
            {value}
          </span>
        </div>

        {modeToggle('compact')}

        <button
          type="button"
          onClick={handleManualRoll}
          className="w-full rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white transition-all hover:bg-indigo-500 active:scale-95"
        >
          Roll
        </button>

        <p className="h-3 text-[10px] leading-3 text-slate-500">
          {auto ? `Next in ${Math.ceil(countdown / 1000)}s` : ''}
        </p>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 gap-6">
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
        <BackToMenu />
      </div>

      <header className="text-center">
        <h1 className="text-xl font-bold text-white">Randomizer</h1>
        <p className="text-xs text-slate-500 mt-0.5">1 – 100</p>
      </header>

      <div className="relative w-28 h-28 flex items-center justify-center">
        {auto && <CountdownRing progress={progress} />}
        <span
          className="text-5xl font-bold tabular-nums transition-colors duration-300 relative z-10"
          style={{ color: valueColor(value) }}
        >
          {value}
        </span>
      </div>

      {modeToggle('full')}

      <button
        type="button"
        onClick={handleManualRoll}
        className="w-48 py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 transition-all"
      >
        Roll
      </button>

      {auto && (
        <p className="text-xs text-slate-500">
          Next roll in {Math.ceil(countdown / 1000)}s
        </p>
      )}

      <div className="flex flex-col items-center gap-1.5">
        <button
          type="button"
          onClick={openPopup}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-200"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5" aria-hidden>
            <path d="M9 2h5v5" />
            <path d="M14 2 7.5 8.5" />
            <path d="M12 9.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3.5" />
          </svg>
          Pop out to a corner window
        </button>
        {popupBlocked && (
          <p className="max-w-xs text-center text-[11px] text-amber-400">
            Your browser blocked the pop-up. Allow pop-ups for this site and try again.
          </p>
        )}
      </div>

      <Footer className="w-full max-w-sm" />
    </div>
  )
}
