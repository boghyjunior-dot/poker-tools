import { describe, expect, it } from 'vitest'
import { avatarTone, initials, profileFor, profilesFor, type PlayerCard } from './playerProfiles'

const cards: PlayerCard[] = [
  { name: 'Snapper', description: 'I snap call ya', avatar: './players/snapper.webp' },
  { name: 'Mihai P.', description: 'Micro grinder.' },
]

describe('initials', () => {
  it('takes the ends of a name with parts', () => {
    expect(initials('Mihai P.')).toBe('MP')
    expect(initials('Ana Maria Radu')).toBe('AR')
  })

  it('keeps two letters of a single-word name rather than one lonely capital', () => {
    expect(initials('Snapper')).toBe('SN')
  })

  it('reads through punctuation and odd spacing', () => {
    expect(initials('  vlad_n  ')).toBe('VN')
    expect(initials('jean-luc p')).toBe('JP')
  })

  it('has something to show for a name that is not one', () => {
    expect(initials('')).toBe('?')
    expect(initials('   ')).toBe('?')
    expect(initials('!!!')).toBe('?')
  })
})

describe('the colour a name gets', () => {
  it('is the same every time, so a face stays recognisable', () => {
    expect(avatarTone('Snapper')).toEqual(avatarTone('Snapper'))
  })

  it('does not hand everybody the same one', () => {
    const tones = new Set(
      ['Snapper', 'Mihai P.', 'Ana R.', 'Costel V.', 'Raul T.'].map(
        (name) => avatarTone(name).background,
      ),
    )
    expect(tones.size).toBeGreaterThan(3)
  })

  it('is a colour', () => {
    expect(avatarTone('Snapper').background).toMatch(/^hsl\(\d+ \d+% \d+%\)$/)
    expect(avatarTone('').text).toMatch(/^hsl\(/)
  })
})

describe('looking a player up', () => {
  it('finds the card somebody wrote', () => {
    expect(profileFor('Snapper', cards)).toMatchObject({
      description: 'I snap call ya',
      avatar: './players/snapper.webp',
    })
  })

  it('gives a player with no profile a blank one rather than nothing', () => {
    // Nobody is kept out of the standings for not having written a bio.
    expect(profileFor('Nobody', cards)).toEqual({ name: 'Nobody', description: '' })
  })

  it('keeps the order the standings put them in', () => {
    expect(profilesFor(['Mihai P.', 'Nobody', 'Snapper'], cards).map((card) => card.name)).toEqual([
      'Mihai P.',
      'Nobody',
      'Snapper',
    ])
  })
})
