import type { Route } from './enums'
import { formatDateSlash } from './format'
import type { JoinedCase } from './ledger'
import { baseHours, formatMan, formatRateLines, toExcl } from './rate'

/**
 * A signed contract of a case (one row of the contracts table). The case row holds what the case
 * sheet offered; these hold what was agreed, one row per contract period, so a renewal at a new
 * rate is a new row instead of an overwrite.
 */
export type ContractLike = {
  /** 'YYYY-MM-DD' or 'YYYY-MM' */
  startDate: string
  endDate: string | null
  /** Tax included */
  monthlyIncl: number
  settlementMinH: number | null
  settlementMaxH: number | null
}

/** The columns of a case that decide which rate to show and how to turn it into an hourly rate */
export type RateCase = {
  route: Route
  monthlyMaxIncl: number
  monthlyMinIncl: number | null
  settlementMinH: number | null
  settlementMaxH: number | null
  /** Legacy single actual rate, kept for cases registered before contracts existed */
  actualMonthlyIncl: number | null
}

/** Newest start date first. Ties keep the input order */
export function sortContractsNewestFirst<T extends { startDate: string }>(
  items: readonly T[],
): T[] {
  return [...items].sort((a, b) => b.startDate.localeCompare(a.startDate))
}

/** The contract with the newest start date (the one in force, or the last one of an ended case) */
export function latestContract<T extends { startDate: string }>(items: readonly T[]): T | null {
  return sortContractsNewestFirst(items)[0] ?? null
}

/** Base hours of a contract: its own settlement range, else the route's default (same rule as the case sheet) */
export function contractHours(c: ContractLike, route: Route): number {
  return baseHours({
    route,
    settlementMinH: c.settlementMinH,
    settlementMaxH: c.settlementMaxH,
  }).hours
}

/** Where the displayed rate comes from */
export type RateSource = 'contract' | 'actual' | 'sheet'
export const RATE_SOURCE_LABEL: Record<RateSource, string> = {
  contract: '契約',
  actual: '実単価',
  sheet: '案件票',
}

export type EffectiveRate = {
  monthlyIncl: number
  /** Only a case sheet has a range; a contract is one number */
  monthlyMinIncl: number | null
  hours: number
  source: RateSource
}

/**
 * The rate a case is judged by: the latest contract when there is one, else the legacy actual rate,
 * else what the case sheet offered. Lists, the home card and the forecast all read this, so the
 * case-sheet cap never stands in for a signed, lower rate.
 */
export function effectiveRate(c: RateCase, contracts: readonly ContractLike[]): EffectiveRate {
  const latest = latestContract(contracts)
  if (latest) {
    return {
      monthlyIncl: latest.monthlyIncl,
      monthlyMinIncl: null,
      hours: contractHours(latest, c.route),
      source: 'contract',
    }
  }
  const { hours } = baseHours(c)
  if (c.actualMonthlyIncl) {
    return { monthlyIncl: c.actualMonthlyIncl, monthlyMinIncl: null, hours, source: 'actual' }
  }
  return { monthlyIncl: c.monthlyMaxIncl, monthlyMinIncl: c.monthlyMinIncl, hours, source: 'sheet' }
}

/**
 * Two-line display of the effective rate. A case-sheet rate reads as before; a contract or legacy
 * actual rate names its source on the second line so a signed 88万 is never mistaken for a 110万 cap.
 */
export function formatEffectiveRateLines(r: EffectiveRate): { main: string; sub: string } {
  if (r.source === 'sheet') return formatRateLines(r.monthlyIncl, r.monthlyMinIncl)
  return {
    main: formatMan(r.monthlyIncl),
    sub: `(税抜 ${formatMan(toExcl(r.monthlyIncl))}・${RATE_SOURCE_LABEL[r.source]})`,
  }
}

/** '2030/10/16 〜 2030/12/31', or '2030/10/16 〜' while open-ended */
export function contractPeriod(c: { startDate: string; endDate: string | null }): string {
  const start = formatDateSlash(c.startDate)
  return c.endDate ? `${start} 〜 ${formatDateSlash(c.endDate)}` : `${start} 〜`
}

/**
 * Input of the income forecast. A joined case with contracts contributes one entry per contract
 * (each with its own amount and period, so a renewal at a new rate changes the months after it);
 * a joined case without any contract falls back to its case row, as before contracts existed.
 */
export function forecastCases<C extends ContractLike>(
  cases: readonly {
    id: string
    status: string
    startDate: string
    endDate: string | null
    monthlyMaxIncl: number
    actualMonthlyIncl: number | null
  }[],
  contractsByCase: ReadonlyMap<string, readonly C[]>,
): JoinedCase[] {
  const out: JoinedCase[] = []
  for (const c of cases) {
    if (c.status !== 'joined') continue
    const own = contractsByCase.get(c.id) ?? []
    if (own.length === 0) {
      out.push({
        monthly: c.actualMonthlyIncl ?? c.monthlyMaxIncl,
        startDate: c.startDate,
        endDate: c.endDate,
      })
      continue
    }
    for (const k of own) {
      out.push({ monthly: k.monthlyIncl, startDate: k.startDate, endDate: k.endDate })
    }
  }
  return out
}

/**
 * Points where my rate was set, by start month, for the market view's growth pace: every contract
 * of joined / ended cases, else the case's legacy actual rate. Ascending by month.
 */
export function ratePoints<C extends ContractLike>(
  cases: readonly {
    id: string
    status: string
    startDate: string
    actualMonthlyIncl: number | null
  }[],
  contractsByCase: ReadonlyMap<string, readonly C[]>,
): { ym: string; rate: number }[] {
  const out: { ym: string; rate: number }[] = []
  for (const c of cases) {
    if (c.status !== 'joined' && c.status !== 'ended') continue
    const own = contractsByCase.get(c.id) ?? []
    if (own.length > 0) {
      for (const k of own) out.push({ ym: k.startDate.slice(0, 7), rate: k.monthlyIncl })
    } else if (c.actualMonthlyIncl) {
      out.push({ ym: c.startDate.slice(0, 7), rate: c.actualMonthlyIncl })
    }
  }
  return out.sort((a, b) => a.ym.localeCompare(b.ym))
}

/** Groups contract rows by case id (insertion order kept within a case) */
export function groupByCase<T extends { caseId: string }>(rows: readonly T[]): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const r of rows) {
    const list = map.get(r.caseId)
    if (list) list.push(r)
    else map.set(r.caseId, [r])
  }
  return map
}

/** The day after a 'YYYY-MM-DD', or the month after a 'YYYY-MM' */
export function dayAfter(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  if (d) {
    const next = new Date(Date.UTC(y, m - 1, d + 1))
    return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`
  }
  const next = new Date(Date.UTC(y, m, 1))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`
}

export type ContractDefaults = {
  startDate: string
  endDate: string | null
  monthlyIncl: number
  settlementMinH: number | null
  settlementMaxH: number | null
}

/**
 * Prefill for a new contract. A renewal starts the day after the latest contract ends and repeats its
 * terms (the usual case: same conditions, new period); the first contract starts from the case row.
 */
export function nextContractDefaults(
  c: {
    startDate: string
    endDate: string | null
    monthlyMaxIncl: number
    monthlyMinIncl: number | null
    settlementMinH: number | null
    settlementMaxH: number | null
    actualMonthlyIncl: number | null
  },
  contracts: readonly ContractLike[],
): ContractDefaults {
  const latest = latestContract(contracts)
  if (latest) {
    return {
      startDate: latest.endDate ? dayAfter(latest.endDate) : latest.startDate,
      endDate: null,
      monthlyIncl: latest.monthlyIncl,
      settlementMinH: latest.settlementMinH,
      settlementMaxH: latest.settlementMaxH,
    }
  }
  return {
    startDate: c.startDate,
    endDate: c.endDate,
    monthlyIncl: c.actualMonthlyIncl ?? c.monthlyMinIncl ?? c.monthlyMaxIncl,
    settlementMinH: c.settlementMinH,
    settlementMaxH: c.settlementMaxH,
  }
}
