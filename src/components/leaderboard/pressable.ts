import type { KeyboardEvent } from 'react'

/** The scores panel a row or a card opens, for aria-controls. */
export const SCORES_PANEL = 'counted-scores'

/**
 * Make something a button in every way except the element name.
 *
 * A table row cannot be a `<button>` and a card holding a heading should not
 * be one either, but both of these open something when you click them — and
 * a thing that reacts to a mouse and ignores a keyboard is broken for anyone
 * who does not use a mouse, silently, in a way nobody testing with a mouse
 * will ever notice.
 */
export function pressable(onPress: () => void, expanded: boolean) {
  return {
    role: 'button',
    tabIndex: 0,
    'aria-expanded': expanded,
    'aria-controls': SCORES_PANEL,
    onClick: onPress,
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        // Space scrolls the page by default, which would fight the scroll
        // this press is about to do.
        event.preventDefault()
        onPress()
      }
    },
  } as const
}
