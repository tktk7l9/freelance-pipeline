import { describe, expect, it } from 'vitest'

import {
  baseHours,
  formatHourlyLines,
  formatMan,
  formatRateLines,
  hourlyExcl,
  median,
  statsByRoute,
  toExcl,
  toIncl,
} from './rate'

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

  it('単価の 2 行表示: min が無ければ上限のみ、あれば min〜max', () => {
    expect(formatRateLines(1_320_000, null)).toEqual({
      main: '132万',
      sub: '(税抜 120万)',
    })
    expect(formatRateLines(1_232_000, 1_100_000)).toEqual({
      main: '110万〜123.2万',
      sub: '(税抜 100万〜112万)',
    })
  })

  it('時給の 2 行表示: 上段=円/h、下段=基準時間', () => {
    expect(formatHourlyLines(1_320_000, 160)).toEqual({
      main: '7,500円/h',
      sub: '(÷160h)',
    })
  })

  it('経路別集計: 件数 0 の経路は含めない', () => {
    expect(statsByRoute([])).toEqual([])
  })

  it('経路別集計: 件数・中央値を計算し、ROUTES の順で返す（入力順に依らない）', () => {
    const cases = [
      { route: 'other' as const, monthlyMaxIncl: 500_000 },
      { route: 'levtech' as const, monthlyMaxIncl: 1_000_000 },
      { route: 'levtech' as const, monthlyMaxIncl: 1_200_000 },
      { route: 'levtech' as const, monthlyMaxIncl: 1_400_000 },
      { route: 'other' as const, monthlyMaxIncl: 700_000 },
    ]
    expect(statsByRoute(cases)).toEqual([
      { route: 'levtech', activeCount: 3, medianIncl: 1_200_000 },
      { route: 'other', activeCount: 2, medianIncl: 600_000 },
    ])
  })
})
