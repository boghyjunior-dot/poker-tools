import { describe, expect, it } from 'vitest'
import { PLAYER_PALETTE, playerColour } from './playerColours'

const roster = ['Ana', 'Bogdan', 'Cristi', 'Dana', 'Emil', 'Flori', 'Gigi', 'Horia']

describe('a colour per player', () => {
  it('gives everybody on the roster a different one', () => {
    const used = roster.map((name) => playerColour(name, roster))
    expect(new Set(used).size).toBe(roster.length)
  })

  it('gives the same player the same colour every time', () => {
    expect(playerColour('Cristi', roster)).toBe(playerColour('Cristi', roster))
  })

  it('does not move a colour because somebody else had a good night', () => {
    // Roster position, not form: a line that changed colour between visits
    // would be unreadable.
    const reordered = [...roster]
    expect(playerColour('Ana', reordered)).toBe(PLAYER_PALETTE[0])
    expect(playerColour('Horia', reordered)).toBe(PLAYER_PALETTE[7])
  })

  it('still colours somebody who is not on the roster', () => {
    const guest = playerColour('Visitor', roster)
    expect(PLAYER_PALETTE).toContain(guest)
  })

  it('keeps going past the end of the palette rather than running out', () => {
    const big = Array.from({ length: 30 }, (_, i) => `P${i}`)
    for (const name of big) expect(PLAYER_PALETTE).toContain(playerColour(name, big))
  })

  it('has a palette of distinct colours', () => {
    expect(new Set(PLAYER_PALETTE).size).toBe(PLAYER_PALETTE.length)
    expect(PLAYER_PALETTE.length).toBeGreaterThanOrEqual(12)
  })
})
