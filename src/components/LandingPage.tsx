/**
 * The front door: two things this site is.
 *
 * It used to open straight onto the toolbox, which was right while the
 * toolbox was all there was. The challenge is not a tool — you do not open it
 * to answer a question, you are in it or you are not — and a leaderboard
 * filed between the equity calculator and the randomizer would have said
 * otherwise. So the choice comes first and the tools sit one press behind it.
 */

import { FEATURE_CHALLENGE_ENABLED } from '../lib/featureFlags'
import { CHALLENGE_NAME } from '../lib/leaderboard'
import { useT } from '../lib/i18n'
import { Footer } from './Footer'
import { LanguageSwitcher } from './LanguageSwitcher'

function ToolboxIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10">
      <rect x="2.5" y="7.5" width="19" height="13" rx="2" />
      <path d="M8.5 7.5V5.5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2" />
      <path d="M2.5 13h19" />
      <path d="M9.5 11.5v3M14.5 11.5v3" />
    </svg>
  )
}

function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10">
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 5.5H5.5a2.5 2.5 0 0 0 2.5 2.5M16 5.5h2.5A2.5 2.5 0 0 1 16 8" />
      <path d="M12 13v4" />
      <path d="M9 20h6M10 17h4l.6 3h-5.2l.6-3Z" />
    </svg>
  )
}

interface Door {
  href: string
  title: string
  blurb: string
  /** What you find once you are through it. */
  inside: string
  icon: React.ReactNode
  accent: string
  /** False renders the card greyed out: the page is not in this build. */
  enabled: boolean
}

const DOORS: Door[] = [
  {
    href: './home.html',
    title: 'Poker tools',
    blurb: 'Ask it something and it answers.',
    inside:
      'MDF ranges, equity, bankroll, variance, preflop charts, the leak finder and the rest — grouped by the kind of question they answer.',
    icon: <ToolboxIcon />,
    accent: 'border-indigo-800/60 hover:border-indigo-600/80',
    enabled: true,
  },
  {
    href: './leaderboard.html',
    title: CHALLENGE_NAME,
    blurb: 'A points race you are in or you are not.',
    inside:
      'Two tables off one set of results: your best ten scores in a month, your best fifty in a year. Points for how deep you ran in how big a field.',
    icon: <TrophyIcon />,
    accent: 'border-yellow-800/60 hover:border-yellow-600/80',
    enabled: FEATURE_CHALLENGE_ENABLED,
  },
]

function DoorCard({ door }: { door: Door }) {
  const t = useT()

  const content = (
    <>
      <span className={door.enabled ? 'text-slate-300 transition-colors group-hover:text-white' : 'text-slate-600'}>
        {door.icon}
      </span>
      <div>
        <h2 className={`text-2xl font-bold ${door.enabled ? 'text-white' : 'text-slate-500'}`}>
          {t(door.title)}
        </h2>
        <p className={`mt-0.5 text-sm ${door.enabled ? 'text-slate-400' : 'text-slate-600'}`}>
          {t(door.blurb)}
        </p>
      </div>
      <p className={`text-sm leading-relaxed ${door.enabled ? 'text-slate-500' : 'text-slate-600'}`}>
        {t(door.inside)}
      </p>
      {door.enabled ? (
        <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-400 transition-colors group-hover:text-indigo-300">
          {t('Open')}
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden>
            <path d="m6 4 4 4-4 4" />
          </svg>
        </span>
      ) : (
        <span className="mt-auto w-fit rounded px-2 py-0.5 text-xs font-medium uppercase tracking-wide bg-slate-800 text-slate-500">
          {t('Coming soon')}
        </span>
      )}
    </>
  )

  if (!door.enabled) {
    return (
      <div
        aria-disabled="true"
        className="flex min-h-[15rem] cursor-not-allowed flex-col gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/30 p-7 opacity-60"
      >
        {content}
      </div>
    )
  }

  return (
    <a
      href={door.href}
      className={`group flex min-h-[15rem] flex-col gap-4 rounded-2xl border bg-slate-900/60 p-7 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl ${door.accent}`}
    >
      {content}
    </a>
  )
}

export function LandingPage() {
  const t = useT()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        <header className="mb-10 text-center">
          <div className="mb-2 flex justify-end">
            <LanguageSwitcher />
          </div>
          <h1 className="mb-2 text-4xl font-bold text-white">Poker Tools</h1>
          <p className="text-sm text-slate-400">{t('Pick a door')}</p>
        </header>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {DOORS.map((door) => (
            <DoorCard key={door.href} door={door} />
          ))}
        </div>

        <Footer />
      </div>
    </div>
  )
}
