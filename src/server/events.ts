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
 * For the schedule tab. Returns my events in the period spanned by the day/week/month views together with the due dates
 * of in-progress cases' "next step" (info layer). "Now" is decided on the server (independent of the device clock).
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
