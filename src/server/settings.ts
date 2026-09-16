import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { getDb } from '../db/client'
import { readAxes, readThresholds, writeSetting } from './repository'

export const getSettingsData = createServerFn().handler(async () => {
  const db = getDb()
  const [thresholds, axes] = await Promise.all([readThresholds(db), readAxes(db)])
  return { thresholds, axes }
})

const nullableNumber = z.number().int().min(0).nullable()

export const thresholdsInput = z.object({
  minMonthlyIncl: nullableNumber,
  minHourlyExcl: nullableNumber,
  targetStart: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'YYYY-MM')
    .nullable(),
  maxOnsitePerMonth: nullableNumber,
})

export const saveThresholds = createServerFn({ method: 'POST' })
  .validator(thresholdsInput)
  .handler(async ({ data }) => {
    await writeSetting(getDb(), 'thresholds', JSON.stringify(data))
    return { ok: true as const }
  })

export const saveAxes = createServerFn({ method: 'POST' })
  .validator(z.object({ axes: z.array(z.string().trim().min(1).max(40)).max(10) }))
  .handler(async ({ data }) => {
    await writeSetting(getDb(), 'axes', JSON.stringify(data.axes))
    return { ok: true as const }
  })
