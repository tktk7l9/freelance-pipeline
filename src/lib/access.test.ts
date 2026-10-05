import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair, type JWTVerifyGetKey } from 'jose'
import { beforeAll, describe, expect, it } from 'vitest'

import {
  ACCESS_JWT_HEADER,
  authenticateAccessJwt,
  describeFailure,
  devIdentityAllowed,
  extractAccessToken,
  isEmailAllowed,
  normalizeEmail,
  parseAllowlist,
  resolveDevIdentity,
} from './access'

const ISSUER = 'https://example.cloudflareaccess.com'
const AUDIENCE = 'aud-tag-1234567890'
const ALLOWLIST = ['owner@example.com']

let signingKey: CryptoKey
let keySet: JWTVerifyGetKey
/** A key not in the legitimate key set. Used to build invalid-signature cases. */
let foreignKey: CryptoKey

beforeAll(async () => {
  const real = await generateKeyPair('RS256', { extractable: true })
  const foreign = await generateKeyPair('RS256', { extractable: true })

  signingKey = real.privateKey
  foreignKey = foreign.privateKey

  const jwk = await exportJWK(real.publicKey)
  keySet = createLocalJWKSet({ keys: [{ ...jwk, kid: 'real', alg: 'RS256' }] })
})

type TokenOptions = {
  email?: unknown
  issuer?: string
  audience?: string
  key?: CryptoKey
  expiresIn?: string
}

async function mintToken(options: TokenOptions = {}): Promise<string> {
  const payload: Record<string, unknown> = {}
  if (options.email !== undefined) payload.email = options.email

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256', kid: 'real' })
    .setIssuer(options.issuer ?? ISSUER)
    .setAudience(options.audience ?? AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(options.expiresIn ?? '1h')
    .sign(options.key ?? signingKey)
}

describe('normalizeEmail', () => {
  it('trims surrounding whitespace and lowercases', () => {
    expect(normalizeEmail('  Owner@Example.COM ')).toBe('owner@example.com')
  })
})

describe('parseAllowlist', () => {
  it('empty array when unset', () => {
    expect(parseAllowlist(undefined)).toEqual([])
    expect(parseAllowlist(null)).toEqual([])
    expect(parseAllowlist('')).toEqual([])
  })

  it('splits mixed commas and newlines, normalizes and removes duplicates', () => {
    expect(parseAllowlist('A@x.com, b@x.com\n a@x.com \n\n')).toEqual(['a@x.com', 'b@x.com'])
  })
})

describe('isEmailAllowed', () => {
  it('allows nobody when the allowlist is empty', () => {
    expect(isEmailAllowed('owner@example.com', [])).toBe(false)
  })

  it('ignores case differences', () => {
    expect(isEmailAllowed('OWNER@example.com', ALLOWLIST)).toBe(true)
  })

  it('rejects an email not in the list', () => {
    expect(isEmailAllowed('someone@example.com', ALLOWLIST)).toBe(false)
  })
})

describe('devIdentityAllowed', () => {
  it.each([
    ['development', true],
    ['test', true],
    ['production', false],
    ['staging', false],
  ])('ENVIRONMENT=%s → %s', (environment, expected) => {
    expect(devIdentityAllowed(environment)).toBe(expected)
  })

  it('treats unset as production and rejects', () => {
    expect(devIdentityAllowed(undefined)).toBe(false)
    expect(devIdentityAllowed(null)).toBe(false)
  })
})

describe('extractAccessToken', () => {
  it('null when the header is missing', () => {
    expect(extractAccessToken(new Headers())).toBeNull()
  })

  it('treats an empty string as null', () => {
    expect(extractAccessToken(new Headers({ [ACCESS_JWT_HEADER]: '   ' }))).toBeNull()
  })

  it('returns the value as is when present', () => {
    expect(extractAccessToken(new Headers({ [ACCESS_JWT_HEADER]: 'abc' }))).toBe('abc')
  })
})

describe('authenticateAccessJwt', () => {
  const base = {
    keySet: undefined as unknown as JWTVerifyGetKey,
    issuer: ISSUER,
    audience: AUDIENCE,
    allowlist: ALLOWLIST,
  }

  it('misconfigured when issuer is unset', async () => {
    const result = await authenticateAccessJwt({ ...base, keySet, issuer: '', token: 'x' })
    expect(result).toEqual({ ok: false, reason: 'misconfigured' })
  })

  it('misconfigured when audience is unset', async () => {
    const result = await authenticateAccessJwt({ ...base, keySet, audience: '', token: 'x' })
    expect(result).toEqual({ ok: false, reason: 'misconfigured' })
  })

  it('missing_token when there is no JWT', async () => {
    const result = await authenticateAccessJwt({ ...base, keySet, token: null })
    expect(result).toEqual({ ok: false, reason: 'missing_token' })
  })

  it('invalid_token when not signed by the genuine key', async () => {
    const token = await mintToken({ email: 'owner@example.com', key: foreignKey })
    const result = await authenticateAccessJwt({ ...base, keySet, token })
    expect(result).toEqual({ ok: false, reason: 'invalid_token' })
  })

  it('invalid_token when the audience differs', async () => {
    const token = await mintToken({ email: 'owner@example.com', audience: 'other-aud' })
    const result = await authenticateAccessJwt({ ...base, keySet, token })
    expect(result).toEqual({ ok: false, reason: 'invalid_token' })
  })

  it('invalid_token when the issuer differs', async () => {
    const token = await mintToken({
      email: 'owner@example.com',
      issuer: 'https://evil.example.com',
    })
    const result = await authenticateAccessJwt({ ...base, keySet, token })
    expect(result).toEqual({ ok: false, reason: 'invalid_token' })
  })

  it('invalid_token when expired', async () => {
    const token = await mintToken({ email: 'owner@example.com', expiresIn: '-1h' })
    const result = await authenticateAccessJwt({ ...base, keySet, token })
    expect(result).toEqual({ ok: false, reason: 'invalid_token' })
  })

  it('missing_email when there is no email', async () => {
    const token = await mintToken({})
    const result = await authenticateAccessJwt({ ...base, keySet, token })
    expect(result).toEqual({ ok: false, reason: 'missing_email' })
  })

  it('missing_email when email is not a string', async () => {
    const token = await mintToken({ email: 12345 })
    const result = await authenticateAccessJwt({ ...base, keySet, token })
    expect(result).toEqual({ ok: false, reason: 'missing_email' })
  })

  it('missing_email when email is an empty string', async () => {
    const token = await mintToken({ email: '   ' })
    const result = await authenticateAccessJwt({ ...base, keySet, token })
    expect(result).toEqual({ ok: false, reason: 'missing_email' })
  })

  it('not_allowed when the signature is valid but the email is outside the allowlist', async () => {
    const token = await mintToken({ email: 'stranger@example.com' })
    const result = await authenticateAccessJwt({ ...base, keySet, token })
    expect(result).toEqual({ ok: false, reason: 'not_allowed' })
  })

  it('authenticates a genuine JWT whose email is in the allowlist', async () => {
    const token = await mintToken({ email: 'Owner@Example.com' })
    const result = await authenticateAccessJwt({ ...base, keySet, token })
    expect(result).toEqual({ ok: true, identity: { email: 'owner@example.com', source: 'access' } })
  })
})

describe('resolveDevIdentity', () => {
  it('never allows the fallback identity in production', () => {
    const result = resolveDevIdentity({
      environment: 'production',
      devEmail: 'owner@example.com',
      allowlist: ALLOWLIST,
    })
    expect(result).toEqual({ ok: false, reason: 'missing_token' })
  })

  it('missing_email when the fallback email is unset', () => {
    expect(
      resolveDevIdentity({ environment: 'development', devEmail: undefined, allowlist: ALLOWLIST }),
    ).toEqual({ ok: false, reason: 'missing_email' })
    expect(
      resolveDevIdentity({ environment: 'development', devEmail: '  ', allowlist: ALLOWLIST }),
    ).toEqual({ ok: false, reason: 'missing_email' })
  })

  it('not_allowed when the fallback email is outside the allowlist', () => {
    expect(
      resolveDevIdentity({
        environment: 'development',
        devEmail: 'stranger@example.com',
        allowlist: ALLOWLIST,
      }),
    ).toEqual({ ok: false, reason: 'not_allowed' })
  })

  it('authenticates as dev in development when the email is in the allowlist', () => {
    expect(
      resolveDevIdentity({
        environment: 'development',
        devEmail: 'Owner@Example.com',
        allowlist: ALLOWLIST,
      }),
    ).toEqual({ ok: true, identity: { email: 'owner@example.com', source: 'dev' } })
  })
})

describe('describeFailure', () => {
  it('returns wording that does not leak internals', () => {
    expect(describeFailure('not_allowed')).toBe('このアカウントには利用権限がありません。')
    expect(describeFailure('misconfigured')).toBe(
      'アクセス制御が未設定です。管理者に連絡してください。',
    )
    expect(describeFailure('missing_token')).toBe('ログインが必要です。')
    expect(describeFailure('invalid_token')).toBe('ログインが必要です。')
    expect(describeFailure('missing_email')).toBe('ログインが必要です。')
  })
})
