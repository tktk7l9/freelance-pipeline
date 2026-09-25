import { describe, expect, it } from 'vitest'

import {
  forecastYear,
  latestOfficerMonthly,
  monthlyBreakdown,
  summarizeYear,
  yearsOf,
  ym,
  yoyPercent,
  type LedgerLike,
} from './ledger'

const rows: LedgerLike[] = [
  { id: '1', yearMonth: '2030-01', kind: 'freelance', amount: 880_000 },
  { id: '2', yearMonth: '2030-01', kind: 'officer', amount: 300_000 },
  { id: '3', yearMonth: '2030-02', kind: 'freelance', amount: 880_000 },
  { id: '4', yearMonth: '2030-02', kind: 'officer', amount: 300_000 },
  { id: '5', yearMonth: '2030-02', kind: 'other_income', amount: 50_000 },
  { id: '6', yearMonth: '2030-03', kind: 'income_tax', amount: 200_000 },
  { id: '7', yearMonth: '2030-06', kind: 'resident_tax', amount: 100_000 },
  { id: '8', yearMonth: '2030-12', kind: 'expense', amount: 150_000 },
  { id: '9', yearMonth: '2029-12', kind: 'freelance', amount: 700_000 },
]

describe('summarizeYear', () => {
  it('売上（税込/税抜）・収入合計・支出合計・手取り', () => {
    const s = summarizeYear(rows, 2030)
    expect(s.salesIncl).toBe(1_760_000)
    expect(s.salesExcl).toBe(1_600_000)
    expect(s.officer).toBe(600_000)
    expect(s.otherIncome).toBe(50_000)
    expect(s.incomeTotal).toBe(2_410_000)
    expect(s.tax).toBe(300_000)
    expect(s.expense).toBe(150_000)
    expect(s.outgoTotal).toBe(450_000)
    expect(s.net).toBe(1_960_000)
    expect(s.monthsWithIncome).toBe(2)
  })
  it('データの無い年は全部 0', () => {
    const s = summarizeYear(rows, 2020)
    expect(s.incomeTotal).toBe(0)
    expect(s.net).toBe(0)
    expect(s.monthsWithIncome).toBe(0)
  })
})

describe('monthlyBreakdown', () => {
  it('12 か月ぶん並び、無い月は 0', () => {
    const m = monthlyBreakdown(rows, 2030)
    expect(m).toHaveLength(12)
    expect(m[0]).toEqual({
      month: 1,
      yearMonth: '2030-01',
      freelance: 880_000,
      officer: 300_000,
      otherIncome: 0,
      income: 1_180_000,
      outgo: 0,
    })
    expect(m[1]?.income).toBe(1_230_000)
    expect(m[2]?.outgo).toBe(200_000)
    expect(m[3]?.income).toBe(0)
  })
})

describe('yearsOf / ym / yoyPercent / latestOfficerMonthly', () => {
  it('データのある年＋今年を降順', () => {
    expect(yearsOf(rows, 2031)).toEqual([2031, 2030, 2029])
    expect(yearsOf([], 2030)).toEqual([2030])
    expect(ym(2030, 3)).toBe('2030-03')
  })
  it('前年比は小数 1 桁、前年 0 なら null', () => {
    expect(yoyPercent(110, 100)).toBe(10)
    expect(yoyPercent(95, 100)).toBe(-5)
    expect(yoyPercent(1, 3)).toBe(-66.7)
    expect(yoyPercent(100, 0)).toBeNull()
  })
  it('直近の役員報酬（並び順に依らず年月が最大の行）', () => {
    expect(latestOfficerMonthly(rows)).toBe(300_000)
    expect(latestOfficerMonthly([])).toBe(0)
    expect(
      latestOfficerMonthly([
        { id: 'a', yearMonth: '2030-05', kind: 'officer', amount: 350_000 },
        { id: 'b', yearMonth: '2030-01', kind: 'officer', amount: 300_000 },
      ]),
    ).toBe(350_000)
  })
})

describe('forecastYear', () => {
  it('今月以降で記録の無い月にだけ見込みを足す', () => {
    const f = forecastYear(rows, 2030, '2030-11', 900_000, 300_000)
    // 11・12 月に freelance 900,000 と officer 300,000 を足す
    expect(f.salesIncl).toBe(1_760_000 + 900_000 * 2)
    expect(f.officer).toBe(600_000 + 300_000 * 2)
    expect(f.incomeTotal).toBe(f.salesIncl + f.officer + 50_000)
    expect(f.filledMonths).toBe(2)
  })
  it('既に記録のある月は埋めない。過去の空白も埋めない', () => {
    const f = forecastYear(rows, 2030, '2030-02', 900_000, 300_000)
    // 2 月は両方あるので足さない。3〜12 月の 10 か月に足す
    expect(f.salesIncl).toBe(1_760_000 + 900_000 * 10)
    expect(f.filledMonths).toBe(10)
  })
  it('見込み額が 0 なら何も足さない', () => {
    const f = forecastYear(rows, 2030, '2030-01', 0, 0)
    expect(f.salesIncl).toBe(1_760_000)
    expect(f.filledMonths).toBe(0)
  })
})
