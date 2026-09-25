import { describe, expect, it } from 'vitest'

import {
  forecastMonths,
  forecastYear,
  joinedMonthlyFor,
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
      forecastFreelance: 0,
      forecastOfficer: 0,
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

describe('joinedMonthlyFor', () => {
  const dmm = { monthly: 900_000, startDate: '2030-10-16', endDate: '2030-12-31' }
  it('期間外は 0、開始月と終了月は日割り、途中の月は満額', () => {
    expect(joinedMonthlyFor([dmm], '2030-09')).toBe(0)
    expect(joinedMonthlyFor([dmm], '2030-10')).toBe(Math.round((900_000 * 16) / 31))
    expect(joinedMonthlyFor([dmm], '2030-11')).toBe(900_000)
    expect(joinedMonthlyFor([dmm], '2030-12')).toBe(900_000)
    expect(joinedMonthlyFor([dmm], '2031-01')).toBe(0)
  })
  it('YYYY-MM の開始は月初、終了なしは無期限。複数案件は合算', () => {
    const open = { monthly: 100_000, startDate: '2030-01', endDate: null }
    expect(joinedMonthlyFor([open], '2029-12')).toBe(0)
    expect(joinedMonthlyFor([open], '2030-01')).toBe(100_000)
    expect(joinedMonthlyFor([open, dmm], '2030-11')).toBe(1_000_000)
    // 終了が年月だけなら終了月は満額（日割りしない）
    expect(
      joinedMonthlyFor([{ monthly: 100_000, startDate: '2030-01', endDate: '2030-03' }], '2030-03'),
    ).toBe(100_000)
    expect(
      joinedMonthlyFor(
        [{ monthly: 310_000, startDate: '2030-10-01', endDate: '2030-10-10' }],
        '2030-10',
      ),
    ).toBe(100_000)
  })
})

describe('forecastMonths / forecastYear', () => {
  const dmm = { monthly: 900_000, startDate: '2030-10-16', endDate: null }
  it('今月以降で記録の無い月にだけ見込みを入れる', () => {
    const f = forecastMonths(rows, 2030, '2030-11', [dmm], 300_000)
    expect([...f.keys()]).toEqual(['2030-11', '2030-12'])
    expect(f.get('2030-11')).toEqual({ freelance: 900_000, officer: 300_000 })
    const y = forecastYear(rows, 2030, '2030-11', [dmm], 300_000)
    expect(y.salesIncl).toBe(1_760_000 + 900_000 * 2)
    expect(y.officer).toBe(600_000 + 300_000 * 2)
    expect(y.incomeTotal).toBe(y.salesIncl + y.officer + 50_000)
    expect(y.filledMonths).toBe(2)
  })
  it('既に記録のある月は種別ごとに埋めない。案件の開始前は役員報酬だけ', () => {
    const f = forecastMonths(rows, 2030, '2030-02', [dmm], 300_000)
    expect(f.has('2030-02')).toBe(false)
    expect(f.get('2030-03')).toEqual({ freelance: 0, officer: 300_000 })
    expect(f.get('2030-10')).toEqual({
      freelance: Math.round((900_000 * 16) / 31),
      officer: 300_000,
    })
    expect(forecastYear(rows, 2030, '2030-02', [dmm], 300_000).filledMonths).toBe(10)
  })
  it('材料が無ければ何も入れない', () => {
    expect(forecastMonths(rows, 2030, '2030-01', [], 0).size).toBe(0)
    expect(forecastYear(rows, 2030, '2030-01', [], 0).salesIncl).toBe(1_760_000)
  })
})
