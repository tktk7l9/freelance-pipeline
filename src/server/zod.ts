import { z } from 'zod'

import { UUID_SHAPE } from '../lib/ids'

export const idField = z.string().regex(UUID_SHAPE, 'id の形式が不正です')
export const idInput = z.object({ id: idField })
export const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付は YYYY-MM-DD')
export const timeField = z.string().regex(/^\d{2}:\d{2}$/, '時刻は HH:MM')
export const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v))
    .nullable()
