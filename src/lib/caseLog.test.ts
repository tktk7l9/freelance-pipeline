import { describe, expect, it } from 'vitest'

import { describeLog, formatLogAt, memoAt, sortLogNewestFirst } from './caseLog'

const base = { id: 'x', body: '', fromStatus: null, toStatus: null }

describe('caseLog', () => {
  it('ステータス変更は「A → B」', () => {
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
  it('取込・メモは本文', () => {
    expect(
      describeLog({ ...base, at: '2030-01-01T00:00:00Z', kind: 'import', body: 'add-case' }),
    ).toBe('取込: add-case')
    expect(
      describeLog({ ...base, at: '2030-01-01T00:00:00Z', kind: 'memo', body: '面談日程' }),
    ).toBe('面談日程')
  })
  it('メモは日付だけ、それ以外は日時', () => {
    expect(formatLogAt({ ...base, at: '2030-01-01T12:00:00+09:00', kind: 'memo' })).toBe(
      '2030-01-01',
    )
    expect(formatLogAt({ ...base, at: '2030-01-01 03:00:00', kind: 'status' })).toBe(
      '2030-01-01 12:00',
    )
  })
  it('新しい順（同時刻は id で安定）', () => {
    const rows = [
      { ...base, id: 'a', at: '2030-01-01T00:00:00Z', kind: 'memo' as const },
      { ...base, id: 'b', at: '2030-01-02T00:00:00Z', kind: 'memo' as const },
      { ...base, id: 'c', at: '2030-01-01T00:00:00Z', kind: 'memo' as const },
    ]
    expect(sortLogNewestFirst(rows).map((r) => r.id)).toEqual(['b', 'c', 'a'])
  })
  it('メモの at は JST 正午を UTC 表記（status/import の …Z と同じ書式）で返す', () => {
    expect(memoAt('2030-01-01')).toBe('2030-01-01T03:00:00.000Z')
  })
  it('memoAt と status/import の at が同じ書式なので日付順に正しく並ぶ', () => {
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
  it('formatLogAt はメモの at（…Z 表記）でも JST の日付をそのまま表示する', () => {
    expect(formatLogAt({ ...base, at: memoAt('2030-01-05'), kind: 'memo' })).toBe('2030-01-05')
  })
  it('不正なステータスは「—」に表示', () => {
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
