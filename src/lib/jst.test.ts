import { describe, expect, it } from 'vitest'

import { formatJst, parseToUtcMs, toJstDateKey } from './jst'

describe('parseToUtcMs', () => {
  it('converts the D1 space-separated form (no offset = UTC) to UTC milliseconds', () => {
    expect(parseToUtcMs('2030-01-05 23:30:00')).toBe(Date.UTC(2030, 0, 5, 23, 30, 0))
  })

  it('converts ISO with Z to UTC milliseconds', () => {
    expect(parseToUtcMs('2030-01-05T23:30:00Z')).toBe(Date.UTC(2030, 0, 5, 23, 30, 0))
  })

  it('converts ISO with a +09:00 offset to UTC milliseconds (the same instant)', () => {
    expect(parseToUtcMs('2030-01-06T08:30:00+09:00')).toBe(Date.UTC(2030, 0, 5, 23, 30, 0))
  })

  it('treats ISO with a T separator and no offset as UTC too', () => {
    expect(parseToUtcMs('2030-01-05T23:30:00')).toBe(Date.UTC(2030, 0, 5, 23, 30, 0))
  })

  it('null for a string of the wrong format', () => {
    expect(parseToUtcMs('not-a-date')).toBeNull()
    expect(parseToUtcMs('')).toBeNull()
  })

  it('converts Z with fractional seconds (the new Date().toISOString() form) to UTC milliseconds', () => {
    expect(parseToUtcMs('2030-01-05T17:04:28.333Z')).toBe(Date.UTC(2030, 0, 5, 17, 4, 28, 333))
  })

  it('a +09:00 offset with fractional seconds is the same instant too', () => {
    expect(parseToUtcMs('2030-01-06T02:04:28.333+09:00')).toBe(Date.UTC(2030, 0, 5, 17, 4, 28, 333))
  })

  it('also reads the D1 space-separated form (no offset = UTC) with fractional seconds', () => {
    expect(parseToUtcMs('2030-01-05 17:04:28.100')).toBe(Date.UTC(2030, 0, 5, 17, 4, 28, 100))
  })
})

describe('formatJst', () => {
  it('converts the D1 space-separated form (no offset = UTC) to JST', () => {
    expect(formatJst('2030-01-05 23:30:00')).toBe('2030-01-06 08:30')
  })

  it('ISO with Z gives the same result as D1', () => {
    expect(formatJst('2030-01-05T23:30:00Z')).toBe('2030-01-06 08:30')
  })

  it('also reads ISO with a +09:00 offset', () => {
    expect(formatJst('2030-01-06T08:30:00+09:00')).toBe('2030-01-06 08:30')
  })

  it('treats ISO with a T separator and no offset as UTC too', () => {
    expect(formatJst('2030-01-05T23:30:00')).toBe('2030-01-06 08:30')
  })

  it('withTime: false gives the date only', () => {
    expect(formatJst('2030-01-05T23:30:00Z', { withTime: false })).toBe('2030-01-06')
  })

  it('explicit withTime: true is the same as the default', () => {
    expect(formatJst('2030-01-05T23:30:00Z', { withTime: true })).toBe('2030-01-06 08:30')
  })

  it('returns an unparseable string as is', () => {
    expect(formatJst('not-a-date')).toBe('not-a-date')
    expect(formatJst('')).toBe('')
  })

  it('a date-only string without time (watchedOn etc.) passes through as is with withTime: false', () => {
    expect(formatJst('2030-01-05', { withTime: false })).toBe('2030-01-05')
  })
})

describe('toJstDateKey', () => {
  it('returns the JST date key', () => {
    expect(toJstDateKey('2030-01-05T23:30:00Z')).toBe('2030-01-06')
  })

  it('returns an unparseable string as is', () => {
    expect(toJstDateKey('invalid')).toBe('invalid')
  })
})
