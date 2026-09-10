import { describe, expect, it } from 'vitest'
import { isEnabled, isPublished, ROADMAP_VARIABLE } from './featureFlags'

const VAR = 'VITE_PUBLISH_ROADMAP'

describe('local-only pages', () => {
  it('shows while developing, whatever the variable says', () => {
    expect(isEnabled({ DEV: true }, VAR)).toBe(true)
    expect(isEnabled({ DEV: true, [VAR]: 'false' }, VAR)).toBe(true)
  })

  it('hides in a build until the variable is set', () => {
    expect(isEnabled({ DEV: false }, VAR)).toBe(false)
    expect(isEnabled({}, VAR)).toBe(false)
    expect(isEnabled({ DEV: false, [VAR]: 'true' }, VAR)).toBe(true)
  })

  it('accepts the usual ways of writing yes, since env vars are strings', () => {
    for (const yes of ['true', 'TRUE', ' true ', '1', 'yes', 'Yes']) {
      expect(isEnabled({ DEV: false, [VAR]: yes }, VAR)).toBe(true)
    }
  })

  it('treats anything else as off rather than guessing', () => {
    for (const no of ['false', '0', 'no', '', 'maybe', undefined, null, 2]) {
      expect(isEnabled({ DEV: false, [VAR]: no }, VAR)).toBe(false)
    }
  })

  it('does not let one page turn another on', () => {
    expect(isEnabled({ DEV: false, VITE_PUBLISH_SOMETHING_ELSE: 'true' }, VAR)).toBe(false)
  })
})

describe('published state', () => {
  it('is separate from being visible, so the dev server can say "local only"', () => {
    // The whole point: visible locally, and honest about not being live.
    expect(isEnabled({ DEV: true }, VAR)).toBe(true)
    expect(isPublished({ DEV: true }, VAR)).toBe(false)
  })

  it('turns on only with the variable, in dev or in a build', () => {
    expect(isPublished({ DEV: true, [VAR]: 'true' }, VAR)).toBe(true)
    expect(isPublished({ DEV: false, [VAR]: 'true' }, VAR)).toBe(true)
    expect(isPublished({ DEV: false }, VAR)).toBe(false)
  })
})

describe('the roadmap flag', () => {
  it('is named after the page it gates', () => {
    expect(ROADMAP_VARIABLE).toBe('VITE_PUBLISH_ROADMAP')
    // Vite only exposes variables with this prefix to the client.
    expect(ROADMAP_VARIABLE.startsWith('VITE_')).toBe(true)
  })
})
