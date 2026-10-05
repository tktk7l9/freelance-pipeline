import { describe, expect, it } from 'vitest'

import {
  forecastMonths,
  ledgerEntryName,
  trimLeadingEmptyMonths,
  forecastYear,
  joinedMonthlyFor,
  latestOfficerMonthly,
  monthlyBreakdown,
  rateChanges,
  rateHistory,
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
  it('sales (tax included/excluded), total income, total expenses and take-home', () => {
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
  it('a year without data is all 0', () => {
    const s = summarizeYear(rows, 2020)
    expect(s.incomeTotal).toBe(0)
    expect(s.net).toBe(0)
    expect(s.monthsWithIncome).toBe(0)
  })
})

describe('monthlyBreakdown', () => {
  it('lists 12 months, 0 for missing months', () => {
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
  it('years with data plus this year, descending', () => {
    expect(yearsOf(rows, 2031)).toEqual([2031, 2030, 2029])
    expect(yearsOf([], 2030)).toEqual([2030])
    expect(ym(2030, 3)).toBe('2030-03')
  })
  it('year-over-year with 1 decimal place, null when the previous year is 0', () => {
    expect(yoyPercent(110, 100)).toBe(10)
    expect(yoyPercent(95, 100)).toBe(-5)
    expect(yoyPercent(1, 3)).toBe(-66.7)
    expect(yoyPercent(100, 0)).toBeNull()
  })
  it('the latest director compensation (役員報酬) (the row with the largest year-month regardless of order)', () => {
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
  it('0 outside the period, prorated in the start and end months, full in between', () => {
    expect(joinedMonthlyFor([dmm], '2030-09')).toBe(0)
    expect(joinedMonthlyFor([dmm], '2030-10')).toBe(Math.round((900_000 * 16) / 31))
    expect(joinedMonthlyFor([dmm], '2030-11')).toBe(900_000)
    expect(joinedMonthlyFor([dmm], '2030-12')).toBe(900_000)
    expect(joinedMonthlyFor([dmm], '2031-01')).toBe(0)
  })
  it('a YYYY-MM start is the 1st of the month, no end is open-ended; several cases are summed', () => {
    const open = { monthly: 100_000, startDate: '2030-01', endDate: null }
    expect(joinedMonthlyFor([open], '2029-12')).toBe(0)
    expect(joinedMonthlyFor([open], '2030-01')).toBe(100_000)
    expect(joinedMonthlyFor([open, dmm], '2030-11')).toBe(1_000_000)
    // If the end is year-month only, the end month is paid in full (not prorated)
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
  it('fills projections only into months from this month on that have no records', () => {
    const f = forecastMonths(rows, 2030, '2030-11', [dmm], 300_000)
    expect([...f.keys()]).toEqual(['2030-11', '2030-12'])
    expect(f.get('2030-11')).toEqual({ freelance: 900_000, officer: 300_000 })
    const y = forecastYear(rows, 2030, '2030-11', [dmm], 300_000)
    expect(y.salesIncl).toBe(1_760_000 + 900_000 * 2)
    expect(y.officer).toBe(600_000 + 300_000 * 2)
    expect(y.incomeTotal).toBe(y.salesIncl + y.officer + 50_000)
    expect(y.filledMonths).toBe(2)
  })
  it('does not fill a kind in a month that already has records; before a case starts only director compensation', () => {
    const f = forecastMonths(rows, 2030, '2030-02', [dmm], 300_000)
    expect(f.has('2030-02')).toBe(false)
    expect(f.get('2030-03')).toEqual({ freelance: 0, officer: 300_000 })
    expect(f.get('2030-10')).toEqual({
      freelance: Math.round((900_000 * 16) / 31),
      officer: 300_000,
    })
    expect(forecastYear(rows, 2030, '2030-02', [dmm], 300_000).filledMonths).toBe(10)
  })
  it('fills nothing without inputs', () => {
    expect(forecastMonths(rows, 2030, '2030-01', [], 0).size).toBe(0)
    expect(forecastYear(rows, 2030, '2030-01', [], 0).salesIncl).toBe(1_760_000)
  })
})

describe('rateHistory / rateChanges', () => {
  const rows: LedgerLike[] = [
    { id: '1', yearMonth: '2030-01', kind: 'freelance', amount: 780_000 },
    { id: '2', yearMonth: '2030-01', kind: 'freelance', amount: 50_000 }, // One-off entries are ignored
    { id: '3', yearMonth: '2030-02', kind: 'freelance', amount: 780_000 },
    { id: '4', yearMonth: '2030-03', kind: 'freelance', amount: 300_000 }, // Prorated
    { id: '5', yearMonth: '2030-04', kind: 'freelance', amount: 830_000 },
    { id: '6', yearMonth: '2030-05', kind: 'freelance', amount: 830_000 },
    { id: '7', yearMonth: '2030-05', kind: 'officer', amount: 300_000 }, // Other kinds are ignored
  ]
  it('lists the maximum row per month and treats a month lower than its neighbours as prorated', () => {
    const h = rateHistory(rows)
    expect(h.map((p) => [p.yearMonth, p.rate, p.partial])).toEqual([
      ['2030-01', 780_000, false],
      ['2030-02', 780_000, false],
      ['2030-03', 300_000, true],
      ['2030-04', 830_000, false],
      ['2030-05', 830_000, false],
    ])
  })
  it('detects a revision while skipping prorated months', () => {
    expect(rateChanges(rateHistory(rows))).toEqual([
      { yearMonth: '2030-04', from: 780_000, to: 830_000 },
    ])
    expect(rateChanges([])).toEqual([])
  })
  it('does not check the edge months for proration', () => {
    const h = rateHistory([
      { id: 'a', yearMonth: '2030-01', kind: 'freelance', amount: 100 },
      { id: 'b', yearMonth: '2030-02', kind: 'freelance', amount: 900 },
    ])
    expect(h.every((p) => !p.partial)).toBe(true)
  })
})

describe('trimLeadingEmptyMonths', () => {
  it('drops the empty months before the first month with a record or projection (SHIG 1, 28)', () => {
    const rows = [{ id: 'a', yearMonth: '2030-07', kind: 'freelance' as const, amount: 100 }]
    const months = monthlyBreakdown(rows, 2030)
    expect(trimLeadingEmptyMonths(months).map((m) => m.month)).toEqual([7, 8, 9, 10, 11, 12])
    const withForecast = monthlyBreakdown(
      rows,
      2030,
      new Map([['2030-05', { freelance: 10, officer: 0 }]]),
    )
    expect(trimLeadingEmptyMonths(withForecast)[0].month).toBe(5)
  })
  it('a month with only expenses counts as recorded; all empty gives an empty array', () => {
    const rows = [{ id: 'a', yearMonth: '2030-03', kind: 'income_tax' as const, amount: 5 }]
    expect(trimLeadingEmptyMonths(monthlyBreakdown(rows, 2030))[0].month).toBe(3)
    expect(trimLeadingEmptyMonths(monthlyBreakdown([], 2030))).toEqual([])
  })
})

describe('ledgerEntryName', () => {
  it('names the row by 「年月 種別」 (year-month kind) (SHIG 59)', () => {
    expect(ledgerEntryName({ yearMonth: '2030-08', kind: 'social_insurance' })).toBe(
      '2030/08 社会保険料',
    )
  })
})
