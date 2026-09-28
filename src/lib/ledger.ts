import { LEDGER_DIRECTION, LEDGER_KIND_LABEL, type LedgerKind } from './enums'
import { formatDateSlash } from './format'
import { toExcl } from './rate'

/** One ledger row (only the columns needed for aggregation) */
export type LedgerLike = {
  id: string
  yearMonth: string
  kind: LedgerKind
  amount: number
}

export const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const

export function ym(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function yearOf(yearMonth: string): number {
  return Number(yearMonth.slice(0, 4))
}

/** Years with data plus this year, descending. Used for the year chips */
export function yearsOf(rows: readonly LedgerLike[], thisYear: number): number[] {
  const set = new Set<number>([thisYear])
  for (const r of rows) set.add(yearOf(r.yearMonth))
  return [...set].sort((a, b) => b - a)
}

export type YearSummary = {
  year: number
  /** Freelance revenue (tax included) */
  salesIncl: number
  /** Freelance revenue (tax excluded) */
  salesExcl: number
  officer: number
  otherIncome: number
  incomeTotal: number
  tax: number
  insurance: number
  expense: number
  otherOutgo: number
  outgoTotal: number
  /** Take-home = total income − tax, social insurance, expenses, other expenses */
  net: number
  /** Number of months with income (denominator of the monthly average) */
  monthsWithIncome: number
}

function sum(rows: readonly LedgerLike[], pred: (r: LedgerLike) => boolean): number {
  let total = 0
  for (const r of rows) if (pred(r)) total += r.amount
  return total
}

export function summarizeYear(rows: readonly LedgerLike[], year: number): YearSummary {
  const inYear = rows.filter((r) => yearOf(r.yearMonth) === year)
  const salesIncl = sum(inYear, (r) => r.kind === 'freelance')
  const officer = sum(inYear, (r) => r.kind === 'officer')
  const otherIncome = sum(inYear, (r) => r.kind === 'other_income')
  const tax = sum(
    inYear,
    (r) => r.kind === 'income_tax' || r.kind === 'resident_tax' || r.kind === 'consumption_tax',
  )
  const insurance = sum(inYear, (r) => r.kind === 'social_insurance')
  const expense = sum(inYear, (r) => r.kind === 'expense')
  const otherOutgo = sum(inYear, (r) => r.kind === 'other_outgo')
  const incomeTotal = salesIncl + officer + otherIncome
  const outgoTotal = tax + insurance + expense + otherOutgo
  const monthsWithIncome = new Set(
    inYear.filter((r) => LEDGER_DIRECTION[r.kind] === 'income').map((r) => r.yearMonth),
  ).size
  return {
    year,
    salesIncl,
    salesExcl: toExcl(salesIncl),
    officer,
    otherIncome,
    incomeTotal,
    tax,
    insurance,
    expense,
    otherOutgo,
    outgoTotal,
    net: incomeTotal - outgoTotal,
    monthsWithIncome,
  }
}

export type MonthRow = {
  month: number
  yearMonth: string
  freelance: number
  officer: number
  otherIncome: number
  income: number
  outgo: number
  /** Forecast (forecastMonths). Kinds with actuals are 0 */
  forecastFreelance: number
  forecastOfficer: number
}

/** Breakdown for 12 months. Months without data are listed as 0 too (keeps table and bar-chart rows aligned). Passing forecast fills the forecast column */
export function monthlyBreakdown(
  rows: readonly LedgerLike[],
  year: number,
  forecast?: ReadonlyMap<string, MonthForecast>,
): MonthRow[] {
  return MONTHS.map((month) => {
    const key = ym(year, month)
    const inMonth = rows.filter((r) => r.yearMonth === key)
    const freelance = sum(inMonth, (r) => r.kind === 'freelance')
    const officer = sum(inMonth, (r) => r.kind === 'officer')
    const otherIncome = sum(inMonth, (r) => r.kind === 'other_income')
    const outgo = sum(inMonth, (r) => LEDGER_DIRECTION[r.kind] === 'outgo')
    return {
      month,
      yearMonth: key,
      freelance,
      officer,
      otherIncome,
      income: freelance + officer + otherIncome,
      outgo,
      forecastFreelance: forecast?.get(key)?.freelance ?? 0,
      forecastOfficer: forecast?.get(key)?.officer ?? 0,
    }
  })
}

/**
 * Drops the empty months before the first month with a record or a forecast. A year that starts in
 * July would otherwise open with six rows of dashes (SHIG 1, 28). Returns [] if every month is empty.
 */
export function trimLeadingEmptyMonths(months: readonly MonthRow[]): MonthRow[] {
  const first = months.findIndex(
    (m) => m.income > 0 || m.outgo > 0 || m.forecastFreelance > 0 || m.forecastOfficer > 0,
  )
  return first < 0 ? [] : months.slice(first)
}

/** '2026/08 社会保険料': names one ledger row, e.g. in the edit drawer's title (SHIG 59) */
export function ledgerEntryName(entry: { yearMonth: string; kind: LedgerKind }): string {
  return `${formatDateSlash(entry.yearMonth)} ${LEDGER_KIND_LABEL[entry.kind]}`
}

/** Year over year (%). null if the previous year is 0 */
export function yoyPercent(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 1000) / 10
}

/** An active case (input for the forecast). startDate/endDate are 'YYYY-MM-DD' or 'YYYY-MM' */
export type JoinedCase = { monthly: number; startDate: string; endDate: string | null }

function daysIn(yearMonth: string): number {
  const [y, m] = yearMonth.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

/** Day of a 'YYYY-MM-DD'. null for 'YYYY-MM' (treated as start/end of month) */
function dayOf(date: string): number | null {
  return date.length >= 10 ? Number(date.slice(8, 10)) : null
}

/**
 * Total monthly amount of the cases active in that month. The start and end months are prorated (e.g. a DMM start on 10/16 makes October 16/31).
 * Outside the period (before start, after end) is 0.
 */
export function joinedMonthlyFor(cases: readonly JoinedCase[], yearMonth: string): number {
  let total = 0
  for (const c of cases) {
    const startYm = c.startDate.slice(0, 7)
    const endYm = c.endDate ? c.endDate.slice(0, 7) : null
    if (yearMonth < startYm) continue
    if (endYm && yearMonth > endYm) continue
    let factor = 1
    const days = daysIn(yearMonth)
    if (yearMonth === startYm) {
      const d = dayOf(c.startDate)
      if (d) factor *= (days - d + 1) / days
    }
    if (endYm && yearMonth === endYm) {
      const d = dayOf(c.endDate as string)
      if (d) factor *= d / days
    }
    total += Math.round(c.monthly * factor)
  }
  return total
}

export type MonthForecast = { freelance: number; officer: number }

/**
 * Monthly forecast. Filled only for months from todayYm onward that have no record of that kind
 * (past gaps are not filled with forecasts = missing records are not hidden).
 * - freelance: monthly amount of active cases (within the period; start/end months prorated)
 * - officer: the most recent officer compensation (officerMonthly)
 */
export function forecastMonths(
  rows: readonly LedgerLike[],
  year: number,
  todayYm: string,
  cases: readonly JoinedCase[],
  officerMonthly: number,
): Map<string, MonthForecast> {
  const out = new Map<string, MonthForecast>()
  for (const month of MONTHS) {
    const key = ym(year, month)
    if (key < todayYm) continue
    const inMonth = rows.filter((r) => r.yearMonth === key)
    const freelance = inMonth.some((r) => r.kind === 'freelance') ? 0 : joinedMonthlyFor(cases, key)
    const officer = inMonth.some((r) => r.kind === 'officer') ? 0 : officerMonthly
    if (freelance > 0 || officer > 0) out.set(key, { freelance, officer })
  }
  return out
}

/** This year's projected total = actuals + the sum of forecastMonths */
export function forecastYear(
  rows: readonly LedgerLike[],
  year: number,
  todayYm: string,
  cases: readonly JoinedCase[],
  officerMonthly: number,
): { salesIncl: number; officer: number; incomeTotal: number; filledMonths: number } {
  const actual = summarizeYear(rows, year)
  const months = forecastMonths(rows, year, todayYm, cases, officerMonthly)
  let sales = actual.salesIncl
  let officer = actual.officer
  for (const f of months.values()) {
    sales += f.freelance
    officer += f.officer
  }
  return {
    salesIncl: sales,
    officer,
    incomeTotal: sales + officer + actual.otherIncome,
    filledMonths: months.size,
  }
}

/** Amount of the most recent officer row (latest year-month). 0 if none */
export function latestOfficerMonthly(rows: readonly LedgerLike[]): number {
  let best: LedgerLike | null = null
  for (const r of rows) {
    if (r.kind !== 'officer') continue
    if (!best || r.yearMonth > best.yearMonth) best = r
  }
  return best?.amount ?? 0
}

export type RatePoint = {
  yearMonth: string
  /** The largest freelance revenue row of the month = the main contract's monthly amount (tax included) */
  rate: number
  /** Lower than both neighboring months = a temporary month such as prorating. Excluded from change detection */
  partial: boolean
}

/**
 * Rate history. For each month, the largest freelance revenue row is taken as "the main contract's monthly amount"
 * (so the main contract's amount survives even with one-off invoices in the same month).
 * Months lower than both neighbors are treated as prorated and marked partial (prevents false change detection).
 */
export function rateHistory(rows: readonly LedgerLike[]): RatePoint[] {
  const byMonth = new Map<string, number>()
  for (const r of rows) {
    if (r.kind !== 'freelance') continue
    const cur = byMonth.get(r.yearMonth) ?? 0
    if (r.amount > cur) byMonth.set(r.yearMonth, r.amount)
  }
  const points = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([yearMonth, rate]) => ({ yearMonth, rate, partial: false }))
  for (let i = 0; i < points.length; i += 1) {
    const prev = points[i - 1]
    const next = points[i + 1]
    if (prev && next && points[i].rate < prev.rate && points[i].rate < next.rate) {
      points[i].partial = true
    }
  }
  return points
}

export type RateChange = { yearMonth: string; from: number; to: number }

/** Rate changes (the first month whose amount differs from the previous month's, excluding prorated months) */
export function rateChanges(history: readonly RatePoint[]): RateChange[] {
  const out: RateChange[] = []
  let last: number | null = null
  for (const p of history) {
    if (p.partial) continue
    if (last !== null && p.rate !== last)
      out.push({ yearMonth: p.yearMonth, from: last, to: p.rate })
    last = p.rate
  }
  return out
}
