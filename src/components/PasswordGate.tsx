/**
 * The door in front of a gated tool.
 *
 * Renders nothing of the page until the password is given, which on a static
 * site means the markup is withheld rather than the code — see lib/gate for
 * what that is and is not worth.
 *
 * The unlock is remembered, because a tool you have to log into every time
 * is a tool you stop opening.
 */

import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useT } from '../lib/i18n'
import { GATE_KEY, canHash, gateIsUp, unlocks } from '../lib/gate'

function remembered(): boolean {
  try {
    return localStorage.getItem(GATE_KEY) === 'yes'
  } catch {
    // Private mode. The password still works, it just will not be kept.
    return false
  }
}

export function PasswordGate({ children }: { children: ReactNode }) {
  const t = useT()
  const [open, setOpen] = useState(() => !gateIsUp() || remembered())
  const [password, setPassword] = useState('')
  const [checking, setChecking] = useState(false)
  const [wrong, setWrong] = useState(false)

  // The title is the one thing worth changing while the page is shut: a tab
  // called "Equity Calculator" that shows a password box is confusing, and a
  // bookmark of it is worse.
  useEffect(() => {
    if (open || typeof document === 'undefined') return
    const was = document.title
    document.title = `Locked — ${was}`
    return () => {
      document.title = was
    }
  }, [open])

  if (open) return <>{children}</>

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (checking) return
    setChecking(true)
    setWrong(false)
    const right = await unlocks(password)
    if (right) {
      try {
        localStorage.setItem(GATE_KEY, 'yes')
      } catch {
        // Nothing to do; this session still works.
      }
      setOpen(true)
      return
    }
    setChecking(false)
    setWrong(true)
    setPassword('')
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900/60 p-6"
      >
        <h1 className="text-lg font-semibold text-white">{t('This one is locked')}</h1>
        <p className="mt-1 text-sm text-slate-400">
          {t('Ask for the password if you think you should have it.')}
        </p>

        <label className="mt-4 flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-slate-500">
            {t('Password')}
          </span>
          <input
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-label={t('Password')}
            aria-invalid={wrong}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
        </label>

        {wrong && (
          <p role="alert" className="mt-2 text-xs text-rose-400">
            {t('That is not it.')}
          </p>
        )}
        {!canHash() && (
          <p role="alert" className="mt-2 text-xs text-amber-400">
            {t('This browser will not do the check — it needs a secure (https) connection.')}
          </p>
        )}

        <button
          type="submit"
          disabled={checking || password.length === 0}
          className="mt-4 w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {checking ? t('Checking…') : t('Open it')}
        </button>

        <a
          href="./"
          className="mt-4 block text-center text-xs text-slate-500 transition-colors hover:text-slate-300"
        >
          {t('Back to the other tools')}
        </a>
      </form>
    </div>
  )
}
