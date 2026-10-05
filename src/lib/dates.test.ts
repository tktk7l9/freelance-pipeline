import { describe, expect, it } from 'vitest'

import { parseDateInput, parseMonthInput, parseMonthOrDateInput } from './dates'

describe('parseDateInput', () => {
  it('passes the stored format through as is', () => {
    expect(parseDateInput('2026-07-30')).toBe('2026-07-30')
  })

  it('reads values without zero padding', () => {
    expect(parseDateInput('2026-7-3')).toBe('2026-07-03')
  })

  it('reads slash and dot separators', () => {
    expect(parseDateInput('2026/07/30')).toBe('2026-07-30')
    expect(parseDateInput('2026/7/30')).toBe('2026-07-30')
    expect(parseDateInput('2026.7.30')).toBe('2026-07-30')
  })

  it('reads 8 digits without separators', () => {
    expect(parseDateInput('20260730')).toBe('2026-07-30')
  })

  it('reads Japanese notation', () => {
    expect(parseDateInput('2026年7月30日')).toBe('2026-07-30')
    expect(parseDateInput('2026年07月30日')).toBe('2026-07-30')
    // Also accept half-typed input without the trailing "日"
    expect(parseDateInput('2026年7月30')).toBe('2026-07-30')
  })

  it('trims surrounding whitespace', () => {
    expect(parseDateInput('  2026-07-30  ')).toBe('2026-07-30')
  })

  it('rejects dates that do not exist', () => {
    expect(parseDateInput('2026-02-30')).toBeNull()
    expect(parseDateInput('2026-13-01')).toBeNull()
    expect(parseDateInput('2026-00-10')).toBeNull()
    expect(parseDateInput('2026-07-00')).toBeNull()
    expect(parseDateInput('20260231')).toBeNull()
  })

  it('decides leap years per year', () => {
    expect(parseDateInput('2024-02-29')).toBe('2024-02-29')
    expect(parseDateInput('2026-02-29')).toBeNull()
    // Years divisible by 100 but not by 400 are common years
    expect(parseDateInput('2100-02-29')).toBeNull()
    expect(parseDateInput('2000-02-29')).toBe('2000-02-29')
  })

  it('rejects values without a year (does not assume this year)', () => {
    expect(parseDateInput('7/30')).toBeNull()
    expect(parseDateInput('07-30')).toBeNull()
  })

  it('null for anything unreadable', () => {
    expect(parseDateInput('令和8年7月30日')).toBeNull()
    expect(parseDateInput('来週')).toBeNull()
    expect(parseDateInput('2026-07-30 10:00')).toBeNull()
    expect(parseDateInput('')).toBeNull()
    expect(parseDateInput('   ')).toBeNull()
    expect(parseDateInput(null)).toBeNull()
    expect(parseDateInput(undefined)).toBeNull()
  })
})

describe('parseMonthOrDateInput', () => {
  it('keeps a date as is and turns a year-month into YYYY-MM', () => {
    expect(parseMonthOrDateInput('2030-01-05')).toBe('2030-01-05')
    expect(parseMonthOrDateInput('2030/1/5')).toBe('2030-01-05')
    expect(parseMonthOrDateInput('2030-01')).toBe('2030-01')
    expect(parseMonthOrDateInput('2030/1')).toBe('2030-01')
    expect(parseMonthOrDateInput('2030.11')).toBe('2030-11')
    expect(parseMonthOrDateInput('2030年11月')).toBe('2030-11')
  })
  it('accepts full-width characters too', () => {
    expect(parseMonthOrDateInput('２０３０／１１')).toBe('2030-11')
    expect(parseDateInput('２０３０／１／５')).toBe('2030-01-05')
  })
  it('null for an out-of-range month, unreadable input or empty', () => {
    expect(parseMonthOrDateInput('2030-13')).toBeNull()
    expect(parseMonthOrDateInput('2030/0')).toBeNull()
    expect(parseMonthOrDateInput('来月')).toBeNull()
    expect(parseMonthOrDateInput('')).toBeNull()
    expect(parseMonthOrDateInput(null)).toBeNull()
  })
})

describe('parseMonthInput', () => {
  it('accepts a year-month with /, - or full-width and normalizes to YYYY-MM (SHIG 50)', () => {
    expect(parseMonthInput('2030/11')).toBe('2030-11')
    expect(parseMonthInput('２０３０／１１')).toBe('2030-11')
    expect(parseMonthInput('2030-11')).toBe('2030-11')
    expect(parseMonthInput('2030年1月')).toBe('2030-01')
  })
  it('rounds a full date down to its month; null when unreadable', () => {
    expect(parseMonthInput('2030/11/16')).toBe('2030-11')
    expect(parseMonthInput('来月')).toBeNull()
    expect(parseMonthInput('')).toBeNull()
  })
})
