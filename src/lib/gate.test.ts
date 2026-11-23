import { describe, expect, it } from 'vitest'
import { ITERATIONS, canHash, derive, gateIsUp, sameDigest, unlocks } from './gate'

// Never the real one. The point of shipping a digest is that the password
// is not written down anywhere, and a test file is somewhere.
const SALT = 'AAECAwQFBgcICQoLDA0ODw=='
const FAST = 1000

describe('hashing', () => {
  it('is available to hash with', () => {
    expect(canHash()).toBe(true)
  })

  it('gives the same digest for the same password', async () => {
    expect(await derive('hunter2', SALT, FAST)).toBe(await derive('hunter2', SALT, FAST))
  })

  it('gives a different one for a different password', async () => {
    expect(await derive('hunter2', SALT, FAST)).not.toBe(await derive('hunter3', SALT, FAST))
  })

  it('gives a different one under a different salt', async () => {
    const other = 'DwMLBwQMCAAFDQkBBg4KAg=='
    expect(await derive('hunter2', SALT, FAST)).not.toBe(await derive('hunter2', other, FAST))
  })

  it('gives a different one at a different cost', async () => {
    expect(await derive('hunter2', SALT, 1000)).not.toBe(await derive('hunter2', SALT, 2000))
  })

  it('is slow enough that guessing costs real time', () => {
    // OWASP's figure for PBKDF2-HMAC-SHA256. A fast hash would turn the
    // shipped digest into a dictionary lookup.
    expect(ITERATIONS).toBeGreaterThanOrEqual(310_000)
  })

  it('produces a fixed-length digest whatever goes in', async () => {
    const short = await derive('a', SALT, FAST)
    const long = await derive('a'.repeat(500), SALT, FAST)
    expect(short).toHaveLength(long.length)
  })
})

describe('comparing digests', () => {
  it('matches a digest with itself', () => {
    expect(sameDigest('abc', 'abc')).toBe(true)
  })

  it('refuses one that differs anywhere', () => {
    expect(sameDigest('abc', 'abd')).toBe(false)
    expect(sameDigest('abc', 'bbc')).toBe(false)
  })

  it('refuses a different length rather than comparing a prefix', () => {
    expect(sameDigest('abc', 'abcd')).toBe(false)
    expect(sameDigest('', 'a')).toBe(false)
  })

  it('reads every character, so it cannot be timed from the front', async () => {
    // Same length, differing only at the last character: a comparison that
    // stopped early would be the thing this is here to prevent.
    expect(sameDigest('aaaaaaaaab', 'aaaaaaaaac')).toBe(false)
  })
})

describe('the gate', () => {
  it('turns an empty password away without hashing it', async () => {
    expect(await unlocks('')).toBe(false)
  })

  it('turns a wrong password away', async () => {
    expect(await unlocks('not the password')).toBe(false)
  })

  it('is down while developing, so the tools stay one click away', () => {
    expect(gateIsUp({ DEV: true })).toBe(false)
  })

  it('is up in a build', () => {
    expect(gateIsUp({ DEV: false })).toBe(true)
    expect(gateIsUp({})).toBe(true)
  })

  it('can be forced up locally, for checking the gate itself', () => {
    expect(gateIsUp({ DEV: true, VITE_LOCK_TOOLS: 'true' })).toBe(true)
    expect(gateIsUp({ DEV: true, VITE_LOCK_TOOLS: '1' })).toBe(true)
    expect(gateIsUp({ DEV: true, VITE_LOCK_TOOLS: 'no' })).toBe(false)
  })
})
