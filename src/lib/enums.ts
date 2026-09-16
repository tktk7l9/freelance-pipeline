/** 経路・税基準・リモート種別・ログ種別。schema.ts と lib の両方がここを参照する（import なし） */
export const ROUTES = ['levtech', 'findy', 'direct', 'other'] as const
export type Route = (typeof ROUTES)[number]
export const ROUTE_LABEL: Record<Route, string> = {
  levtech: 'レバテック',
  findy: 'Findy',
  direct: '直接',
  other: 'その他',
}

export const TAX_BASES = ['incl', 'excl'] as const
export type TaxBasis = (typeof TAX_BASES)[number]
export const TAX_BASIS_LABEL: Record<TaxBasis, string> = { incl: '税込表示', excl: '税抜表示' }

export const REMOTE_TYPES = ['full', 'partial', 'onsite'] as const
export type RemoteType = (typeof REMOTE_TYPES)[number]
export const REMOTE_LABEL: Record<RemoteType, string> = {
  full: 'フルリモート',
  partial: '一部出社',
  onsite: '常駐',
}

export const LOG_KINDS = ['status', 'memo', 'import'] as const
export type LogKind = (typeof LOG_KINDS)[number]
