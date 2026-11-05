import { useT } from '../src/lib/i18n'
import { LanguageSwitcher } from '../src/components/LanguageSwitcher'

/**
 * The front door of the local app.
 *
 * Two tools, and the reason they live apart from the published site: they are
 * the only ones that keep anything. Everything on snapper.poker answers a
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
]

export function SessionHome() {
  const t = useT()

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-white">{t('Snapper Livewell')}</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-400">
            {t(
              'Your schedule and your results, kept on this machine. This app is never deployed: it holds a database, and a database belongs somewhere you control.',
            )}
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
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
              href="http://localhost:5173/"
              className="font-medium text-indigo-400 underline-offset-2 hover:underline"
            >
              localhost:5173
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
