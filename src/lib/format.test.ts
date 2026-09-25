import { describe, expect, it } from 'vitest'

import { formatDateSlash, formatYen, mapsUrl } from './format'

describe('formatYen', () => {
  it('万円単位に丸め、1万円未満は円、null は「—」', () => {
    expect(formatYen(52_800_000)).toBe('5,280万円')
    expect(formatYen(123_456_789)).toBe('12,346万円')
    expect(formatYen(9_999)).toBe('9,999円')
    expect(formatYen(null)).toBe('—')
  })
})

describe('formatDateSlash', () => {
  it('日付・年月・日時をスラッシュ区切りに直す', () => {
    expect(formatDateSlash('2030-01-05')).toBe('2030/01/05')
    expect(formatDateSlash('2030-01')).toBe('2030/01')
    expect(formatDateSlash('2030-01-05 13:45')).toBe('2030/01/05 13:45')
  })
  it('形が合わない文字列はそのまま、空は空文字', () => {
    expect(formatDateSlash('2030-1-5')).toBe('2030-1-5')
    expect(formatDateSlash('未定')).toBe('未定')
    expect(formatDateSlash(null)).toBe('')
    expect(formatDateSlash(undefined)).toBe('')
  })
})

describe('mapsUrl', () => {
  it('住所を検索 URL にし、括弧書きは外す', () => {
    expect(mapsUrl('東京都港区六本木3-2-1 ビル 24F（駅直結）')).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('東京都港区六本木3-2-1 ビル 24F')}`,
    )
    expect(mapsUrl('六本木')).toContain('query=%E5%85%AD')
  })
  it('括弧だけ・空・null は', () => {
    expect(mapsUrl('（未定）')).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('（未定）')}`,
    )
    expect(mapsUrl('  ')).toBeNull()
    expect(mapsUrl(null)).toBeNull()
  })
})
