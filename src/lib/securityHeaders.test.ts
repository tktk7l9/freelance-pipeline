import { describe, expect, it } from 'vitest'

import { SECURITY_HEADERS, applySecurityHeaders, securityHeadersInit } from './securityHeaders'

describe('applySecurityHeaders', () => {
  it('sets the headers that stop clickjacking and MIME sniffing', () => {
    const headers = applySecurityHeaders(new Headers())
    expect(headers.get('x-frame-options')).toBe('DENY')
    expect(headers.get('x-content-type-options')).toBe('nosniff')
    expect(headers.get('referrer-policy')).toBe('no-referrer')
    expect(headers.get('content-security-policy')).toContain("frame-ancestors 'none'")
    expect(headers.get('permissions-policy')).toContain('camera=()')
    expect(headers.get('cross-origin-opener-policy')).toBe('same-origin')
  })

  it('img-src allows only self and data: (no external images)', () => {
    const headers = applySecurityHeaders(new Headers())
    const csp = headers.get('content-security-policy')
    expect(csp).toContain("img-src 'self' data:")
  })

  it('geolocation is closed', () => {
    const headers = applySecurityHeaders(new Headers())
    expect(headers.get('permissions-policy')).toContain('geolocation=()')
  })

  it('responses with personal data are never stored by browser or shared caches', () => {
    const headers = applySecurityHeaders(new Headers({ 'cache-control': 'public, max-age=3600' }))
    expect(headers.get('cache-control')).toBe('no-store')
  })

  it('forces HTTPS for a year including subdomains', () => {
    const headers = applySecurityHeaders(new Headers())
    expect(headers.get('strict-transport-security')).toBe('max-age=31536000; includeSubDomains')
  })

  it('forms may only submit to this origin', () => {
    const headers = applySecurityHeaders(new Headers())
    expect(headers.get('content-security-policy')).toContain("form-action 'self'")
  })

  it('overwrites a header with the same name', () => {
    const headers = new Headers({ 'x-frame-options': 'SAMEORIGIN' })
    applySecurityHeaders(headers)
    expect(headers.get('x-frame-options')).toBe(SECURITY_HEADERS['x-frame-options'])
  })
})

describe('securityHeadersInit', () => {
  it('keeps existing values such as content-type', () => {
    const headers = securityHeadersInit({ 'content-type': 'text/plain; charset=utf-8' })
    expect(headers.get('content-type')).toBe('text/plain; charset=utf-8')
    expect(headers.get('x-content-type-options')).toBe('nosniff')
  })
})
