/**
 * Looking at the local site as though it were the published one.
 *
 * The feature flags are build-time: a page is in `dist` or it is not, and
 * the only honest way to see what shipped is to build it. That is a slow
 * loop for a question you ask twenty times an afternoon — "is this thing
 * hidden yet" — so this is a switch that makes the dev server pretend.
 *
 * It pretends and nothing more. Nothing here changes what a build contains;
 * the flags still decide that. What it does is let every gate in the app ask
 * one extra question — "and are we pretending?" — so a feature held back can
 * be seen to disappear without waiting for a build to prove it.
 *
 * Dead in a build. There is nothing to pretend about once you are there.
 */

import { useSyncExternalStore } from 'react'

const KEY = 'poker-tools:deployed-view'

/** Whether the switch exists at all. Only while developing. */
export const CAN_PREVIEW: boolean = import.meta.env.DEV === true

function read(): boolean {
  if (!CAN_PREVIEW || typeof localStorage === 'undefined') return false
  try {
    return localStorage.getItem(KEY) === 'yes'
  } catch {
    // Private mode. The switch still works, it just will not be remembered.
    return false
  }
}

let pretending = read()
const listeners = new Set<() => void>()

/** Whether we are currently pretending to be the published site. */
export function deployedView(): boolean {
  return CAN_PREVIEW && pretending
}

export function setDeployedView(on: boolean): void {
  if (!CAN_PREVIEW) return
  pretending = on
  try {
    localStorage.setItem(KEY, on ? 'yes' : 'no')
  } catch {
    // Nothing to do; the switch still holds for this page.
  }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The same answer, as a hook, so a component re-renders when it flips. */
export function useDeployedView(): boolean {
  return useSyncExternalStore(subscribe, deployedView, () => false)
}

/**
 * Whether a feature should be on screen right now.
 *
 * `enabled` is what the build decided. This is that, unless we are
 * pretending to be the published site and the feature is one the published
 * site would not have.
 */
export function showing(enabled: boolean, published: boolean, pretend: boolean): boolean {
  if (!enabled) return false
  return pretend ? published : true
}
