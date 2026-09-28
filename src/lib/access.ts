import { jwtVerify, type JWTVerifyGetKey } from 'jose'

/**
 * Cloudflare Access authentication logic (pure part).
 *
 * It does not depend on bindings or the network, so swapping the key set makes it
 * testable including signature verification. env and JWKS fetching live in src/server/auth.ts.
 *
 * Design principle: when in doubt, always fall to "deny" (fail closed).
 */

export const ACCESS_JWT_HEADER = 'cf-access-jwt-assertion'

export type Identity = {
  email: string
  /** access = the real thing via Cloudflare Access / dev = local development stand-in */
  source: 'access' | 'dev'
}

export type AuthFailureReason =
  'missing_token' | 'invalid_token' | 'missing_email' | 'not_allowed' | 'misconfigured'

export type AuthResult = { ok: true; identity: Identity } | { ok: false; reason: AuthFailureReason }

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

/**
 * Normalizes a comma- or newline-separated list of allowed emails.
 * If there is nothing but empty strings, the result is an empty array = "allow no one".
 */
export function parseAllowlist(raw: string | undefined | null): string[] {
  if (!raw) return []
  const seen = new Set<string>()
  for (const part of raw.split(/[,\n]/)) {
    const email = normalizeEmail(part)
    if (email) seen.add(email)
  }
  return [...seen]
}

/** An empty allowlist denies everyone (never empty = allow everyone). */
export function isEmailAllowed(email: string, allowlist: readonly string[]): boolean {
  if (allowlist.length === 0) return false
  return allowlist.includes(normalizeEmail(email))
}

/**
 * Whether the local-development stand-in identity may be used.
 * Never enable it in production. An unset or unknown ENVIRONMENT is treated as production and denied.
 */
export function devIdentityAllowed(environment: string | undefined | null): boolean {
  return environment === 'development' || environment === 'test'
}

/** Extracts the Access JWT from the request headers. */
export function extractAccessToken(headers: Headers): string | null {
  const token = headers.get(ACCESS_JWT_HEADER)
  return token && token.trim() !== '' ? token : null
}

export type AuthenticateOptions = {
  token: string | null
  /** jose key-set resolver (createRemoteJWKSet in production, createLocalJWKSet in tests) */
  keySet: JWTVerifyGetKey
  /** https://<team>.cloudflareaccess.com */
  issuer: string
  /** AUD tag of the Access application */
  audience: string
  allowlist: readonly string[]
}

/**
 * Verifies the Access JWT and decides whether the user is allowed.
 * jose verifies signature, issuer, audience, and expiry.
 */
export async function authenticateAccessJwt({
  token,
  keySet,
  issuer,
  audience,
  allowlist,
}: AuthenticateOptions): Promise<AuthResult> {
  if (!issuer || !audience) return { ok: false, reason: 'misconfigured' }
  if (!token) return { ok: false, reason: 'missing_token' }

  let payload: Record<string, unknown>
  try {
    const verified = await jwtVerify(token, keySet, { issuer, audience })
    payload = verified.payload as Record<string, unknown>
  } catch {
    return { ok: false, reason: 'invalid_token' }
  }

  const rawEmail = payload.email
  if (typeof rawEmail !== 'string' || rawEmail.trim() === '') {
    return { ok: false, reason: 'missing_email' }
  }

  const email = normalizeEmail(rawEmail)
  if (!isEmailAllowed(email, allowlist)) {
    return { ok: false, reason: 'not_allowed' }
  }

  return { ok: true, identity: { email, source: 'access' } }
}

/**
 * Resolves the local-development stand-in identity.
 * Always fails in production, or when the stand-in email is not in the allowlist.
 */
export function resolveDevIdentity({
  environment,
  devEmail,
  allowlist,
}: {
  environment: string | undefined | null
  devEmail: string | undefined | null
  allowlist: readonly string[]
}): AuthResult {
  if (!devIdentityAllowed(environment)) return { ok: false, reason: 'missing_token' }
  if (!devEmail || devEmail.trim() === '') return { ok: false, reason: 'missing_email' }

  const email = normalizeEmail(devEmail)
  if (!isEmailAllowed(email, allowlist)) return { ok: false, reason: 'not_allowed' }

  return { ok: true, identity: { email, source: 'dev' } }
}

/** Turns a failure reason into user-facing text. Does not leak internal details. */
export function describeFailure(reason: AuthFailureReason): string {
  switch (reason) {
    case 'not_allowed':
      return 'このアカウントには利用権限がありません。'
    case 'misconfigured':
      return 'アクセス制御が未設定です。管理者に連絡してください。'
    default:
      return 'ログインが必要です。'
  }
}
