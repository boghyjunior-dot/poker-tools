import { FEATURE_PRACTICE_ENABLED } from '../lib/featureFlags'
import { Footer } from './Footer'

type ToolStatus = 'done' | 'in-progress' | 'in-review' | 'coming-soon'

const STATUS_STYLES: Record<ToolStatus, { badge: string; label: string }> = {
  done: { badge: 'bg-emerald-900/60 text-emerald-300', label: 'Done' },
  'in-progress': { badge: 'bg-amber-900/60 text-amber-300', label: 'In progress' },
  'in-review': { badge: 'bg-indigo-900/60 text-indigo-300', label: 'In review' },
  'coming-soon': { badge: 'bg-slate-800 text-slate-500', label: 'Coming soon' },
}

function CardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
      <rect x="3" y="3" width="11" height="15" rx="2" />
      <path d="M7 7h3M7 10h3M7 13h1" />
      <rect x="10" y="6" width="11" height="15" rx="2" className="fill-slate-900" />
      <path d="M14 10h3M14 13h3M14 16h1" />
    </svg>
  )
}

function DiceIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8.5" cy="8.5" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="8.5" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="15.5" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="15.5" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  )
}

function PracticeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

function LeakIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5 21 21" />
      <path d="M8 10.5h5M10.5 8v5" />
    </svg>
  )
}

function QuizIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
      <rect x="3" y="4" width="14" height="16" rx="2" />
      <path d="M7 4V2.5M17 8h3.5a.5.5 0 0 1 .5.5V19a2 2 0 0 1-2 2H9" />
      <path d="M10 9.5a2 2 0 1 1 2.6 1.9c-.6.2-.9.7-.9 1.3v.3" />
      <circle cx="11.7" cy="15.8" r=".9" fill="currentColor" stroke="none" />
    </svg>
  )
}

function ChartsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
      <path d="M3 3h6v6H3zM9 9h6v6H9zM15 15h6v6h-6z" className="fill-current" strokeWidth="0" opacity="0.35" />
    </svg>
  )
}

function BankrollIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
      <ellipse cx="12" cy="6" rx="7" ry="2.5" />
      <path d="M5 6v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6" />
      <path d="M5 10v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-4" />
      <path d="M5 14v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-4" />
    </svg>
  )
}

function BountyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <path d="M3 12h18" />
      <path d="M12 8v12" />
      <path d="M12 8c-1.5-3-5-3.5-5-1.5S10.5 8 12 8Zm0 0c1.5-3 5-3.5 5-1.5S13.5 8 12 8Z" />
    </svg>
  )
}

function VarianceIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
      <path d="M3 20V4" />
      <path d="M3 20h18" />
      <path d="M6 15c2.5 0 3-7 5.5-7S15 17 18 17" />
      <path d="M6 10c2.5 0 3.5 3 5.5 3s3.5-8 6.5-8" strokeOpacity="0.45" />
    </svg>
  )
}

function EquityIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 17V11" />
      <path d="M12 17V7" />
      <path d="M16 17v-4" />
    </svg>
  )
}

function ToolCard({
  href,
  icon,
  title,
  description,
  accent,
  external,
  disabled,
  status,
}: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
  accent: string
  external?: boolean
  disabled?: boolean
  status: ToolStatus
}) {
  const statusStyle = STATUS_STYLES[status]
  const content = (
    <>
      <div className="flex items-center gap-3">
        <span
          className={
            disabled
              ? 'text-slate-600'
              : 'text-slate-300 group-hover:text-white transition-colors'
          }
        >
          {icon}
        </span>
        <h3 className={`text-lg font-semibold ${disabled ? 'text-slate-500' : 'text-white'}`}>
          {title}
        </h3>
        {external ? (
          <svg className="ml-auto w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        ) : (
          <span className={`ml-auto shrink-0 whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${statusStyle.badge}`}>
            {statusStyle.label}
          </span>
        )}
      </div>
      <p className={`text-sm leading-relaxed ${disabled ? 'text-slate-600' : 'text-slate-400'}`}>
        {description}
      </p>
    </>
  )

  if (disabled) {
    return (
      <div
        aria-disabled="true"
        className="flex flex-col gap-4 rounded-xl border border-slate-800/80 bg-slate-900/30 p-6 opacity-60 cursor-not-allowed"
      >
        {content}
      </div>
    )
  }

  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className={`group flex flex-col gap-4 rounded-xl border bg-slate-900/60 p-6 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl ${accent}`}
    >
      {content}
    </a>
  )
}

interface Tool {
  href: string
  icon: React.ReactNode
  title: string
  description: string
  accent: string
  status: ToolStatus
  disabled?: boolean
}

/** The menu, grouped. Order here is the order on screen. */
const SECTIONS: { name: string; blurb: string; tools: Tool[] }[] = [
  {
    name: 'MDF',
    blurb: 'Build a defending range, then test it under fire.',
    tools: [
      {
        href: 'mdf.html',
        icon: <CardIcon />,
        title: 'MDF Range Tool',
        description:
          'Paint your range, pick a bet size, tag hands to call or fold, and track Minimum Defense Frequency.',
        accent: 'border-indigo-800/60 hover:border-indigo-600/80',
        status: 'in-progress',
      },
      {
        href: 'practice.html',
        icon: <PracticeIcon />,
        title: 'MDF Practice',
        description:
          'Gamified drill: defend a preset range on flop, turn, and river vs random bets. Score your fold accuracy.',
        accent: 'border-rose-800/60 hover:border-rose-600/80',
        status: 'coming-soon',
        disabled: !FEATURE_PRACTICE_ENABLED,
      },
    ],
  },
  {
    name: 'Calculators',
    blurb: 'Put a number on the spot in front of you.',
    tools: [
      {
        href: 'equity.html',
        icon: <EquityIcon />,
        title: 'Equity Calculator',
        description:
          'Calculate preflop equity for a hand or range against one or more opponent ranges.',
        accent: 'border-violet-800/60 hover:border-violet-600/80',
        status: 'in-review',
      },
      {
        href: 'bounty.html',
        icon: <BountyIcon />,
        title: 'Mystery Bounty',
        description:
          'Work out what an average bounty is worth in cash and in big blinds, and how much wider it lets you call.',
        accent: 'border-fuchsia-800/60 hover:border-fuchsia-600/80',
        status: 'in-review',
      },
      {
        href: 'bankroll.html',
        icon: <BankrollIcon />,
        title: 'Bankroll',
        description:
          'What buy-ins your roll actually supports, from your ROI and field size, at three levels of risk.',
        accent: 'border-lime-800/60 hover:border-lime-600/80',
        status: 'done',
      },
      {
        href: 'variance.html',
        icon: <VarianceIcon />,
        title: 'MTT Variance',
        description:
          'Simulate a tournament sample: downswings, confidence bands, and risk of ruin, with graphs of every run.',
        accent: 'border-sky-800/60 hover:border-sky-600/80',
        status: 'done',
      },
    ],
  },
  {
    name: 'Knowledge',
    blurb: 'Learn the ranges and the numbers, then drill them.',
    tools: [
      {
        href: 'charts.html',
        icon: <ChartsIcon />,
        title: 'Preflop Charts',
        description:
          'MTT ranges by position and stack depth, typed in as strings — then drill yourself on them hand by hand.',
        accent: 'border-teal-800/60 hover:border-teal-600/80',
        status: 'in-progress',
      },
      {
        href: 'quiz.html',
        icon: <QuizIcon />,
        title: 'Quiz Me',
        description:
          'Heuristics, flashcards and questions to drill the numbers. Study the bundled decks or import your own file.',
        accent: 'border-amber-800/60 hover:border-amber-600/80',
        status: 'in-progress',
      },
    ],
  },
  {
    name: 'At the table',
    blurb: 'Small helpers for while you are playing, and after.',
    tools: [
      {
        href: 'randomizer.html',
        icon: <DiceIcon />,
        title: 'Randomizer',
        description:
          'Generate a random number from 1 to 100. Auto-generates every 15 seconds or roll manually.',
        accent: 'border-emerald-800/60 hover:border-emerald-600/80',
        status: 'done',
      },
      {
        href: 'leakfinder.html',
        icon: <LeakIcon />,
        title: 'Leak Finder',
        description:
          "Import a positional export from PokerTracker, Hold'em Manager or Hand2Note, rank every leak, and track it over time.",
        accent: 'border-cyan-800/60 hover:border-cyan-600/80',
        status: 'done',
      },
    ],
  },
]

export function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Poker Tools</h1>
          <p className="text-slate-400 text-sm">Choose a tool to get started</p>
        </header>

        <div className="flex flex-col gap-9">
          {SECTIONS.map((section) => (
            <section key={section.name}>
              <div className="mb-3 flex items-baseline gap-3 border-b border-slate-800 pb-2">
                <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-300">
                  {section.name}
                </h2>
                <p className="text-xs text-slate-500">{section.blurb}</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {section.tools.map((tool) => (
                  <ToolCard key={tool.href} {...tool} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <Footer />
      </div>
    </div>
  )
}
