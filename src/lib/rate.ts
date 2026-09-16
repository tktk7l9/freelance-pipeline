import type { Route, TaxBasis } from './enums.ts'

/** 消費税率。税込が正本で、税抜表示の案件票だけここを通して税込にする */
export const TAX_RATE = 1.1

/** 精算幅が無いときの基準時間（経路ごと）。時給換算の分母 */
export const DEFAULT_BASE_HOURS: Record<Route, number> = {
  findy: 160,
  levtech: 168,
  direct: 160,
  other: 160,
}

export function toIncl(amount: number, basis: TaxBasis): number {
  return basis === 'excl' ? Math.round(amount * TAX_RATE) : amount
}

export function toExcl(incl: number): number {
  return Math.round(incl / TAX_RATE)
}

export type BaseHoursSource = 'range' | 'min' | 'max' | 'route'

export function baseHours({
  route,
  settlementMinH,
  settlementMaxH,
}: {
  route: Route
  settlementMinH: number | null
  settlementMaxH: number | null
}): { hours: number; source: BaseHoursSource } {
  if (settlementMinH !== null && settlementMaxH !== null) {
    return { hours: (settlementMinH + settlementMaxH) / 2, source: 'range' }
  }
  if (settlementMinH !== null) return { hours: settlementMinH, source: 'min' }
  if (settlementMaxH !== null) return { hours: settlementMaxH, source: 'max' }
  return { hours: DEFAULT_BASE_HOURS[route], source: 'route' }
}

/** 時給（税抜）。monthlyIncl は税込 */
export function hourlyExcl(monthlyIncl: number, hours: number): number {
  return Math.round(toExcl(monthlyIncl) / hours)
}

export function formatMan(yen: number | null | undefined): string {
  if (yen === null || yen === undefined) return '—'
  const man = Math.round(yen / 1_000) / 10
  return `${man.toLocaleString('ja-JP', { maximumFractionDigits: 1 })}万`
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}
