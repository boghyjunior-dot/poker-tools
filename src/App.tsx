import { RangeProvider } from './state/RangeContext'
import { BoardPicker } from './components/BoardPicker'
import { BetSizeBar } from './components/BetSizeBar'
import { StatsBar } from './components/StatsBar'
import { Toolbar } from './components/Toolbar'
import { HandMatrix } from './components/HandMatrix'
import { ComboPanel } from './components/ComboPanel'
import { Legend } from './components/Legend'
import { MdfTargetDisplay } from './components/MdfTargetDisplay'

function App() {
  return (
    <RangeProvider>
      <div className="min-h-screen p-4 sm:p-6 max-w-7xl mx-auto">
        <header className="mb-6 flex items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <a
                href="home.html"
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-3 h-3"><path d="M10 12L6 8l4-4"/></svg>
                Poker Tools
              </a>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">MDF Range Tool</h1>
            <p className="text-sm text-slate-400">
              Paint your range, pick a bet size, tag hands to call or fold, and track MDF fold %.
            </p>
          </div>
        </header>

        <div className="space-y-4">
          <section className="bg-slate-900/60 rounded-lg p-4 border border-slate-800">
            <BetSizeBar />
          </section>

          <section className="bg-slate-900/60 rounded-lg p-4 border border-slate-800">
            <StatsBar />
          </section>

          <section className="bg-slate-900/60 rounded-lg p-4 border border-slate-800">
            <Toolbar />
          </section>

          <section className="bg-slate-900/60 rounded-lg p-4 border border-slate-800">
            <BoardPicker />
          </section>

          <section className="bg-slate-900/60 rounded-lg p-4 border border-slate-800">
            <div className="flex flex-col xl:flex-row gap-4 xl:gap-6 items-start">
              <div className="shrink-0">
                <HandMatrix />
              </div>
              <div className="w-full xl:flex-1 xl:min-w-0 xl:sticky xl:top-4 border-t xl:border-t-0 xl:border-l border-slate-700 pt-4 xl:pt-0 xl:pl-6">
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
                  <div className="flex-1 min-w-0 w-full">
                    <h2 className="text-sm font-semibold text-slate-300 mb-3">Combo detail</h2>
                    <ComboPanel />
                  </div>
                  <div className="shrink-0 sm:ml-auto w-full sm:w-auto">
                    <MdfTargetDisplay compact />
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800">
              <Legend />
            </div>
          </section>
        </div>
      </div>
    </RangeProvider>
  )
}

export default App
