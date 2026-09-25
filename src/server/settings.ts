import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { getDb } from '../db/client'
import { isInvoiceNumber } from '../lib/business'
import {
  readAxes,
  readBusiness,
  readImprovements,
  readThresholds,
  writeSetting,
} from './repository'
import { dateField, nullableText } from './zod'

export const getSettingsData = createServerFn().handler(async () => {
  const db = getDb()
  const [thresholds, axes, business, improvements] = await Promise.all([
    readThresholds(db),
    readAxes(db),
    readBusiness(db),
    readImprovements(db),
  ])
  return { thresholds, axes, business, improvements }
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

/** ホームに出す「改善したいこと」。1 項目 300 字・50 項目まで */
export const saveImprovements = createServerFn({ method: 'POST' })
  .validator(z.object({ items: z.array(z.string().trim().min(1).max(300)).max(50) }))
  .handler(async ({ data }) => {
    await writeSetting(getDb(), 'improvements', JSON.stringify(data.items))
    return { ok: true as const }
  })

export const businessInput = z.object({
  birthDate: dateField.nullable(),
  openedOn: dateField.nullable(),
  occupation: nullableText(200),
  description: nullableText(200),
  filingType: z.enum(['blue', 'white']).nullable(),
  taxOffice: nullableText(200),
  taxAddress: nullableText(200),
  invoiceNumber: nullableText(200).refine(
    (v) => v === null || isInvoiceNumber(v),
    'T + 数字13桁の形式（例: T1234567890123）',
  ),
  invoiceRegisteredOn: dateField.nullable(),
  etaxUserId: nullableText(200).refine((v) => v === null || /^\d{16}$/.test(v), '数字16桁の形式'),
  businessNumber: nullableText(200),
})

export const saveBusiness = createServerFn({ method: 'POST' })
  .validator(businessInput)
  .handler(async ({ data }) => {
    await writeSetting(getDb(), 'business', JSON.stringify(data))
    return { ok: true as const }
  })
