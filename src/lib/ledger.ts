import { LEDGER_DIRECTION, type LedgerKind } from './enums'
import { toExcl } from './rate'

/** 台帳の 1 行（集計に要る列だけ） */
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

/** データのある年＋今年を降順で。年チップに使う */
export function yearsOf(rows: readonly LedgerLike[], thisYear: number): number[] {
  const set = new Set<number>([thisYear])
  for (const r of rows) set.add(yearOf(r.yearMonth))
  return [...set].sort((a, b) => b - a)
}

export type YearSummary = {
  year: number
  /** フリーランス売上（税込） */
  salesIncl: number
  /** フリーランス売上（税抜） */
  salesExcl: number
  officer: number
  otherIncome: number
  incomeTotal: number
  tax: number
  insurance: number
  expense: number
  otherOutgo: number
  outgoTotal: number
  /** 手取り＝収入合計 − 税・社保・経費・その他支出 */
  net: number
  /** 収入がある月の数（月平均の分母） */
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
}

/** 12 か月ぶんの内訳。データの無い月も 0 で並べる（表と棒グラフの行を揃える） */
export function monthlyBreakdown(rows: readonly LedgerLike[], year: number): MonthRow[] {
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
    }
  })
}

/** 前年比（%）。前年が 0 なら null */
export function yoyPercent(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 1000) / 10
}

/**
 * 今年の着地見込み。実績に「まだ記録の無い月」の見込みを足す。
 * - フリーランス: 参画中案件の月額（joinedMonthly）を、todayYm 以降で freelance 行の無い月に
 * - 役員報酬: 直近の officer 行の額（officerMonthly）を、todayYm 以降で officer 行の無い月に
 * 過去の月に記録が無くても埋めない（記録漏れを見込みで隠さない）。
 */
export function forecastYear(
  rows: readonly LedgerLike[],
  year: number,
  todayYm: string,
  joinedMonthly: number,
  officerMonthly: number,
): { salesIncl: number; officer: number; incomeTotal: number; filledMonths: number } {
  const actual = summarizeYear(rows, year)
  let sales = actual.salesIncl
  let officer = actual.officer
  let filled = 0
  for (const month of MONTHS) {
    const key = ym(year, month)
    if (key < todayYm) continue
    const inMonth = rows.filter((r) => r.yearMonth === key)
    let touched = false
    if (joinedMonthly > 0 && !inMonth.some((r) => r.kind === 'freelance')) {
      sales += joinedMonthly
      touched = true
    }
    if (officerMonthly > 0 && !inMonth.some((r) => r.kind === 'officer')) {
      officer += officerMonthly
      touched = true
    }
    if (touched) filled += 1
  }
  return {
    salesIncl: sales,
    officer,
    incomeTotal: sales + officer + actual.otherIncome,
    filledMonths: filled,
  }
}

/** 直近（年月が最大）の officer 行の額。無ければ 0 */
export function latestOfficerMonthly(rows: readonly LedgerLike[]): number {
  let best: LedgerLike | null = null
  for (const r of rows) {
    if (r.kind !== 'officer') continue
    if (!best || r.yearMonth > best.yearMonth) best = r
  }
  return best?.amount ?? 0
}
