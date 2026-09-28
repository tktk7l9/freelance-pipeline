/**
 * An id is plain text in the DB; only its shape (a UUID-like 36 chars) carries meaning.
 * `crypto.randomUUID()` returns RFC 4122 v4, but ids derived from sha256 by the seed import
 * script have the UUID shape without satisfying the v4 version/variant nibbles.
 * zod's `.uuid()` checks those strictly and would reject imported existing rows,
 * so only the shape (8-4-4-4-12 hex) is checked.
 */
export const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export function isIdLike(value: string): boolean {
  return UUID_SHAPE.test(value)
}
