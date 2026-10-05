import { describe, expect, it } from 'vitest'

import { describeLog, formatLogAt, memoAt, sortLogNewestFirst } from './caseLog'

const base = { id: 'x', body: '', fromStatus: null, toStatus: null }

describe('caseLog', () => {
  it('a status change reads 「A → B」', () => {
    expect(
      describeLog({
        ...base,
        at: '2030-01-01T00:00:00Z',
        kind: 'status',
        fromStatus: 'applied',
        toStatus: 'meeting',
      }),
    ).toBe('応募 → 商談')
  })
  it('an import says what happened in 1 sentence without implementation words such as add-case (SHIG 1, 11)', () => {
    const imp = (body: string) =>
      describeLog({ ...base, at: '2030-01-01T00:00:00Z', kind: 'import', body })
    expect(imp('add-case')).toBe('案件票を取り込んだ')
    expect(imp('取込')).toBe('案件票を取り込んだ')
    expect(imp('取込フォーム')).toBe('案件票を取り込んだ')
    expect(imp('')).toBe('案件票を取り込んだ')
    expect(imp('add-case --update')).toBe('案件票を取り込み直した')
    expect(imp('フォーム')).toBe('案件を登録した')
    expect(imp('import-history')).toBe('過去の記録から取り込んだ')
    expect(imp('手入力の補足')).toBe('案件票を取り込んだ（手入力の補足）')
  })
  it('a memo shows its body', () => {
    expect(
      describeLog({ ...base, at: '2030-01-01T00:00:00Z', kind: 'memo', body: '面談日程' }),
    ).toBe('面談日程')
  })
  it('a memo shows the date only, everything else the date and time', () => {
    expect(formatLogAt({ ...base, at: '2030-01-01T12:00:00+09:00', kind: 'memo' })).toBe(
      '2030/01/01',
    )
    expect(formatLogAt({ ...base, at: '2030-01-01 03:00:00', kind: 'status' })).toBe(
      '2030/01/01 12:00',
    )
  })
  it('newest first (stable by id at the same time)', () => {
    const rows = [
      { ...base, id: 'a', at: '2030-01-01T00:00:00Z', kind: 'memo' as const },
      { ...base, id: 'b', at: '2030-01-02T00:00:00Z', kind: 'memo' as const },
      { ...base, id: 'c', at: '2030-01-01T00:00:00Z', kind: 'memo' as const },
    ]
    expect(sortLogNewestFirst(rows).map((r) => r.id)).toEqual(['b', 'c', 'a'])
  })
  it('the at of a memo is JST noon in UTC notation (the same …Z format as status/import)', () => {
    expect(memoAt('2030-01-01')).toBe('2030-01-01T03:00:00.000Z')
  })
  it('memoAt and the at of status/import share a format, so they sort correctly by date', () => {
    const day = '2030-01-01'
    const nextDay = '2030-01-02'
    const rows = [
      { ...base, id: 'memo-day', at: memoAt(day), kind: 'memo' as const },
      { ...base, id: 'status-day', at: `${day}T05:00:00.000Z`, kind: 'status' as const },
      { ...base, id: 'memo-next-day', at: memoAt(nextDay), kind: 'memo' as const },
    ]
    expect(sortLogNewestFirst(rows).map((r) => r.id)).toEqual([
      'memo-next-day',
      'status-day',
      'memo-day',
    ])
  })
  it('formatLogAt shows the JST date as is for the at of a memo (…Z notation) too', () => {
    expect(formatLogAt({ ...base, at: memoAt('2030-01-05'), kind: 'memo' })).toBe('2030/01/05')
  })
  it('shows an invalid status as 「—」', () => {
    expect(
      describeLog({
        ...base,
        at: '2030-01-01T00:00:00Z',
        kind: 'status',
        fromStatus: 'invalid',
        toStatus: 'meeting',
      }),
    ).toBe('— → 商談')
  })
})
