/**
 * Browser-facing defensive headers added to every response.
 *
 * Even behind Cloudflare Access, the app itself stops clickjacking and MIME sniffing.
 * CSP stays within what does not break Vite / Mantine inline code
 * (only `frame-ancestors`, `object-src`, and `base-uri`). There are no maps or YouTube,
 * so external images are not allowed. `geolocation` is closed too.
 */

export const SECURITY_HEADERS = {
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'cross-origin-opener-policy': 'same-origin',
  'content-security-policy':
    "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; img-src 'self' data:; connect-src 'self'",
} as const

/** Sets them on existing Headers, overwriting. */
export function applySecurityHeaders(headers: Headers): Headers {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value)
  }
  return headers
}

/** For merging into the headers of `new Response`. */
export function securityHeadersInit(extra?: HeadersInit): Headers {
  const headers = new Headers(extra)
  return applySecurityHeaders(headers)
}
