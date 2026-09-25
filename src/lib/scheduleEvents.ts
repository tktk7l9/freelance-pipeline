import type { ScheduleEventData } from '@mantine/schedule'

import { addDays, dateKey, splitStartsAt } from './calendar'
import type { EventKind } from './enums'

/** カレンダーに載せる自分の予定（DB の events 行のうち描画に要る列） */
export type CalendarEventRow = {
  id: string
  title: string
  kind: EventKind
  startsAt: string
  endsAt: string | null
  allDay: boolean
}

/** 情報レイヤー: 案件の「次の一手」の期日 */
export type DueCaseRow = {
  id: string
  company: string
  nextAction: string | null
  nextActionDue: string
}

export type OwnEventPayload = { kind: 'own'; eventId: string; past: boolean }
export type DuePayload = { kind: 'due'; caseId: string; past: boolean }
export type CalendarPayload = OwnEventPayload | DuePayload

export const KIND_COLOR: Record<EventKind, string> = {
  meeting: 'indigo',
  interview: 'teal',
  deadline: 'orange',
  join: 'green',
  other: 'gray',
}

/** 終わった予定の色。種別の色を捨ててグレーに落とし、これからの予定と見分ける */
export const PAST_EVENT_COLOR = 'gray'

/**
 * 「今」（'YYYY-MM-DDTHH:MM:SS+09:00' または 'YYYY-MM-DD'）を Schedule と同じ
 * 'YYYY-MM-DD HH:mm:ss' に揃える。どちらも JST の壁時計なので文字列比較で前後が決まる。
 */
export function toScheduleStamp(nowIso: string): string {
  const date = dateKey(nowIso)
  return `${date} ${nowIso.length > 10 ? nowIso.slice(11, 19) : '00:00:00'}`
}

/** 'HH:MM' に 60 分足す。日をまたいだら date も翌日にする */
function plusOneHour(date: string, time: string): { date: string; time: string } {
  const [hour, minute] = time.split(':').map(Number)
  const total = hour * 60 + minute + 60
  const overflowsDay = total >= 24 * 60
  const rem = total % (24 * 60)
  const hh = String(Math.floor(rem / 60)).padStart(2, '0')
  const mm = String(rem % 60).padStart(2, '0')
  return { date: overflowsDay ? addDays(date, 1) : date, time: `${hh}:${mm}` }
}

/**
 * 予定を @mantine/schedule の ScheduleEventData に変換する（純粋関数）。
 * 終日（allDay、または startsAt が日付のみ）は 'YYYY-MM-DD 00:00:00' 〜 翌日 00:00:00。
 * 時刻ありは startsAt/endsAt をそのまま使い、endsAt が無ければ開始の 60 分後にする。
 * `nowIso` を渡すと終わった予定（終了が「今」より前）をグレーにし payload.past を立てる。
 */
export function toScheduleEvents(
  events: readonly CalendarEventRow[],
  nowIso?: string,
): ScheduleEventData<OwnEventPayload>[] {
  const nowStamp = nowIso ? toScheduleStamp(nowIso) : null
  return events.map((e) => {
    const date = dateKey(e.startsAt)
    const time = splitStartsAt(e.startsAt).time
    let start: string
    let end: string
    if (e.allDay || time === null) {
      start = `${date} 00:00:00`
      end = `${addDays(date, 1)} 00:00:00`
    } else {
      start = `${date} ${time}:00`
      if (e.endsAt) {
        end = `${dateKey(e.endsAt)} ${splitStartsAt(e.endsAt).time}:00`
      } else {
        const rolled = plusOneHour(date, time)
        end = `${rolled.date} ${rolled.time}:00`
      }
    }
    const past = nowStamp !== null && end <= nowStamp
    const payload: OwnEventPayload = { kind: 'own', eventId: e.id, past }
    return {
      id: e.id,
      title: e.title,
      start,
      end,
      color: past ? PAST_EVENT_COLOR : KIND_COLOR[e.kind],
      payload,
    }
  })
}

/**
 * 案件の「次の一手」の期日を情報レイヤーとして描く（終日・枠線だけ・クリックで案件へ）。
 * id は自分の予定と衝突しないよう `due-` を前置する。`todayKey` より前の期日は past。
 */
export function dueToScheduleEvents(
  items: readonly DueCaseRow[],
  todayKey?: string,
): ScheduleEventData<DuePayload>[] {
  return items.map((c) => {
    const payload: DuePayload = {
      kind: 'due',
      caseId: c.id,
      past: todayKey !== undefined && c.nextActionDue < todayKey,
    }
    return {
      id: `due-${c.id}`,
      title: `${c.company}: ${c.nextAction ?? '期日'}`,
      start: `${c.nextActionDue} 00:00:00`,
      end: `${addDays(c.nextActionDue, 1)} 00:00:00`,
      color: 'gray',
      payload,
    }
  })
}
