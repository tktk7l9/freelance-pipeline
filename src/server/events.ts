import { createServerFn } from '@tanstack/react-start'

import { getDb } from '../db/client'
import { dateKey, toJstIso } from '../lib/calendar'
import { withDue } from '../lib/deadlines'
import { statusGroup } from '../lib/status'
import { eventInput, eventRangeInput } from './events.schema'
import {
  deleteEvent as deleteEventRow,
  listCases,
  listEventsBetween as listEventsRows,
  upsertEvent,
} from './repository'
import { idInput } from './zod'

export { eventInput }
export type { EventInput } from './events.schema'

/**
 * 予定タブ用。日/週/月ビューが跨ぐ期間の自分の予定と、進行中の案件の「次の一手」の期日
 * （情報レイヤー）をまとめて返す。「今」はサーバーで決める（端末の時計に依らない）。
 */
export const listEventsBetween = createServerFn()
  .validator(eventRangeInput)
  .handler(async ({ data }) => {
    const db = getDb()
    const [events, cases] = await Promise.all([
      listEventsRows(db, data.from, data.to),
      listCases(db),
    ])
    const now = toJstIso(new Date())
    const active = cases.filter((c) => statusGroup(c.status) === 'active')
    return {
      events,
      due: withDue(active)
        .filter((c) => c.nextActionDue >= data.from && c.nextActionDue <= data.to)
        .map((c) => ({
          id: c.id,
          company: c.company,
          nextAction: c.nextAction,
          nextActionDue: c.nextActionDue,
        })),
      caseOptions: cases.map((c) => ({ id: c.id, label: `${c.company}｜${c.title}` })),
      todayKey: dateKey(now),
      nowIso: now,
    }
  })

export const saveEvent = createServerFn({ method: 'POST' })
  .validator(eventInput)
  .handler(async ({ data }) => ({ id: await upsertEvent(getDb(), data) }))

export const deleteEvent = createServerFn({ method: 'POST' })
  .validator(idInput)
  .handler(async ({ data }) => {
    await deleteEventRow(getDb(), data.id)
    return { ok: true as const }
  })
