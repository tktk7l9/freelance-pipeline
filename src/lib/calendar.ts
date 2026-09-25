import { formatDateSlash } from './format'
import { dayOfWeek } from './holidays'

/**
 * 予定の日時表現。DB には TEXT で、終日は 'YYYY-MM-DD'、時刻ありは
 * 'YYYY-MM-DDTHH:MM:00+09:00'（日本時間のオフセットを明示）で入る。
 * 日付キーは先頭 10 文字。Date オブジェクトに変換しない（タイムゾーンで壊れる）。
 * sumai-log の src/lib/calendar.ts から必要な分だけ移植。
 */

export function dateKey(startsAt: string): string {
  return startsAt.slice(0, 10)
}

export const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

/** 'YYYY-MM-DD' を '2026/09/20（日）' に直す。読めない文字列はそのまま返す。 */
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

/** 'YYYY-MM-DD' に days 日足した 'YYYY-MM-DD' を返す（負数も可） */
export function addDays(key: string, days: number): string {
  const [year, month, day] = key.split('-').map(Number)
  return toKey(new Date(Date.UTC(year, month - 1, day + days)))
}

/** UTC の瞬間を JST の 'YYYY-MM-DDTHH:MM:SS+09:00' に直す（Worker は UTC なので +9h） */
export function toJstIso(now: Date): string {
  const d = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return `${d.toISOString().slice(0, 19)}+09:00`
}

export type CalendarView = 'day' | 'week' | 'month'

/**
 * ビューが実際に描画しうる範囲。週表示は月をまたぐことがあるので「表示月だけ」ではなく
 * 実際の日付範囲を計算する。週は月曜始まり。月表示は前後の週がはみ出すぶんも広めに取る。
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
