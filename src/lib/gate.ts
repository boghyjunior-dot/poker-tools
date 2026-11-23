/**
 * A password in front of two of the tools on the published site.
 *
 * Be clear about what this is. The site is a folder of static files with
 * nothing behind it, so there is no server to check a password and no way to
 * withhold a page until one is given: everything the gate guards is already
 * in the bundle the browser downloaded. Somebody who opens the dev tools and
 * means it will get past this.
 *
 * What it does do is keep the tools from being used, linked and indexed by
 * anyone who has not been told the password, and it does that without the
 * password being discoverable from the source. Only a salted PBKDF2 digest
 * is shipped, at the iteration count OWASP suggests, so working backwards
 * from it costs real time per guess rather than a dictionary lookup.
 *
 * It is a lock on a door, in a building made of glass. That is the most a
 * static site can offer, and it is worth having for what it is.
 */

/** Random, fixed, and public — a salt is not a secret, it defeats rainbow tables. */
const SALT = 'LDYCdlK5PI48vHj9k38AIQ=='

/** The digest of the password. Nothing here reveals the password itself. */
const DIGEST = 'F7NlgNzb37p0ymVyHDRKMJsJ7F+XxArwttr8ZVnfbFU='

/** OWASP's figure for PBKDF2-HMAC-SHA256: slow enough to make guessing dear. */
export const ITERATIONS = 310_000

const KEY_BITS = 256

function bytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64)
  const out = new Uint8Array(new ArrayBuffer(binary.length))
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i)
  return out
}

function base64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}

/** Whether this browser can hash at all. WebCrypto needs a secure context. */
export function canHash(): boolean {
  return typeof crypto !== 'undefined' && typeof crypto.subtle?.deriveBits === 'function'
}

/**
 * PBKDF2-HMAC-SHA256, exported so a test can build its own pair.
 *
 * Tests must never carry the real password, which is the whole point of
 * shipping a digest — so they derive their own and check the mechanism.
 */
export async function derive(password: string, salt: string, iterations = ITERATIONS): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: bytes(salt), iterations, hash: 'SHA-256' },
    key,
    KEY_BITS,
  )
  return base64(bits)
}

/**
 * Compare without leaking how far along the two matched.
 *
 * Timing is not a realistic attack on a gate whose contents are already in
 * the bundle, but a comparison that stops early is the kind of thing that
 * gets copied into somewhere it does matter.
 */
export function sameDigest(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** Whether the password given is the one the digest was made from. */
export async function unlocks(password: string): Promise<boolean> {
  if (!password || !canHash()) return false
  try {
    return sameDigest(await derive(password, SALT), DIGEST)
  } catch {
    // A browser that cannot hash cannot be let through: the gate fails shut.
    return false
  }
}

export const GATE_KEY = 'poker-tools:unlocked'

/**
 * Whether the gate is up at all.
 *
 * Off while developing, so the tools stay one click away, and on in any
 * build. VITE_LOCK_TOOLS forces it on locally for checking the gate itself.
 */
export function gateIsUp(env: { DEV?: boolean; [key: string]: unknown } = import.meta.env): boolean {
  const forced = env.VITE_LOCK_TOOLS
  if (typeof forced === 'string' && ['true', '1', 'yes'].includes(forced.trim().toLowerCase())) {
    return true
  }
  return env.DEV !== true
}
