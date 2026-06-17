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
}: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
  accent: string
  external?: boolean
}) {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className={`group flex flex-col gap-4 rounded-xl border bg-slate-900/60 p-6 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl ${accent}`}
    >
      <div className="flex items-center gap-3">
        <span className="text-slate-300 group-hover:text-white transition-colors">{icon}</span>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {external && (
          <svg className="ml-auto w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        )}
      </div>
      <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
    </a>
  )
}

export function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Poker Tools</h1>
          <p className="text-slate-400 text-sm">Choose a tool to get started</p>
        </header>

        <div className="flex flex-col gap-4">
          <ToolCard
            href="mdf.html"
            icon={<CardIcon />}
            title="MDF Range Tool"
            description="Paint your range, pick a bet size, tag hands to call or fold, and track Minimum Defense Frequency."
            accent="border-indigo-800/60 hover:border-indigo-600/80"
          />
          <ToolCard
            href="equity.html"
            icon={<EquityIcon />}
            title="Equity Calculator"
            description="Calculate preflop equity for a hand or range against one or more opponent ranges."
            accent="border-violet-800/60 hover:border-violet-600/80"
          />
          <ToolCard
            href="randomizer.html"
            icon={<DiceIcon />}
            title="Randomizer"
            description="Generate a random number from 1 to 100. Auto-generates every 15 seconds or roll manually."
            accent="border-emerald-800/60 hover:border-emerald-600/80"
          />
        </div>
      </div>
    </div>
  )
}
