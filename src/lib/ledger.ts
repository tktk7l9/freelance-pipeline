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
  /** 見込み（forecastMonths）。実績のある種別は 0 */
  forecastFreelance: number
  forecastOfficer: number
}

/** 12 か月ぶんの内訳。データの無い月も 0 で並べる（表と棒グラフの行を揃える）。forecast を渡すと見込み列が埋まる */
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

/** 前年比（%）。前年が 0 なら null */
export function yoyPercent(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 1000) / 10
}

/** 参画中の案件（見込みの材料）。startDate/endDate は 'YYYY-MM-DD' か 'YYYY-MM' */
export type JoinedCase = { monthly: number; startDate: string; endDate: string | null }

function daysIn(yearMonth: string): number {
  const [y, m] = yearMonth.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

/** 'YYYY-MM-DD' の日。'YYYY-MM' なら null（月初/月末として扱う） */
function dayOf(date: string): number | null {
  return date.length >= 10 ? Number(date.slice(8, 10)) : null
}

/**
 * その月に参画中の案件の月額合計。開始月・終了月は日割り（DMM の 10/16 開始なら 10 月は 16/31）。
 * 月の外（開始前・終了後）は 0。
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
 * 月ごとの見込み。todayYm 以降で、その種別の記録が無い月にだけ入れる
 * （過去の空白は見込みで埋めない＝記録漏れを隠さない）。
 * - freelance: 参画中案件の月額（期間内・開始/終了月は日割り）
 * - officer: 直近の役員報酬（officerMonthly）
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

/** 今年の着地見込み＝実績＋forecastMonths の合計 */
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

/** 直近（年月が最大）の officer 行の額。無ければ 0 */
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
  /** その月のフリーランス売上の最大行＝主契約の月額（税込） */
  rate: number
  /** 前後の月より低い＝日割りなど一時的な月。改定の検出から外す */
  partial: boolean
}

/**
 * 単価の推移。月ごとにフリーランス売上の最大の行を「主契約の月額」とみなす
 * （単発の請求が同じ月にあっても主契約の額が残る）。
 * 前後の月より低い月は日割りとみなして partial にする（改定の誤検出を防ぐ）。
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

/** 単価の改定（日割りの月を除いて、前の月額と違う最初の月） */
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
