import type { LogKind } from './enums'
import { formatDateSlash } from './format'
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

/**
 * Import rows carry an internal note (the script or form that wrote them). Show what happened
 * in the owner's words instead of the implementation name (SHIG 1, 11).
 */
const IMPORTED = '案件票を取り込んだ'
const IMPORT_NOTE_TEXT: Record<string, string> = {
  '': IMPORTED,
  取込: IMPORTED,
  取込フォーム: IMPORTED,
  'add-case': IMPORTED,
  'add-case --update': '案件票を取り込み直した',
  フォーム: '案件を登録した',
  'import-history': '過去の記録から取り込んだ',
}

function describeImport(body: string): string {
  const note = body.trim()
  return IMPORT_NOTE_TEXT[note] ?? `${IMPORTED}（${note}）`
}

export function describeLog(entry: LogLike): string {
  if (entry.kind === 'status') return `${label(entry.fromStatus)} → ${label(entry.toStatus)}`
  if (entry.kind === 'import') return describeImport(entry.body)
  return entry.body
}

/** Memos show only the date (the time is fixed at noon, so it means nothing) */
export function formatLogAt(entry: LogLike): string {
  return formatDateSlash(formatJst(entry.at, { withTime: entry.kind !== 'memo' }))
}

export function sortLogNewestFirst<T extends LogLike>(entries: T[]): T[] {
  return [...entries].sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id))
}

/**
 * Places a date-only memo at noon JST (the date does not change when converted to UTC).
 * The `at` of status/import rows is `new Date().toISOString()` (the '…Z' form), so return the
 * same '…Z' form so that the string comparison in sortLogNewestFirst orders them correctly
 * (noon JST = 03:00 UTC; one instant expressed in one format).
 */
export function memoAt(date: string): string {
  return `${date}T03:00:00.000Z`
}
