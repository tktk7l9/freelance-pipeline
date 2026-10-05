import { describe, expect, it } from 'vitest'

import { distinctOnsiteNote, formatDateSlash, formatYen, mapsUrl, remoteSummary } from './format'

describe('formatYen', () => {
  it('rounds to units of 10,000 yen (万円), yen below 10,000, and 「—」 for null', () => {
    expect(formatYen(52_800_000)).toBe('5,280万円')
    expect(formatYen(123_456_789)).toBe('12,346万円')
    expect(formatYen(9_999)).toBe('9,999円')
    expect(formatYen(null)).toBe('—')
  })
})

describe('formatDateSlash', () => {
  it('converts a date, a year-month and a date-time to slash separators', () => {
    expect(formatDateSlash('2030-01-05')).toBe('2030/01/05')
    expect(formatDateSlash('2030-01')).toBe('2030/01')
    expect(formatDateSlash('2030-01-05 13:45')).toBe('2030/01/05 13:45')
  })
  it('returns a string of the wrong shape as is, and an empty one as an empty string', () => {
    expect(formatDateSlash('2030-1-5')).toBe('2030-1-5')
    expect(formatDateSlash('未定')).toBe('未定')
    expect(formatDateSlash(null)).toBe('')
    expect(formatDateSlash(undefined)).toBe('')
  })
})

describe('mapsUrl', () => {
  it('turns an address into a search URL and drops parenthesized notes', () => {
    expect(mapsUrl('東京都港区六本木3-2-1 ビル 24F（駅直結）')).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('東京都港区六本木3-2-1 ビル 24F')}`,
    )
    expect(mapsUrl('六本木')).toContain('query=%E5%85%AD')
  })
  it('keeps a parenthesized-only address as the query; blank and null give null', () => {
    expect(mapsUrl('（未定）')).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('（未定）')}`,
    )
    expect(mapsUrl('  ')).toBeNull()
    expect(mapsUrl(null)).toBeNull()
  })
})

describe('remoteSummary / distinctOnsiteNote', () => {
  it('does not repeat the on-site detail when it is the same word as the type (SHIG 1)', () => {
    expect(remoteSummary('onsite', '常駐')).toBe('常駐')
    expect(remoteSummary('onsite', ' 常駐 ')).toBe('常駐')
    expect(distinctOnsiteNote('onsite', '常駐')).toBeNull()
  })
  it('adds a different word in parentheses; the type alone when empty', () => {
    expect(remoteSummary('partial', '月4回出社')).toBe('一部出社（月4回出社）')
    expect(distinctOnsiteNote('partial', '月4回出社')).toBe('月4回出社')
    expect(remoteSummary('full', null)).toBe('フルリモート')
    expect(distinctOnsiteNote('full', '')).toBeNull()
  })
})
