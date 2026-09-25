import { describe, expect, it } from 'vitest'

import {
  ageBandOf,
  ageOn,
  binColor,
  binFor,
  binLabel,
  marketDataSchema,
  positionInBand,
  raisePacePerYear,
} from './market'

const rows = [
  {
    band: '30代前半',
    cells: [
      { bin: 500_000, pct: 6.4 },
      { bin: 600_000, pct: 13.9 },
      { bin: 700_000, pct: 28.4 },
      { bin: 800_000, pct: 26.7 },
      { bin: 900_000, pct: 15.3 },
      { bin: 1_000_000, pct: 4.5 },
      { bin: 1_100_000, pct: 2.1 },
    ],
  },
]
const bins = [
  200_000, 300_000, 400_000, 500_000, 600_000, 700_000, 800_000, 900_000, 1_000_000, 1_100_000,
  1_200_000,
]

describe('ageOn / ageBandOf', () => {
  it('誕生日の前後で満年齢が変わる', () => {
    expect(ageOn('1992-07-19', '2026-07-18')).toBe(33)
    expect(ageOn('1992-07-19', '2026-07-19')).toBe(34)
    expect(ageOn('1992-07-19', '2026-09-25')).toBe(34)
  })
  it('年齢帯', () => {
    expect(ageBandOf(22)).toBe('20代前半')
    expect(ageBandOf(19)).toBe('20代前半')
    expect(ageBandOf(29)).toBe('20代後半')
    expect(ageBandOf(34)).toBe('30代前半')
    expect(ageBandOf(35)).toBe('30代後半')
    expect(ageBandOf(59)).toBe('50代後半')
    expect(ageBandOf(60)).toBe('60代以上')
  })
})

describe('binFor / positionInBand', () => {
  it('単価は「以下」の最小の上限に入る。超えたら最大の帯', () => {
    expect(binFor(bins, 900_000)).toBe(900_000)
    expect(binFor(bins, 900_001)).toBe(1_000_000)
    expect(binFor(bins, 5_000_000)).toBe(1_200_000)
    expect(binFor([700_000, 500_000], 100)).toBe(500_000)
  })
  it('自分より上・同じ・下の割合と最頻帯', () => {
    const p = positionInBand(rows, bins, '30代前半', 900_000)
    expect(p).toEqual({
      band: '30代前半',
      bin: 900_000,
      abovePct: 6.6,
      samePct: 15.3,
      belowPct: 75.4,
      modeBin: 700_000,
    })
  })
  it('行はあるが帯が空なら最頻帯は null', () => {
    const p = positionInBand([{ band: '60代以上', cells: [] }], bins, '60代以上', 900_000)
    expect(p?.modeBin).toBeNull()
    expect(p?.abovePct).toBe(0)
  })
  it('年齢帯の行が無ければ null', () => {
    expect(positionInBand(rows, bins, '60代以上', 900_000)).toBeNull()
  })
})

describe('raisePacePerYear', () => {
  it('最初と最後の差を年率にする', () => {
    expect(
      raisePacePerYear([
        { ym: '2025-03', rate: 780_000 },
        { ym: '2025-08', rate: 830_000 },
        { ym: '2026-04', rate: 900_000 },
      ]),
    ).toBe(Math.round((120_000 / 13) * 12))
  })
  it('点が 1 つ、または 1 年未満なら null', () => {
    expect(raisePacePerYear([{ ym: '2026-01', rate: 1 }])).toBeNull()
    expect(
      raisePacePerYear([
        { ym: '2026-01', rate: 800_000 },
        { ym: '2026-11', rate: 900_000 },
      ]),
    ).toBeNull()
  })
})

describe('binLabel / binColor / schema', () => {
  it('ラベルと色。未知の帯は灰色', () => {
    expect(binLabel(900_000)).toBe('〜90万')
    expect(binLabel(1_200_000)).toBe('〜120万')
    expect(binColor(900_000)).toContain('indigo')
    expect(binColor(1_300_000)).toContain('gray-4')
  })
  it('スキーマは形の崩れた JSON を弾く', () => {
    const ok = marketDataSchema.safeParse({
      jobs: { open: 1, newWeek: 0, ratio: 0.5, growthPct: 10, maxRate: 1, byDays: [], remote: [] },
      talent: { annualRaiseAvg: 1, bins: [500_000], ageRate: [], ageShare: [], renewal: [] },
    })
    expect(ok.success).toBe(true)
    expect(marketDataSchema.safeParse({ jobs: {}, talent: {} }).success).toBe(false)
  })
})
