import { describe, expect, it } from 'vitest'

import { dayOfWeek, equinoxDay, holidayName, holidaysOfYear, nthMondayOf } from './holidays'

describe('dayOfWeek', () => {
  it('returns the weekday (0 = Sunday)', () => {
    expect(dayOfWeek('2026-05-31')).toBe(0)
    expect(dayOfWeek('2026-06-01')).toBe(1)
    expect(dayOfWeek('2026-07-31')).toBe(5)
  })
  it('null for an invalid date', () => {
    expect(dayOfWeek('だめ')).toBeNull()
    expect(dayOfWeek('2026-00-10')).toBeNull()
    expect(dayOfWeek('2026-13-01')).toBeNull()
    expect(dayOfWeek('2026-01-00')).toBeNull()
    expect(dayOfWeek('2026-01-32')).toBeNull()
  })
})

describe('nthMondayOf / equinoxDay', () => {
  it('Happy Monday holidays and the spring and autumn equinoxes', () => {
    expect(nthMondayOf(2026, 1, 2)).toBe(12)
    expect(nthMondayOf(2025, 1, 2)).toBe(13)
    expect(nthMondayOf(2026, 6, 1)).toBe(1)
    expect(equinoxDay(2026, 'spring')).toBe(20)
    expect(equinoxDay(2026, 'autumn')).toBe(23)
  })
})

describe('holidaysOfYear / holidayName', () => {
  it('the holidays of 2026 (including substitute holidays (振替休日))', () => {
    const h = holidaysOfYear(2026)
    expect(h.get('2026-01-01')).toBe('元日')
    expect(h.get('2026-05-06')).toBe('振替休日') // 5/3 Constitution Memorial Day falls on a Sunday
    expect(h.get('2026-09-21')).toBe('敬老の日')
    expect(h.get('2026-09-22')).toBe('国民の休日')
    expect(h.get('2026-09-23')).toBe('秋分の日')
    expect(h.get('2026-10-12')).toBe('スポーツの日')
  })
  it('returns the holiday name, and null for a weekday or an invalid date', () => {
    expect(holidayName('2026-02-11')).toBe('建国記念の日')
    expect(holidayName('2026-02-12')).toBeNull()
    expect(holidayName('invalid')).toBeNull()
  })
})
