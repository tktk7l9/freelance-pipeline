import { ROUTES, type Route, type TaxBasis } from './enums.ts'

/** Consumption tax (消費税) rate. Tax-included is canonical; only case sheets shown tax-excluded go through here to become tax-included */
export const TAX_RATE = 1.1

/** Base hours per route when there is no settlement range. Denominator for the hourly conversion */
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

/** Hourly rate (tax excluded). monthlyIncl is tax included */
export function hourlyExcl(monthlyIncl: number, hours: number): number {
  return Math.round(toExcl(monthlyIncl) / hours)
}

export function formatMan(yen: number | null | undefined): string {
  if (yen === null || yen === undefined) return '—'
  const man = Math.round(yen / 1_000) / 10
  return `${man.toLocaleString('ja-JP', { maximumFractionDigits: 1 })}万`
}

/** Two-line rate display. Top = tax included (min〜max if min exists), bottom = (tax excluded …) */
export function formatRateLines(
  maxIncl: number,
  minIncl: number | null,
): { main: string; sub: string } {
  if (minIncl === null) {
    return { main: formatMan(maxIncl), sub: `(税抜 ${formatMan(toExcl(maxIncl))})` }
  }
  return {
    main: `${formatMan(minIncl)}〜${formatMan(maxIncl)}`,
    sub: `(税抜 ${formatMan(toExcl(minIncl))}〜${formatMan(toExcl(maxIncl))})`,
  }
}

/** Two-line hourly display. Top = yen/h (tax excluded), bottom = (÷ base hours h) */
export function formatHourlyLines(
  monthlyIncl: number,
  hours: number,
): { main: string; sub: string } {
  return {
    main: `${hourlyExcl(monthlyIncl, hours).toLocaleString('ja-JP')}円/h`,
    sub: `(÷${hours}h)`,
  }
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export type RouteStat = { route: Route; activeCount: number; medianIncl: number | null }

/** Aggregates in-progress cases by route. Routes with 0 cases are omitted. Ordered as in ROUTES */
export function statsByRoute(cases: { route: Route; monthlyMaxIncl: number }[]): RouteStat[] {
  return ROUTES.flatMap((route) => {
    const inRoute = cases.filter((c) => c.route === route)
    if (inRoute.length === 0) return []
    return [
      {
        route,
        activeCount: inRoute.length,
        medianIncl: median(inRoute.map((c) => c.monthlyMaxIncl)),
      },
    ]
  })
}
