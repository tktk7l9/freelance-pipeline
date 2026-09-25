import { describe, expect, it } from 'vitest'

import {
  addDays,
  composeStartsAt,
  dateKey,
  formatDateWithWeekday,
  formatEventTime,
  splitStartsAt,
  toJstIso,
  visibleRange,
} from './calendar'

describe('dateKey / composeStartsAt / splitStartsAt', () => {
  it('終日は日付だけ、時刻ありは +09:00 付きで往復する', () => {
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
  it('スラッシュ区切り＋曜日', () => {
    expect(formatDateWithWeekday('2026-09-20')).toBe('2026/09/20（日）')
    expect(formatDateWithWeekday('2026-09-16')).toBe('2026/09/16（水）')
  })
  it('読めない文字列はそのまま返す', () => {
    expect(formatDateWithWeekday('invalid')).toBe('invalid')
  })
})

describe('addDays', () => {
  it('月・年・うるう年をまたぐ', () => {
    expect(addDays('2026-09-16', 27)).toBe('2026-10-13')
    expect(addDays('2026-12-20', 27)).toBe('2027-01-16')
    expect(addDays('2026-09-16', -1)).toBe('2026-09-15')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
  })
})

describe('toJstIso', () => {
  it('UTC の瞬間を +09:00 表記に直す', () => {
    expect(toJstIso(new Date('2030-01-05T23:30:00Z'))).toBe('2030-01-06T08:30:00+09:00')
  })
})

describe('visibleRange', () => {
  it('日表示はその日だけ', () => {
    expect(visibleRange('2026-09-16', 'day')).toEqual({ from: '2026-09-16', to: '2026-09-16' })
  })
  it('週表示は月曜始まりで 7 日', () => {
    // 2026-09-16 は水曜
    expect(visibleRange('2026-09-16', 'week')).toEqual({ from: '2026-09-14', to: '2026-09-20' })
    // 日曜は前の月曜から
    expect(visibleRange('2026-09-20', 'week')).toEqual({ from: '2026-09-14', to: '2026-09-20' })
  })
  it('月表示は前後 7 日を含める', () => {
    expect(visibleRange('2026-02-10', 'month')).toEqual({ from: '2026-01-25', to: '2026-03-07' })
  })
  it('週表示で読めない日付は月曜始まりの計算を諦めずに返す', () => {
    expect(visibleRange('invalid', 'week').from).toEqual(expect.any(String))
  })
})

describe('formatEventTime', () => {
  it('終日／開始–終了／開始のみ／時刻なし', () => {
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
