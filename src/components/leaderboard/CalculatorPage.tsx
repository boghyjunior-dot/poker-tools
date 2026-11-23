/**
 * The score calculator, on its own.
 *
 * It left the leaderboard because it is a different kind of thing: the
 * standings are something you read and this is something you use, and a
 * working surface buried under five tables of other people's results is one
 * nobody scrolls to twice.
 */

import { BackToMenu } from '../BackToMenu'
import { DeployedViewSwitch } from '../DeployedViewSwitch'
import { Footer } from '../Footer'
import { LocalOnlyBanner } from '../LocalOnlyBanner'
import { CHALLENGE_VARIABLE, FEATURE_CHALLENGE_PUBLISHED } from '../../lib/featureFlags'
import { useT } from '../../lib/i18n'
import { CHALLENGE_NAME, SEASON, STAKE_CEILING, STAKE_FLOOR } from '../../lib/leaderboard'
import { ScoreCalculator } from './ScoreCalculator'

export function CalculatorPage() {
  const t = useT()

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="mx-auto w-full max-w-4xl">
        <BackToMenu className="mb-3" href="./leaderboard.html" label={CHALLENGE_NAME} />
        <h1 className="text-3xl font-bold text-white">{t('Score calculator')}</h1>
        <p className="mb-5 max-w-2xl text-sm text-slate-400">
          {t(
            'What a result is worth, before you play it. Put the tournament in and see the score broken out term by term — whether the dearer game is worth it, and how deep you would have to go in the cheap one to match it.',
          )}
        </p>

        <LocalOnlyBanner
          published={FEATURE_CHALLENGE_PUBLISHED}
          variable={CHALLENGE_VARIABLE}
          className="mb-5"
        />

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <p className="font-mono text-sm text-indigo-300">
            S = [ 100 × √(N / R) + 25 × (Bty / Bi) ] × ⁴√(Bi / {STAKE_FLOOR})
          </p>
          <p className="mt-1.5 text-xs text-slate-500">
            {t(
              'N entries, R where you finished, Bty the bounty money, Bi the buy-in — and only ${low} to ${high} buy-ins are in the challenge at all.',
              { low: STAKE_FLOOR, high: STAKE_CEILING },
            )}
          </p>
          <div className="mt-5">
            <ScoreCalculator />
          </div>
        </section>

        <p className="mt-4 text-xs text-slate-500">
          {t('The full points table for the {season} season is on the', { season: SEASON })}{' '}
          <a
            href="./leaderboard.html"
            className="font-medium text-indigo-400 underline-offset-2 hover:underline"
          >
            {t('challenge page')}
          </a>
          .
        </p>

        <Footer />
        <DeployedViewSwitch />
      </div>
    </div>
  )
}
