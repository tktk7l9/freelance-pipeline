import type { ScheduleEventData } from '@mantine/schedule'

import { addDays, dateKey, splitStartsAt } from './calendar'
import type { EventKind } from './enums'

/** My own events shown on the calendar (the columns of a DB events row needed for rendering) */
export type CalendarEventRow = {
  id: string
  title: string
  kind: EventKind
  startsAt: string
  endsAt: string | null
  allDay: boolean
}

/** Info layer: due dates of cases' "next step" */
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

/** Color for finished events. Drops the kind color for gray to tell them apart from upcoming ones */
export const PAST_EVENT_COLOR = 'gray'

/**
 * Normalizes "now" ('YYYY-MM-DDTHH:MM:SS+09:00' or 'YYYY-MM-DD') to the same
 * 'YYYY-MM-DD HH:mm:ss' as Schedule. Both are JST wall-clock times, so string comparison decides order.
 */
export function toScheduleStamp(nowIso: string): string {
  const date = dateKey(nowIso)
  return `${date} ${nowIso.length > 10 ? nowIso.slice(11, 19) : '00:00:00'}`
}

/** Adds 60 minutes to 'HH:MM'. If it crosses midnight, date moves to the next day too */
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
 * Converts events to @mantine/schedule ScheduleEventData (pure function).
 * All-day (allDay, or startsAt is date-only) spans 'YYYY-MM-DD 00:00:00' to the next day 00:00:00.
 * Timed events use startsAt/endsAt as is; without endsAt the end is 60 minutes after the start.
 * Passing `nowIso` grays out finished events (ending before "now") and sets payload.past.
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
 * Draws due dates of cases' "next step" as an info layer (all-day, outline only, click goes to the case).
 * ids are prefixed with `due-` so they never collide with my own events. Due dates before `todayKey` are past.
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
