import { z } from 'zod'

import { LEDGER_KINDS } from '../lib/enums'
import { idField, nullableText } from './zod'

/** zod split out from the createServerFn wrapper (so plain workers tests can test it directly) */
export const ledgerInput = z.object({
  id: idField.optional(),
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/, '年月は YYYY-MM'),
  kind: z.enum(LEDGER_KINDS),
  party: nullableText(100),
  caseId: idField.nullable(),
  amount: z.number().int().min(0).max(1_000_000_000),
  note: nullableText(2000),
})
export type LedgerInput = z.input<typeof ledgerInput>
export type LedgerValues = z.output<typeof ledgerInput>
