import { describe, expect, it } from 'vitest'
import { showing } from './deployedView'

describe('whether a feature is on screen', () => {
  it('shows a published feature either way', () => {
    expect(showing(true, true, false)).toBe(true)
    expect(showing(true, true, true)).toBe(true)
  })

  it('shows a held-back feature locally', () => {
    expect(showing(true, false, false)).toBe(true)
  })

  it('hides a held-back feature once you pretend to be the live site', () => {
    // The whole point of the switch: seeing the thing disappear without
    // waiting for a build to prove it.
    expect(showing(true, false, true)).toBe(false)
  })

  it('shows nothing the build left out, pretending or not', () => {
    expect(showing(false, false, false)).toBe(false)
    expect(showing(false, true, true)).toBe(false)
  })
})
