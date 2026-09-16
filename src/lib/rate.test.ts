import { describe, expect, it } from 'vitest'

import { baseHours, formatMan, hourlyExcl, median, toExcl, toIncl } from './rate'

describe('rate', () => {
  it('税抜表示は ×1.1 して丸める。税込表示はそのまま', () => {
    expect(toIncl(1_120_000, 'excl')).toBe(1_232_000)
    expect(toIncl(1_050_000, 'incl')).toBe(1_050_000)
    expect(toIncl(954_545, 'excl')).toBe(1_050_000)
  })

  it('税抜は ÷1.1 して丸める', () => {
    expect(toExcl(1_320_000)).toBe(1_200_000)
    expect(toExcl(1_050_000)).toBe(954_545)
  })

  it('基準時間は精算幅の中点 → 片方 → 経路既定 の順', () => {
    expect(baseHours({ route: 'findy', settlementMinH: 140, settlementMaxH: 180 })).toEqual({
      hours: 160,
      source: 'range',
    })
    expect(baseHours({ route: 'levtech', settlementMinH: 150, settlementMaxH: null })).toEqual({
      hours: 150,
      source: 'min',
    })
    expect(baseHours({ route: 'levtech', settlementMinH: null, settlementMaxH: 180 })).toEqual({
      hours: 180,
      source: 'max',
    })
    expect(baseHours({ route: 'findy', settlementMinH: null, settlementMaxH: null })).toEqual({
      hours: 160,
      source: 'route',
    })
    expect(baseHours({ route: 'levtech', settlementMinH: null, settlementMaxH: null }).hours).toBe(
      168,
    )
    expect(baseHours({ route: 'direct', settlementMinH: null, settlementMaxH: null }).hours).toBe(
      160,
    )
  })

  it('時給（税抜）= 税抜 ÷ 基準時間', () => {
    expect(hourlyExcl(924_000, 160)).toBe(5_250)
    expect(hourlyExcl(792_000, 168)).toBe(4_286)
  })

  it('万円表示は小数 1 桁まで', () => {
    expect(formatMan(1_320_000)).toBe('132万')
    expect(formatMan(1_232_000)).toBe('123.2万')
    expect(formatMan(954_545)).toBe('95.5万')
    expect(formatMan(null)).toBe('—')
  })

  it('中央値', () => {
    expect(median([])).toBeNull()
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 2, 3])).toBe(2.5)
  })
})
