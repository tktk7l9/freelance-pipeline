import { describe, expect, it } from 'vitest'

import {
  addDays,
  composeStartsAt,
  dateKey,
  formatDateJa,
  formatDateWithWeekday,
  formatEventTime,
  splitStartsAt,
  toJstIso,
  visibleRange,
} from './calendar'

describe('dateKey / composeStartsAt / splitStartsAt', () => {
  it('all-day round-trips as a date only, timed as +09:00', () => {
    expect(composeStartsAt('2030-01-05', null)).toBe('2030-01-05')
    expect(composeStartsAt('2030-01-05', '13:00')).toBe('2030-01-05T13:00:00+09:00')
    expect(dateKey('2030-01-05T13:00:00+09:00')).toBe('2030-01-05')
    expect(dateKey('2030-01-05')).toBe('2030-01-05')
    expect(splitStartsAt('2030-01-05T13:00:00+09:00')).toEqual({
      date: '2030-01-05',
      time: '13:00',
    })
    expect(splitStartsAt('2030-01-05')).toEqual({ date: '2030-01-05', time: null })
  })
})

describe('formatDateWithWeekday', () => {
  it('slash separated with the weekday', () => {
    expect(formatDateWithWeekday('2026-09-20')).toBe('2026/09/20（日）')
    expect(formatDateWithWeekday('2026-09-16')).toBe('2026/09/16（水）')
  })
  it('returns an unreadable string as is', () => {
    expect(formatDateWithWeekday('invalid')).toBe('invalid')
  })
})

describe('addDays', () => {
  it('crosses months, years and leap years', () => {
    expect(addDays('2026-09-16', 27)).toBe('2026-10-13')
    expect(addDays('2026-12-20', 27)).toBe('2027-01-16')
    expect(addDays('2026-09-16', -1)).toBe('2026-09-15')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
  })
})

describe('toJstIso', () => {
  it('converts a UTC instant to +09:00 notation', () => {
    expect(toJstIso(new Date('2030-01-05T23:30:00Z'))).toBe('2030-01-06T08:30:00+09:00')
  })
})

describe('visibleRange', () => {
  it('the day view is that day only', () => {
    expect(visibleRange('2026-09-16', 'day')).toEqual({ from: '2026-09-16', to: '2026-09-16' })
  })
  it('the week view is 7 days starting on Monday', () => {
    // 2026-09-16 is a Wednesday
    expect(visibleRange('2026-09-16', 'week')).toEqual({ from: '2026-09-14', to: '2026-09-20' })
    // Sunday starts from the previous Monday
    expect(visibleRange('2026-09-20', 'week')).toEqual({ from: '2026-09-14', to: '2026-09-20' })
  })
  it('the month view includes 7 days before and after', () => {
    expect(visibleRange('2026-02-10', 'month')).toEqual({ from: '2026-01-25', to: '2026-03-07' })
  })
  it('the week view still returns a range for an unreadable date instead of giving up', () => {
    expect(visibleRange('invalid', 'week').from).toEqual(expect.any(String))
  })
})

describe('formatEventTime', () => {
  it('all day / start-end / start only / no time', () => {
    expect(formatEventTime({ startsAt: '2030-01-05', endsAt: null, allDay: true })).toBe('終日')
    expect(
      formatEventTime({
        startsAt: '2030-01-05T13:00:00+09:00',
        endsAt: '2030-01-05T15:30:00+09:00',
        allDay: false,
      }),
    ).toBe('13:00–15:30')
    expect(
      formatEventTime({ startsAt: '2030-01-05T13:00:00+09:00', endsAt: null, allDay: false }),
    ).toBe('13:00')
    expect(formatEventTime({ startsAt: '2030-01-05', endsAt: null, allDay: false })).toBe('')
  })
})

describe('formatDateJa', () => {
  it('reads aloud as 「2026年9月1日」 (replaces the English order of the Mantine default, SHIG 94)', () => {
    expect(formatDateJa('2026-09-01')).toBe('2026年9月1日')
    expect(formatDateJa('2026-12-31 00:00:00')).toBe('2026年12月31日')
    expect(formatDateJa('bad')).toBe('bad')
  })
})
