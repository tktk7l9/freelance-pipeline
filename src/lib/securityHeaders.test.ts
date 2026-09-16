import { describe, expect, it } from 'vitest'

import { SECURITY_HEADERS, applySecurityHeaders, securityHeadersInit } from './securityHeaders'

describe('applySecurityHeaders', () => {
  it('クリックジャッキングと MIME スニッフィングを止めるヘッダを載せる', () => {
    const headers = applySecurityHeaders(new Headers())
    expect(headers.get('x-frame-options')).toBe('DENY')
    expect(headers.get('x-content-type-options')).toBe('nosniff')
    expect(headers.get('referrer-policy')).toBe('no-referrer')
    expect(headers.get('content-security-policy')).toContain("frame-ancestors 'none'")
    expect(headers.get('permissions-policy')).toContain('camera=()')
    expect(headers.get('cross-origin-opener-policy')).toBe('same-origin')
  })

  it('img-src は self と data: だけ許可する（外部 img は許可しない）', () => {
    const headers = applySecurityHeaders(new Headers())
    const csp = headers.get('content-security-policy')
    expect(csp).toContain("img-src 'self' data:")
  })

  it('geolocation は閉じる', () => {
    const headers = applySecurityHeaders(new Headers())
    expect(headers.get('permissions-policy')).toContain('geolocation=()')
  })

  it('同じ名前があれば上書きする', () => {
    const headers = new Headers({ 'x-frame-options': 'SAMEORIGIN' })
    applySecurityHeaders(headers)
    expect(headers.get('x-frame-options')).toBe(SECURITY_HEADERS['x-frame-options'])
  })
})

describe('securityHeadersInit', () => {
  it('content-type など既存の値は残す', () => {
    const headers = securityHeadersInit({ 'content-type': 'text/plain; charset=utf-8' })
    expect(headers.get('content-type')).toBe('text/plain; charset=utf-8')
    expect(headers.get('x-content-type-options')).toBe('nosniff')
  })
})
