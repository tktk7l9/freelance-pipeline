import { describe, expect, it } from 'vitest'

import {
  DEFAULT_THRESHOLDS,
  buildCompareRows,
  fitMark,
  onsitePerMonth,
  parseAxes,
  parseThresholds,
  type CompareCase,
} from './compare'

const a: CompareCase = {
  id: 'a',
  company: '甲社',
  title: 'A案件',
  route: 'findy',
  monthlyMaxIncl: 1_320_000,
  monthlyMinIncl: null,
  settlementMinH: 140,
  settlementMaxH: 180,
  remoteType: 'full',
  onsiteNote: null,
  startDate: '2030-01',
  daysPerWeek: '週5',
  supplyChain: null,
  paymentSiteDays: null,
  mustSkills: ['TypeScript'],
  niceSkills: [],
  fitScores: [2, 1, 0],
}
const b: CompareCase = {
  ...a,
  id: 'b',
  company: '乙社',
  title: 'B案件',
  route: 'levtech',
  monthlyMaxIncl: 850_000,
  settlementMinH: null,
  settlementMaxH: null,
  remoteType: 'partial',
  onsiteNote: '月4回出社',
  startDate: '2030-03',
  fitScores: null,
}

describe('compare', () => {
  it('閾値と軸の parse（壊れた値は既定）', () => {
    expect(parseThresholds(null)).toEqual(DEFAULT_THRESHOLDS)
    expect(parseThresholds('{bad')).toEqual(DEFAULT_THRESHOLDS)
    expect(
      parseThresholds(JSON.stringify({ minMonthlyIncl: 900_000, targetStart: '2030-02' })),
    ).toEqual({
      ...DEFAULT_THRESHOLDS,
      minMonthlyIncl: 900_000,
      targetStart: '2030-02',
    })
    expect(parseAxes(null)).toEqual([])
    expect(parseAxes(JSON.stringify(['a', 1, 'b']))).toEqual(['a', 'b'])
    expect(parseAxes('{bad')).toEqual([])
    // JSON が配列でない場合
    expect(parseAxes(JSON.stringify({ a: 'b' }))).toEqual([])
    // JSON がオブジェクトではない場合
    expect(parseThresholds(JSON.stringify('not-object'))).toEqual(DEFAULT_THRESHOLDS)
    // targetStart が不正な形式
    expect(parseThresholds(JSON.stringify({ targetStart: '2030-2' }))).toEqual(DEFAULT_THRESHOLDS)
    expect(parseThresholds(JSON.stringify({ targetStart: 'invalid' }))).toEqual(DEFAULT_THRESHOLDS)
    // 無限大は null になる
    expect(parseThresholds(JSON.stringify({ minMonthlyIncl: Number.POSITIVE_INFINITY }))).toEqual(
      DEFAULT_THRESHOLDS,
    )
  })

  it('出社回数', () => {
    expect(onsitePerMonth('full', null)).toBe(0)
    expect(onsitePerMonth('partial', '月4回出社')).toBe(4)
    expect(onsitePerMonth('partial', '初日のみ')).toBeNull()
    expect(onsitePerMonth('onsite', null)).toBe(Number.POSITIVE_INFINITY)
  })

  it('○△×', () => {
    expect(fitMark(2)).toBe('○')
    expect(fitMark(1)).toBe('△')
    expect(fitMark(0)).toBe('×')
    expect(fitMark(null)).toBe('—')
  })

  it('行列化と閾値ハイライト', () => {
    const rows = buildCompareRows(
      [a, b],
      {
        minMonthlyIncl: 1_000_000,
        minHourlyExcl: 6_000,
        targetStart: '2030-02',
        maxOnsitePerMonth: 1,
      },
      ['軸1', '軸2', '軸3'],
    )
    const row = (key: string) => rows.find((r) => r.key === key)!
    expect(row('rate').cells.map((c) => c.bad)).toEqual([false, true])
    expect(row('hourly').cells[0].text).toBe('7,500円/h')
    expect(row('hourly').cells[0].sub).toBe('(÷160h)')
    expect(row('hourly').cells[1].bad).toBe(true)
    expect(row('start').cells.map((c) => c.bad)).toEqual([false, true])
    expect(row('onsite').cells.map((c) => c.bad)).toEqual([false, true])
    expect(row('axis:0').cells.map((c) => c.text)).toEqual(['○', '—'])
    expect(rows.map((r) => r.key)).toEqual([
      'rate',
      'hourly',
      'settlement',
      'remote',
      'onsite',
      'start',
      'days',
      'supplyChain',
      'paymentSite',
      'must',
      'nice',
      'axis:0',
      'axis:1',
      'axis:2',
    ])
  })

  it('閾値が無ければ何も赤くしない', () => {
    const rows = buildCompareRows([b], DEFAULT_THRESHOLDS, [])
    expect(rows.every((r) => r.cells.every((c) => !c.bad))).toBe(true)
  })

  it('月次最小値・支払サイト・最低要件の表示', () => {
    const c: CompareCase = {
      ...a,
      monthlyMinIncl: 1_200_000,
      paymentSiteDays: 30,
      mustSkills: [],
      niceSkills: ['React'],
    }
    const rows = buildCompareRows([c], DEFAULT_THRESHOLDS, [])
    const row = (key: string) => rows.find((r) => r.key === key)!
    expect(row('rate').cells[0].text).toBe('120万〜132万')
    expect(row('paymentSite').cells[0].text).toBe('30日')
    expect(row('must').cells[0].text).toBe('—')
    expect(row('nice').cells[0].text).toBe('React')
  })

  it('onsiteNote なしで remoteType partial', () => {
    const c: CompareCase = {
      ...b,
      onsiteNote: null,
    }
    const rows = buildCompareRows([c], DEFAULT_THRESHOLDS, [])
    const row = (key: string) => rows.find((r) => r.key === key)!
    expect(row('onsite').cells[0].text).toBe('—')
  })
})
