import { formatDateSlash } from './format'
import { dayOfWeek } from './holidays'

/**
 * Datetime representation of events. Stored as TEXT: all-day as 'YYYY-MM-DD', timed as
 * 'YYYY-MM-DDTHH:MM:00+09:00' (with the JST offset explicit).
 * The date key is the first 10 characters. Never convert to a Date object (time zones break it).
 * Ported only the needed parts from sumai-log's src/lib/calendar.ts.
 */

export function dateKey(startsAt: string): string {
  return startsAt.slice(0, 10)
}

export const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

/** Turns 'YYYY-MM-DD' into '2026/09/20（日）'. Unreadable strings are returned as is. */
export function formatDateWithWeekday(key: string): string {
  const day = dayOfWeek(key)
  if (day === null) return key
  return `${formatDateSlash(key)}（${WEEKDAY_LABELS[day]}）`
}

export function composeStartsAt(date: string, time: string | null): string {
  return time ? `${date}T${time}:00+09:00` : date
}

export function splitStartsAt(startsAt: string): { date: string; time: string | null } {
  const date = dateKey(startsAt)
  const time = startsAt.length > 10 ? startsAt.slice(11, 16) : null
  return { date, time }
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function toKey(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/** Returns 'YYYY-MM-DD' plus days as 'YYYY-MM-DD' (negative values allowed) */
export function addDays(key: string, days: number): string {
  const [year, month, day] = key.split('-').map(Number)
  return toKey(new Date(Date.UTC(year, month - 1, day + days)))
}

/** Turns a UTC instant into JST 'YYYY-MM-DDTHH:MM:SS+09:00' (the Worker runs in UTC, so +9h) */
export function toJstIso(now: Date): string {
  const d = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return `${d.toISOString().slice(0, 19)}+09:00`
}

export type CalendarView = 'day' | 'week' | 'month'

/**
 * The range a view can actually render. A week view can span months, so compute the real date range
 * rather than "only the displayed month". Weeks start on Monday. The month view takes a wider range to cover the overflowing weeks before and after.
 */
export function visibleRange(date: string, view: CalendarView): { from: string; to: string } {
  if (view === 'day') return { from: date, to: date }
  if (view === 'week') {
    const dow = dayOfWeek(date) ?? 0
    const monday = addDays(date, -((dow + 6) % 7))
    return { from: monday, to: addDays(monday, 6) }
  }
  const [year, month] = date.split('-').map(Number)
  const first = `${year}-${pad(month)}-01`
  const last = toKey(new Date(Date.UTC(year, month, 0)))
  return { from: addDays(first, -7), to: addDays(last, 7) }
}

export function formatEventTime(e: {
  startsAt: string
  endsAt: string | null
  allDay: boolean
}): string {
  if (e.allDay) return '終日'
  const start = splitStartsAt(e.startsAt).time ?? ''
  const end = e.endsAt ? splitStartsAt(e.endsAt).time : null
  return end ? `${start}–${end}` : start
}

/** '2026-09-01' (or a 'YYYY-MM-DD HH:mm:ss' stamp) → '2026年9月1日' for screen readers. Unreadable strings are returned as is */
export function formatDateJa(key: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(key)
  if (!m) return key
  return `${Number(m[1])}年${Number(m[2])}月${Number(m[3])}日`
}
