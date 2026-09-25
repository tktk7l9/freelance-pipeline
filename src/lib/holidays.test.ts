import { describe, expect, it } from 'vitest'

import { dayOfWeek, equinoxDay, holidayName, holidaysOfYear, nthMondayOf } from './holidays'

describe('dayOfWeek', () => {
  it('曜日を返す（0=日曜）', () => {
    expect(dayOfWeek('2026-05-31')).toBe(0)
    expect(dayOfWeek('2026-06-01')).toBe(1)
    expect(dayOfWeek('2026-07-31')).toBe(5)
  })
  it('不正な日付は null', () => {
    expect(dayOfWeek('だめ')).toBeNull()
    expect(dayOfWeek('2026-00-10')).toBeNull()
    expect(dayOfWeek('2026-13-01')).toBeNull()
    expect(dayOfWeek('2026-01-00')).toBeNull()
    expect(dayOfWeek('2026-01-32')).toBeNull()
  })
})

describe('nthMondayOf / equinoxDay', () => {
  it('ハッピーマンデーと春分・秋分', () => {
    expect(nthMondayOf(2026, 1, 2)).toBe(12)
    expect(nthMondayOf(2025, 1, 2)).toBe(13)
    expect(nthMondayOf(2026, 6, 1)).toBe(1)
    expect(equinoxDay(2026, 'spring')).toBe(20)
    expect(equinoxDay(2026, 'autumn')).toBe(23)
  })
})

describe('holidaysOfYear / holidayName', () => {
  it('2026 年の祝日（振替休日を含む）', () => {
    const h = holidaysOfYear(2026)
    expect(h.get('2026-01-01')).toBe('元日')
    expect(h.get('2026-05-06')).toBe('振替休日') // 5/3 憲法記念日が日曜
    expect(h.get('2026-09-21')).toBe('敬老の日')
    expect(h.get('2026-09-22')).toBe('国民の休日')
    expect(h.get('2026-09-23')).toBe('秋分の日')
    expect(h.get('2026-10-12')).toBe('スポーツの日')
  })
  it('祝日名を返し、平日・不正な日付は null', () => {
    expect(holidayName('2026-02-11')).toBe('建国記念の日')
    expect(holidayName('2026-02-12')).toBeNull()
    expect(holidayName('invalid')).toBeNull()
  })
})
