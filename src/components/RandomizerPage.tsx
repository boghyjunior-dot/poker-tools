import { useCallback, useEffect, useRef, useState } from 'react'

const AUTO_INTERVAL_MS = 15_000

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-6">
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

      <div className="flex rounded-lg bg-slate-800 p-0.5 w-48">
        <button
          type="button"
          onClick={() => {
            setAuto(false)
            setCountdown(AUTO_INTERVAL_MS)
          }}
          className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            !auto ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
          }`}
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
          className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            auto ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Auto / 15s
        </button>
      </div>

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
    </div>
  )
}
