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
  it('tax-excluded rates are multiplied by 1.1 and rounded; tax-included stay as is', () => {
    expect(toIncl(1_120_000, 'excl')).toBe(1_232_000)
    expect(toIncl(1_050_000, 'incl')).toBe(1_050_000)
    expect(toIncl(954_545, 'excl')).toBe(1_050_000)
  })

  it('tax-excluded is divided by 1.1 and rounded', () => {
    expect(toExcl(1_320_000)).toBe(1_200_000)
    expect(toExcl(1_050_000)).toBe(954_545)
  })

  it('base hours: midpoint of the settlement range, then either bound, then the route default', () => {
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

  it('hourly rate (tax excluded) = tax-excluded rate / base hours', () => {
    expect(hourlyExcl(924_000, 160)).toBe(5_250)
    expect(hourlyExcl(792_000, 168)).toBe(4_286)
  })

  it('the 万円 display has at most 1 decimal place', () => {
    expect(formatMan(1_320_000)).toBe('132万')
    expect(formatMan(1_232_000)).toBe('123.2万')
    expect(formatMan(954_545)).toBe('95.5万')
    expect(formatMan(null)).toBe('—')
  })

  it('median', () => {
    expect(median([])).toBeNull()
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 2, 3])).toBe(2.5)
  })

  it('2-line rate display: the upper bound only without min, otherwise min〜max', () => {
    expect(formatRateLines(1_320_000, null)).toEqual({
      main: '132万',
      sub: '(税抜 120万)',
    })
    expect(formatRateLines(1_232_000, 1_100_000)).toEqual({
      main: '110万〜123.2万',
      sub: '(税抜 100万〜112万)',
    })
  })

  it('2-line hourly display: yen/h on top, base hours below', () => {
    expect(formatHourlyLines(1_320_000, 160)).toEqual({
      main: '7,500円/h',
      sub: '(÷160h)',
    })
  })

  it('per-route summary: routes with 0 cases are left out', () => {
    expect(statsByRoute([])).toEqual([])
  })

  it('per-route summary: computes count and median and returns them in ROUTES order (independent of input order)', () => {
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
