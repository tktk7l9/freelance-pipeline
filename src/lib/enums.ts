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

/** 予定の種別（カレンダー）。案件に紐づく出来事＋自分の都合 */
export const EVENT_KINDS = ['meeting', 'interview', 'deadline', 'join', 'other'] as const
export type EventKind = (typeof EVENT_KINDS)[number]
export const EVENT_KIND_LABEL: Record<EventKind, string> = {
  meeting: '商談',
  interview: '面談',
  deadline: '期限',
  join: '参画',
  other: 'その他',
}

/**
 * 収支台帳の種別。収入（売上・役員報酬・その他）と、そこから引かれるもの
 * （税・社会保険・経費・その他）を 1 つの表に同居させ、種別で分ける。
 */
export const LEDGER_KINDS = [
  'freelance',
  'officer',
  'other_income',
  'income_tax',
  'resident_tax',
  'consumption_tax',
  'social_insurance',
  'expense',
  'other_outgo',
] as const
export type LedgerKind = (typeof LEDGER_KINDS)[number]
export const LEDGER_KIND_LABEL: Record<LedgerKind, string> = {
  freelance: 'フリーランス売上',
  officer: '役員報酬',
  other_income: 'その他の収入',
  income_tax: '所得税',
  resident_tax: '住民税',
  consumption_tax: '消費税',
  social_insurance: '社会保険料',
  expense: '事業経費',
  other_outgo: 'その他の支出',
}
export type LedgerDirection = 'income' | 'outgo'
export const LEDGER_DIRECTION: Record<LedgerKind, LedgerDirection> = {
  freelance: 'income',
  officer: 'income',
  other_income: 'income',
  income_tax: 'outgo',
  resident_tax: 'outgo',
  consumption_tax: 'outgo',
  social_insurance: 'outgo',
  expense: 'outgo',
  other_outgo: 'outgo',
}
