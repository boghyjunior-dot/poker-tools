import type { KeyboardEvent } from 'react'

/**
 * Make something a button in every way except the element name.
 *
 * A table row cannot be a `<button>`, but it opens a window when you click
 * it — and a thing that reacts to a mouse and ignores a keyboard is broken
 * for anyone who does not use a mouse, silently, in a way nobody testing
 * with a mouse will ever notice.
 */
export function pressable(onPress: () => void) {
  return {
    role: 'button',
    tabIndex: 0,
    'aria-haspopup': 'dialog',
    onClick: onPress,
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        // Space scrolls the page by default, which is not what a press means.
        event.preventDefault()
        onPress()
      }
    },
  } as const
}
