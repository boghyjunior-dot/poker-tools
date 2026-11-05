import { useT } from '../src/lib/i18n'
import { LanguageSwitcher } from '../src/components/LanguageSwitcher'

/**
 * The front door of the local app.
 *
 * The tools that live apart from the published site, and the reason they do:
 * they are the only ones that keep anything. Everything on snapper.poker answers a
 * question and forgets it, which is what lets it be a folder of static files
 * with nothing behind it. A schedule you mark up and a results log you build
 * over a year are not that — they are a database, and a database is a thing
 * that can be lost, backed up, and migrated. So they run here instead.
 */

interface Tool {
  href: string
  title: string
  description: string
  icon: React.ReactNode
}

function ScheduleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      <circle cx="12" cy="15" r="2.5" />
    </svg>
  )
}

function StatsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  )
}

function TrackerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M7 15l4-5 3 3 5-7" />
    </svg>
  )
}

const TOOLS: Tool[] = [
  {
    href: './schedule.html',
    title: 'Schedule',
    description:
      'Tonight’s card: what you are playing, what you have passed on, and an alarm before late registration shuts.',
    icon: <ScheduleIcon />,
  },
  {
    href: './tracker.html',
    title: 'Bankroll Tracker',
    description:
      'Every result you have logged, and what it adds up to — profit, ROI, ITM, and the worst stretch you have sat through.',
    icon: <TrackerIcon />,
  },
  {
    href: './stats.html',
    title: 'Stats',
    description:
      'The same results read sideways: which stakes you are beating, which rooms earn their hours, and how this month compares.',
    icon: <StatsIcon />,
  },
]

export function SessionHome() {
  const t = useT()

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-white">{t('Snap Cash')}</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-400">
            {t(
              'Your schedule, your results, and what they add up to \u2014 kept on this machine. This app is never deployed: it holds a database, and a database belongs somewhere you control.',
            )}
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => (
            <a
              key={tool.href}
              href={tool.href}
              className="group rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition-colors hover:border-indigo-600/70 hover:bg-slate-900"
            >
              <span className="flex items-center gap-3 text-indigo-400">
                {tool.icon}
                <span className="text-lg font-semibold text-white">{t(tool.title)}</span>
              </span>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{t(tool.description)}</p>
            </a>
          ))}
        </div>

        {/* A link rather than a card: it is not a tool, and nothing about an
            empty database should look like a thing you are meant to use. */}
        <p className="mt-4 text-[13px] text-slate-500">
          {t('Nothing logged yet?')}{' '}
          <a
            href="./demo.html"
            className="font-medium text-indigo-400 underline-offset-2 hover:underline"
          >
            {t('Fill it with demo data')}
          </a>{' '}
          {t('to see what the pages look like with six months behind them.')}
        </p>

        <section className="mt-8 rounded-lg border border-slate-800 bg-slate-950/50 p-4">
          <h2 className="text-sm font-semibold text-slate-200">{t('Why this is separate')}</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
            {t(
              'The published tools are a folder of static files with nothing behind them, which is what makes them free to host and impossible to break. These two keep what you put in, so they run locally on their own port. Nothing here is uploaded anywhere.',
            )}
          </p>
          <p className="mt-3 text-[13px] text-slate-500">
            {t('The calculators are at')}{' '}
            <a
              href="http://localhost:5174/"
              className="font-medium text-indigo-400 underline-offset-2 hover:underline"
            >
              localhost:5174
            </a>
            .
          </p>
        </section>

        <div className="mt-8 flex justify-center">
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  )
}
