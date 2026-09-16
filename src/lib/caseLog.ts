import type { LogKind } from './enums'
import { formatJst } from './jst'
import { STATUS_LABEL, type CaseStatus } from './status'

export type LogLike = {
  id: string
  at: string
  kind: LogKind
  fromStatus: string | null
  toStatus: string | null
  body: string
}

function label(status: string | null): string {
  return status && status in STATUS_LABEL ? STATUS_LABEL[status as CaseStatus] : '—'
}

export function describeLog(entry: LogLike): string {
  if (entry.kind === 'status') return `${label(entry.fromStatus)} → ${label(entry.toStatus)}`
  if (entry.kind === 'import') return `取込: ${entry.body}`
  return entry.body
}

/** メモは日付だけを見せる（時刻は正午に固定しているので意味が無い） */
export function formatLogAt(entry: LogLike): string {
  return formatJst(entry.at, { withTime: entry.kind !== 'memo' })
}

export function sortLogNewestFirst<T extends LogLike>(entries: T[]): T[] {
  return [...entries].sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id))
}

/** 日付だけのメモを JST の正午に置く（UTC に直しても日付が変わらない） */
export function memoAt(date: string): string {
  return `${date}T12:00:00+09:00`
}
