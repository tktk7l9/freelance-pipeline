import { z } from 'zod'

import { caseInputSchema } from '../lib/caseInput'
import { CASE_STATUSES } from '../lib/status'
import { dateField, idField, nullableText } from './zod'

/** createServerFn のラッパーから切り離した zod（素の workers テストから直テストするため） */
export const caseSaveInput = z.object({ id: idField.nullable(), values: caseInputSchema })
export const statusChangeInput = z.object({ id: idField, to: z.enum(CASE_STATUSES) })
export const nextActionInput = z.object({
  id: idField,
  nextAction: nullableText(200),
  nextActionDue: dateField.nullable(),
})
export const memoInput = z.object({
  id: idField,
  body: z.string().trim().min(1, 'メモを入れてください').max(4000),
  date: dateField,
})
export const importInput = z.object({ json: z.string().max(200_000) })
