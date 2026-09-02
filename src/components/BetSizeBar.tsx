import { computeBetPctOfPot, parseCustomSize } from '../lib/mdf'
import { MDF_BETS } from '../types/poker'
import { useRange } from '../state/RangeContext'

const inputClass =
  'w-16 rounded-md border border-slate-600 bg-slate-800 text-slate-100 text-sm px-2 py-1.5 tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500/50'

export function BetSizeBar() {
  const { state, dispatch, stats } = useRange()

  const customPot = parseCustomSize(state.customPot)
  const customBet = parseCustomSize(state.customBet)
  const usingCustom = customPot != null && customBet != null
  const betPctOfPot =
    usingCustom ? computeBetPctOfPot(customBet, customPot) : null

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="text-sm text-slate-400 mr-1">Bet size:</span>
      {MDF_BETS.map((bet) => (
        <button
          key={bet.label}
          type="button"
          onClick={() => dispatch({ type: 'SET_BET', betLabel: bet.label })}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            !usingCustom && state.betLabel === bet.label
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
          }`}
        >
          {bet.label}
          <span className="ml-1 text-xs opacity-70">{bet.foldPct}%</span>
        </button>
      ))}

      <div className="flex flex-wrap items-center gap-2 pl-1 border-l border-slate-700 ml-1">
        <label className="flex items-center gap-1.5 text-sm text-slate-400">
          <span aria-hidden="true">💵</span>
          Bet
          <input
            type="number"
            min="0"
            step="any"
            placeholder="—"
            value={state.customBet}
            onChange={(e) =>
              dispatch({ type: 'SET_CUSTOM_SIZES', customBet: e.target.value })
            }
            className={inputClass}
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-slate-400">
          <span aria-hidden="true">💰</span>
          Pot
          <input
            type="number"
            min="0"
            step="any"
            placeholder="—"
            value={state.customPot}
            onChange={(e) =>
              dispatch({ type: 'SET_CUSTOM_SIZES', customPot: e.target.value })
            }
            className={inputClass}
          />
        </label>
        {usingCustom && betPctOfPot != null && (
          <span className="text-sm text-slate-300 tabular-nums">
            <span className="text-slate-500 mr-1">→</span>
            {betPctOfPot.toFixed(0)}% pot
            <span className="text-slate-500 mx-1.5">·</span>
            {stats.targetPct.toFixed(0)}% fold
          </span>
        )}
      </div>
    </div>
  )
}
