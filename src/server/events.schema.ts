import { z } from 'zod'

import { composeStartsAt } from '../lib/calendar'
import { EVENT_KINDS } from '../lib/enums'
import { dateField, idField, nullableText, timeField } from './zod'

/**
 * 予定フォームの入力。events.ts（createServerFn のラッパー）から分離しているのは
 * 素の workers テストから import できるようにするため（cases.schema.ts と同じ理由）。
 */
export const eventInput = z
  .object({
    id: idField.optional(),
    title: z.string().trim().min(1, 'タイトルは必須です').max(200),
    kind: z.enum(EVENT_KINDS),
    date: dateField,
    allDay: z.boolean(),
    startTime: timeField.nullable(),
    endTime: timeField.nullable(),
    caseId: idField.nullable(),
    note: nullableText(2000),
  })
  .refine((v) => v.allDay || v.startTime !== null, {
    message: '開始時刻を入れてください',
    path: ['startTime'],
  })
  .refine((v) => v.allDay || !v.startTime || !v.endTime || v.endTime > v.startTime, {
    message: '終了時刻は開始より後にしてください',
    path: ['endTime'],
  })
  .transform(({ date, startTime, endTime, ...rest }) => ({
    ...rest,
    startsAt: composeStartsAt(date, rest.allDay ? null : startTime),
    endsAt: rest.allDay || !endTime ? null : composeStartsAt(date, endTime),
  }))
export type EventInput = z.input<typeof eventInput>
export type EventValues = z.output<typeof eventInput>

export const eventRangeInput = z.object({ from: dateField, to: dateField })
