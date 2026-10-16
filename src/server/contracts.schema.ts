import { z } from 'zod'

import { idField, nullableText } from './zod'

const YEAR_MONTH_OR_DATE = /^\d{4}-\d{2}(-\d{2})?$/
const nullableInt = (min: number, max: number) => z.number().int().min(min).max(max).nullable()

/**
 * Input of the contract form. Split out from contracts.ts (the createServerFn wrapper) so plain
 * workers tests can import it (same reason as cases.schema.ts). Amounts are tax included.
 */
export const contractInput = z
  .object({
    id: idField.optional(),
    caseId: idField,
    startDate: z.string().regex(YEAR_MONTH_OR_DATE, '開始は 2030-11 か 2030-11-16 の形'),
    endDate: z.string().regex(YEAR_MONTH_OR_DATE, '終了は 2030-12 か 2030-12-31 の形').nullable(),
    monthlyIncl: z.number().int().min(1).max(100_000_000),
    settlementMinH: nullableInt(1, 400),
    settlementMaxH: nullableInt(1, 400),
    overtimeRate: nullableInt(0, 1_000_000),
    deductionRate: nullableInt(0, 1_000_000),
    orderNo: nullableText(100),
    note: nullableText(2000),
  })
  .refine((v) => v.endDate === null || v.endDate >= v.startDate, {
    message: '終了が開始より前です',
    path: ['endDate'],
  })
  .refine(
    (v) =>
      v.settlementMinH === null ||
      v.settlementMaxH === null ||
      v.settlementMinH <= v.settlementMaxH,
    { message: '精算幅の下限が上限を超えています', path: ['settlementMinH'] },
  )
export type ContractInput = z.input<typeof contractInput>
export type ContractValues = z.output<typeof contractInput>
