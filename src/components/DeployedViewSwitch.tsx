/**
 * The switch that makes the dev server pretend it is the published site.
 *
 * Fixed to a corner rather than placed in a page, because it belongs to the
 * session rather than to anything on screen, and because it has to be
 * reachable from whichever page you are standing on when the question
 * occurs to you.
 *
 * Renders nothing in a build.
 */

import { useT } from '../lib/i18n'
import { CAN_PREVIEW, setDeployedView, useDeployedView } from '../lib/deployedView'

export function DeployedViewSwitch() {
  const t = useT()
  const pretending = useDeployedView()
  if (!CAN_PREVIEW) return null

  return (
    <div className="fixed bottom-3 right-3 z-50 flex items-center gap-1 rounded-full border border-slate-700 bg-slate-950/90 p-1 text-[11px] shadow-lg backdrop-blur">
      <span className="pl-2 pr-1 font-medium text-slate-500">{t('Viewing as')}</span>
      {[
        { on: false, label: 'Local' },
        { on: true, label: 'Deployed' },
      ].map((option) => (
        <button
          key={option.label}
          type="button"
          onClick={() => setDeployedView(option.on)}
          aria-pressed={pretending === option.on}
          className={`rounded-full px-2.5 py-1 font-semibold transition-colors ${
            pretending === option.on
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {t(option.label)}
        </button>
      ))}
    </div>
  )
}
