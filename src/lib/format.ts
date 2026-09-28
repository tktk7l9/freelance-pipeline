import { REMOTE_LABEL, type RemoteType } from './enums'

/** Formatter for displaying rates. Takes integer yen and shows it rounded to units of 10,000 yen (万円) */

export function formatYen(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  if (Math.abs(value) < 10_000) return `${value.toLocaleString('ja-JP')}円`
  return `${Math.round(value / 10_000).toLocaleString('ja-JP')}万円`
}

/**
 * All dates are displayed with `/` separators (owner's request, 2026-09-25).
 * 'YYYY-MM-DD' → 'YYYY/MM/DD', 'YYYY-MM' → 'YYYY/MM',
 * 'YYYY-MM-DD HH:mm' → 'YYYY/MM/DD HH:mm' (history timestamps).
 * Strings that do not match are returned as is. DB values and URL search params are not touched
 * (this is applied only for display).
 */
export function formatDateSlash(value: string | null | undefined): string {
  if (!value) return ''
  const m = /^(\d{4})-(\d{2})(?:-(\d{2})( \d{2}:\d{2})?)?$/.exec(value)
  if (!m) return value
  const [, y, mo, d, time] = m
  if (!d) return `${y}/${mo}`
  return `${y}/${mo}/${d}${time ?? ''}`
}

/**
 * URL that opens an address in Google Maps. Parenthetical notes (supplements like "（都営大江戸線 六本木駅 直結）")
 * are removed from the query. Null if empty.
 */
export function mapsUrl(address: string | null | undefined): string | null {
  const trimmed = address?.trim()
  if (!trimmed) return null
  const query = trimmed.replace(/[（(].*$/, '').trim() || trimmed
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

/** The on-site note, or null when it is empty or only repeats the remote label (e.g. 常駐 + 常駐) */
export function distinctOnsiteNote(
  remoteType: RemoteType,
  onsiteNote: string | null | undefined,
): string | null {
  const note = onsiteNote?.trim()
  if (!note || note === REMOTE_LABEL[remoteType]) return null
  return note
}

/** 'フルリモート' / '一部出社（月4回出社）'. Does not repeat the same word twice (SHIG 1) */
export function remoteSummary(
  remoteType: RemoteType,
  onsiteNote: string | null | undefined,
): string {
  const note = distinctOnsiteNote(remoteType, onsiteNote)
  return note ? `${REMOTE_LABEL[remoteType]}（${note}）` : REMOTE_LABEL[remoteType]
}
