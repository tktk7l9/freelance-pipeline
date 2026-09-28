import { createServerFn } from '@tanstack/react-start'

import { getDb } from '../db/client'
import { formatJst } from '../lib/jst'
import { ledgerInput } from './ledger.schema'
import {
  deleteLedgerEntry as deleteRow,
  listCases,
  listLedger as listRows,
  upsertLedgerEntry,
} from './repository'
import { idInput } from './zod'

export { ledgerInput }
export type { LedgerInput } from './ledger.schema'

/**
 * For the income tab. All ledger rows, the "monthly amounts of active cases" used for the projected total, the case options, and today.
 * Aggregation is done on the screen side by lib/ledger.ts (pure functions).
 */
export const ledgerData = createServerFn().handler(async () => {
  const db = getDb()
  const [rows, cases] = await Promise.all([listRows(db), listCases(db)])
  // Input for the forecast. Carries the period so ended or not-yet-started cases drop out per month (prorating is in lib)
  const joined = cases
    .filter((c) => c.status === 'joined')
    .map((c) => ({
      monthly: c.actualMonthlyIncl ?? c.monthlyMaxIncl,
      startDate: c.startDate,
      endDate: c.endDate,
    }))
  return {
    rows,
    joined,
    caseOptions: cases.map((c) => ({ id: c.id, label: `${c.company}｜${c.title}` })),
    todayYm: formatJst(new Date().toISOString(), { withTime: false }).slice(0, 7),
  }
})

export const saveLedgerEntry = createServerFn({ method: 'POST' })
  .validator(ledgerInput)
  .handler(async ({ data }) => ({ id: await upsertLedgerEntry(getDb(), data) }))

export const deleteLedgerEntry = createServerFn({ method: 'POST' })
  .validator(idInput)
  .handler(async ({ data }) => {
    await deleteRow(getDb(), data.id)
    return { ok: true as const }
  })
