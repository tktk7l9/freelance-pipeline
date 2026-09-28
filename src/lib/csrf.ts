/**
 * Origin check for state-changing requests.
 *
 * The Cloudflare Access cookie may have a lax SameSite, so a POST from another site
 * can carry the JWT and pass authentication. Browsers cannot forge Origin, so
 * state-changing requests are accepted only when they come from this app itself.
 *
 * GET / HEAD / OPTIONS only read (or are preflights), so they are not checked.
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function isTrustedMutation({
  method,
  origin,
  requestUrl,
}: {
  method: string
  origin: string | null | undefined
  requestUrl: string
}): boolean {
  if (SAFE_METHODS.has(method.toUpperCase())) return true
  if (!origin || origin.trim() === '') return false

  try {
    return new URL(origin).origin === new URL(requestUrl).origin
  } catch {
    return false
  }
}
