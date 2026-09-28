/**
 * Displays the time representations flowing into the ledger in JST.
 *
 * D1's datetime('now') is 'YYYY-MM-DD HH:MM:SS' (UTC, no offset).
 * Other sources may send ISO 8601 (with an offset such as 'Z' or '+09:00',
 * or without one). Without an offset, it is treated as UTC.
 * ISO 8601 may include fractional seconds ('.333' etc.), so those are accepted too.
 * Date.now() is not used (to keep it a pure function independent of call time).
 */

const DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/

/**
 * Converts to UTC milliseconds. Accepts D1's 'YYYY-MM-DD HH:MM:SS' (no offset = UTC) and
 * ISO 8601 (with an offset like 'Z' / '+09:00', or without = UTC; fractional seconds
 * optional). Strings that do not match this regex give null (the caller uses it for
 * fallbacks such as "unreadable = keep the original string").
 */
export function parseToUtcMs(value: string): number | null {
  const match = DATE_TIME_PATTERN.exec(value)
  if (!match) return null
  const [, year, month, day, hour, minute, second, fraction, offset] = match
  if (offset) {
    return Date.parse(
      `${year}-${month}-${day}T${hour}:${minute}:${second}${fraction ?? ''}${offset}`,
    )
  }
  const ms = fraction ? Math.round(Number(fraction) * 1000) : 0
  return Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
    ms,
  )
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * Converts to JST 'YYYY-MM-DD HH:mm' ('YYYY-MM-DD' when withTime is false).
 * Unparseable strings are returned as is.
 */
export function formatJst(value: string, opts?: { withTime?: boolean }): string {
  const utcMs = parseToUtcMs(value)
  if (utcMs === null) return value

  const jst = new Date(utcMs + 9 * 60 * 60 * 1000)
  const datePart = `${jst.getUTCFullYear()}-${pad(jst.getUTCMonth() + 1)}-${pad(jst.getUTCDate())}`
  if (opts?.withTime === false) return datePart
  return `${datePart} ${pad(jst.getUTCHours())}:${pad(jst.getUTCMinutes())}`
}

/** JST 'YYYY-MM-DD' key. No callers in the app right now. Kept as part of the lib's public API */
export function toJstDateKey(value: string): string {
  return formatJst(value, { withTime: false })
}
