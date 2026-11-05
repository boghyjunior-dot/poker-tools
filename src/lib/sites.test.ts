import { describe, expect, it } from 'vitest'
import { isKnownSite, SITES, siteOptions, siteStyle } from './sites'

describe('the rooms the dropdown offers', () => {
  it('is the five asked for', () => {
    expect([...SITES]).toEqual(['GGPoker', 'iPoker', 'Coin Poker', 'PokerStars', '888 Poker'])
  })

  it('gives each of them its own colour', () => {
    const classes = SITES.map((site) => siteStyle(site).className)
    expect(new Set(classes).size).toBe(SITES.length)
  })

  it('paints them the colours they are known by', () => {
    expect(siteStyle('GGPoker').className).toContain('bg-black')
    expect(siteStyle('iPoker').className).toContain('yellow')
    expect(siteStyle('Coin Poker').className).toContain('red')
    expect(siteStyle('PokerStars').className).toContain('blue')
  })
})

describe('matching a room that was written by hand', () => {
  it('ignores case', () => {
    expect(siteStyle('ggpoker').className).toBe(siteStyle('GGPoker').className)
    expect(siteStyle('POKERSTARS').className).toBe(siteStyle('PokerStars').className)
  })

  it('ignores the space people do or do not put in', () => {
    // A pasted lobby is where the spelling drifts; a tag should not go grey
    // over a space bar.
    expect(siteStyle('GG Poker').className).toBe(siteStyle('GGPoker').className)
    expect(siteStyle('CoinPoker').className).toBe(siteStyle('Coin Poker').className)
    expect(siteStyle('  coin   poker  ').className).toBe(siteStyle('Coin Poker').className)
  })

  it('falls back to grey rather than to the wrong room', () => {
    const unknown = siteStyle('partypoker').className
    expect(unknown).toContain('slate')
    for (const site of SITES) {
      expect(siteStyle(site).className, site).not.toBe(unknown)
    }
  })

  it('knows which rooms are on the list', () => {
    expect(isKnownSite('GGPoker')).toBe(true)
    expect(isKnownSite('gg poker')).toBe(false)
    expect(isKnownSite('partypoker')).toBe(false)
    expect(isKnownSite('')).toBe(false)
  })
})

describe('the options a dropdown shows', () => {
  it('is the list when the row is empty or already on it', () => {
    expect(siteOptions('')).toEqual([...SITES])
    expect(siteOptions('PokerStars')).toEqual([...SITES])
  })

  it('keeps a room the list has never heard of rather than losing it', () => {
    // Opening the dropdown on an imported row must not rewrite its site to
    // whichever option happens to be first.
    expect(siteOptions('partypoker')).toEqual(['partypoker', ...SITES])
  })

  it('does not offer the same room twice', () => {
    for (const site of ['', 'GGPoker', 'partypoker', '  ']) {
      const options = siteOptions(site)
      expect(new Set(options).size, site).toBe(options.length)
    }
  })
})
