import type { PositionKey } from './leakfinder'

/**
 * Where to go and work on a leak.
 *
 * A number and a sentence of advice tell you what is wrong; this tells you
 * which tool in the suite actually fixes it, so the report ends in an action
 * rather than a shrug.
 */
export interface FixLink {
  /** Tool page, relative so it survives the GitHub Pages base path. */
  href: string
  /** Short call to action in English, e.g. "Drill BTN opens". Used by the export. */
  label: string
  /** The action on its own, so the UI can translate it. */
  verb: string
  /** Seat the action applies to, when the link points at a specific chart. */
  seat?: string
}

/** Seats the Preflop Charts tool ships ranges for, keyed the same way we are. */
const CHART_SEATS: Partial<Record<PositionKey, string>> = {
  utg: 'UTG',
  utg1: 'UTG+1',
  lj: 'LJ',
  hj: 'HJ',
  co: 'CO',
  btn: 'BTN',
  sb: 'SB',
  bb: 'BB',
}

type FixBuilder = (position: PositionKey) => FixLink

const chartsFix =
  (verb: string): FixBuilder =>
  (position) => {
    const seat = CHART_SEATS[position]
    return {
      href: 'charts.html',
      label: seat ? `${verb} — ${seat} charts` : `${verb} — preflop charts`,
      verb,
      seat,
    }
  }

const mdfFix = (label: string): FixBuilder => () => ({ href: 'mdf.html', label, verb: label })
const equityFix = (label: string): FixBuilder => () => ({ href: 'equity.html', label, verb: label })
const quizFix = (label: string): FixBuilder => () => ({ href: 'quiz.html', label, verb: label })
const varianceFix = (label: string): FixBuilder => () => ({ href: 'variance.html', label, verb: label })

/**
 * Stat id to the tool that addresses it. Preflop range problems go to the
 * charts; continue/fold frequencies are MDF questions; everything showdown-ish
 * is a study problem rather than a range problem.
 */
const FIXES: Record<string, FixBuilder> = {
  // Opening and calling ranges — a chart problem.
  raiseFirst: chartsFix('Compare your opens'),
  pfr: chartsFix('Compare your opens'),
  attemptToSteal: chartsFix('Compare late-position opens'),
  vpip: chartsFix('Compare your ranges'),
  callPf2Bet: chartsFix('Check the flatting range'),
  threeBetPf: chartsFix('Check the 3-bet range'),
  threeBetSteal: chartsFix('Check blind 3-bets'),
  threeBetNaiLt35: chartsFix('Check the 3-bet range'),
  raiseAnd4BetPlusPf: chartsFix('Check the 4-bet range'),
  pfSqueeze: chartsFix('Check the squeeze range'),
  limpOpen: chartsFix('Review the SB limp range'),
  limpRaise: chartsFix('Review the SB limp range'),
  limpCall: chartsFix('Review the SB limp range'),
  limpFold: chartsFix('Review the SB limp range'),
  raiseSbOpenLimp: chartsFix('Review BB vs limp'),
  foldBbVsSb: chartsFix('Review BB defence'),
  foldToSteal: chartsFix('Review BB defence'),

  // Defend-or-fold frequencies — an MDF problem.
  twoBetPfAndFold: mdfFix('Work out the right defend frequency'),
  threeBetPfAndFold: mdfFix('Work out the right defend frequency'),
  foldToPf4BetAfter3BetLt30: mdfFix('Work out the right defend frequency'),
  foldToFCbetHu: mdfFix('Build the flop defending range'),
  foldToFCbet3B: mdfFix('Build the flop defending range'),
  foldToFFloatHu: mdfFix('Build the flop defending range'),
  foldToTCbet: mdfFix('Build the turn defending range'),
  foldToTPrHu: mdfFix('Build the turn defending range'),
  foldToRCbet: mdfFix('Build the river defending range'),

  // Equity questions — how often does this hand actually get there.
  cbetFOopHu: equityFix('Check equity vs a calling range'),
  cbetFIpHu: equityFix('Check equity vs a calling range'),
  cbetFAndFoldHu: equityFix('Check equity vs a calling range'),
  floatFHu: equityFix('Check float equity'),
  floatT: equityFix('Check float equity'),
  raiseFCbetHu: equityFix('Check raise equity'),
  raiseFCbet3B: equityFix('Check raise equity'),
  xrFlopHu: equityFix('Check check-raise equity'),
  raiseTCbet: equityFix('Check raise equity'),
  raiseTProbeHu: equityFix('Check raise equity'),
  cbetTHu: equityFix('Check equity vs a calling range'),
  cbetR: equityFix('Check equity vs a calling range'),
  probeTHu: equityFix('Check probe equity'),
  probeTHuAndBetR: equityFix('Check probe equity'),
  donkTHu: equityFix('Check equity vs a betting range'),
  donkR: equityFix('Check equity vs a betting range'),

  // Study and sample-size problems.
  wtsd: quizFix('Drill the pot-odds numbers'),
  wsd: quizFix('Drill the pot-odds numbers'),
  wwsf: quizFix('Drill the combo maths'),
  aggressionFactor: quizFix('Drill the aggression heuristics'),
  allInAdjBb100: varianceFix('See what this winrate does over a sample'),
}

export function fixFor(statId: string, position: PositionKey): FixLink | null {
  const builder = FIXES[statId]
  return builder ? builder(position) : null
}
