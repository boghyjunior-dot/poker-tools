/**
 * Pages that are visible while developing but held back from the published
 * site until they are deliberately let out.
 *
 * The rule is the same for all of them: on in the dev server, off in a
 * production build, unless the matching environment variable says otherwise.
 * That way a half-finished page can be worked on and linked from the local
 * menu without appearing on the live site by accident, and shipping it is one
 * variable rather than a code change.
 *
 *     npm run dev                              → visible
 *     npm run build                            → hidden
 *     VITE_PUBLISH_ROADMAP=true npm run build  → published
 */

/** Anything Vite might hand us as `import.meta.env`. */
export interface FlagEnv {
  DEV?: boolean
  [key: string]: unknown
}

/** Environment variables are strings, so accept the usual ways of saying yes. */
function isOn(value: unknown): boolean {
  if (value === true) return true
  if (typeof value !== 'string') return false
  const normalised = value.trim().toLowerCase()
  return normalised === 'true' || normalised === '1' || normalised === 'yes'
}

/**
 * Whether a local-only page should render at all: always while developing,
 * and in a build only when its variable is set.
 *
 * Kept pure and exported so the rule can be tested without running a build.
 */
export function isEnabled(env: FlagEnv, variable: string): boolean {
  return env.DEV === true || isOn(env[variable])
}

/** Whether the page would survive into a published build. */
export function isPublished(env: FlagEnv, variable: string): boolean {
  return isOn(env[variable])
}

/** MDF Practice is available only in the Vite dev server; production builds show "Coming soon". */
export const FEATURE_PRACTICE_ENABLED = import.meta.env.DEV

export const ROADMAP_VARIABLE = 'VITE_PUBLISH_ROADMAP'

/** The Roadmap renders locally, and on the live site only once it is let out. */
export const FEATURE_ROADMAP_ENABLED = isEnabled(import.meta.env, ROADMAP_VARIABLE)

/** True once the Roadmap is set to ship, so the page can stop calling itself local. */
export const FEATURE_ROADMAP_PUBLISHED = isPublished(import.meta.env, ROADMAP_VARIABLE)

export const REVIEW_VARIABLE = 'VITE_PUBLISH_IN_REVIEW'

/**
 * Equity Calculator and Mystery Bounty are still being checked, so they run
 * locally and stay off the live site until the review is finished. They share
 * one variable because they come off review together.
 */
export const FEATURE_REVIEW_ENABLED = isEnabled(import.meta.env, REVIEW_VARIABLE)

/** True once the tools under review are set to ship. */
export const FEATURE_REVIEW_PUBLISHED = isPublished(import.meta.env, REVIEW_VARIABLE)

export const SESSION_VARIABLE = 'VITE_PUBLISH_SESSION'

/** Schedule and Bankroll Tracker ship together, so they share one variable. */
export const FEATURE_SESSION_ENABLED = isEnabled(import.meta.env, SESSION_VARIABLE)

/** True once the session tools are set to ship. */
export const FEATURE_SESSION_PUBLISHED = isPublished(import.meta.env, SESSION_VARIABLE)
