import { useState } from 'react'
import { BackToMenu } from '../BackToMenu'
import { Footer } from '../Footer'
import { useT, type TranslateFn } from '../../lib/i18n'
import {
  loadStage,
  monthsToReach,
  saveStage,
  stageIndex,
  STAGES,
  TRUTHS,
  type RoadmapStage,
} from '../../lib/roadmap'
import { RoadmapPath } from './RoadmapPath'

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-slate-800 bg-slate-900/60 p-5 ${className}`}>
      {children}
    </section>
  )
}

/** One labelled figure in the stage header. */
function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold" style={{ color: accent ?? '#f1f5f9' }}>
        {value}
      </p>
    </div>
  )
}

function StageDetail({ stage, t }: { stage: RoadmapStage; t: TranslateFn }) {
  const reach = monthsToReach(stage.step)

  return (
    // Keyed by stage in the parent, so switching stages replays the entry.
    <div className="roadmap-rise space-y-4">
      <div>
        <div className="flex flex-wrap items-baseline gap-3">
          <span
            className="rounded-md px-2 py-0.5 text-xs font-bold"
            style={{ backgroundColor: `${stage.color}22`, color: stage.color }}
          >
            {t('Stage {n}', { n: stage.step })}
          </span>
          <h2 className="text-2xl font-bold text-white">{t(stage.name)}</h2>
        </div>
        <p className="mt-1 text-sm text-slate-400">{t(stage.tagline)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label={t('Stakes')} value={t(stage.stakes)} accent={stage.color} />
        <Stat label={t('Bankroll')} value={t(stage.bankroll)} />
        <Stat label={t('In buy-ins')} value={t(stage.buyIns)} />
        <Stat label={t('Time here')} value={t(stage.months)} />
        <Stat label={t('Volume')} value={t(stage.volume)} />
        <Stat label={t('Study')} value={t(stage.study)} />
      </div>

      {stage.step > 1 && (
        <p className="text-xs text-slate-500">
          {t('Typically {low}–{high} months of playing before you get here at all.', {
            low: reach.low,
            high: reach.high,
          })}
        </p>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-white">{t('What you learn here')}</h3>
        <ul className="space-y-1.5">
          {stage.skills.map((skill) => (
            <li key={skill} className="flex gap-2 text-sm text-slate-300">
              <span aria-hidden="true" style={{ color: stage.color }}>
                ▸
              </span>
              {t(skill)}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
        <p className="text-[10px] uppercase tracking-wider text-slate-500">
          {t('How you know you are ready')}
        </p>
        <p className="mt-1 text-sm text-slate-200">{t(stage.proof)}</p>
      </div>

      <div
        className="rounded-lg border p-3"
        style={{ borderColor: `${stage.color}55`, backgroundColor: `${stage.color}12` }}
      >
        <p className="text-[10px] uppercase tracking-wider" style={{ color: stage.color }}>
          {t('The honest part')}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-slate-300">{t(stage.reality)}</p>
      </div>

      {stage.tools.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-white">{t('Tools for this stage')}</h3>
          <div className="flex flex-wrap gap-2">
            {stage.tools.map((tool) => (
              <a
                key={tool.href}
                href={tool.href}
                className="rounded-md border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-700"
              >
                {tool.label} →
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function RoadmapPage() {
  const t = useT()
  const [activeId, setActiveId] = useState(STAGES[0].id)
  const [myStage, setMyStage] = useState<string | null>(() => loadStage())

  const active = STAGES.find((stage) => stage.id === activeId) ?? STAGES[0]
  const reachedIndex = stageIndex(myStage)

  const setMine = (id: string | null) => {
    setMyStage(id)
    saveStage(id)
  }

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="mx-auto w-full max-w-5xl">
        <BackToMenu className="mb-3" />
        <h1 className="text-3xl font-bold text-white">{t('Roadmap')}</h1>
        <p className="mb-6 max-w-2xl text-sm text-slate-400">
          {t(
            'From never having played to sitting in a high-stakes game — the six stages, what each one costs in money and hours, and how many people actually get through.',
          )}
        </p>

        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <div className="flex flex-col items-center gap-4">
            <Panel className="w-full">
              <RoadmapPath activeId={activeId} reachedIndex={reachedIndex} onSelect={setActiveId} />
            </Panel>

            <Panel className="w-full">
              <p className="mb-2 text-xs font-semibold text-white">{t('Where are you now?')}</p>
              <div className="flex flex-wrap gap-1.5">
                {STAGES.map((stage) => (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => setMine(myStage === stage.id ? null : stage.id)}
                    aria-pressed={myStage === stage.id}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      myStage === stage.id
                        ? 'text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                    }`}
                    style={
                      myStage === stage.id ? { backgroundColor: stage.color } : undefined
                    }
                  >
                    {stage.step}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                {myStage
                  ? t('The road fills in up to where you are. Tap again to clear it.')
                  : t('Pick a stage to light up the road behind you. It stays in this browser.')}
              </p>
            </Panel>
          </div>

          <div className="flex flex-col gap-6">
            <Panel>
              {/* Keyed so the entry animation replays when the stage changes. */}
              <StageDetail key={active.id} stage={active} t={t} />
            </Panel>

            <Panel>
              <h2 className="mb-1 text-sm font-semibold text-white">
                {t('True at every stage')}
              </h2>
              <p className="mb-4 text-xs text-slate-500">
                {t('The parts no single milestone owns, and the ones that decide who keeps going.')}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {TRUTHS.map((truth, index) => (
                  <div
                    key={truth.title}
                    className="roadmap-rise rounded-lg border border-slate-800 bg-slate-950/40 p-3"
                    style={{ animationDelay: `${index * 70}ms` }}
                  >
                    <p className="text-sm font-semibold text-slate-200">{t(truth.title)}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">{t(truth.body)}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  )
}
