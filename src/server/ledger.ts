import { createServerFn } from '@tanstack/react-start'

import { getDb } from '../db/client'
import { forecastCases, groupByCase } from '../lib/contract'
import { formatJst } from '../lib/jst'
import { ledgerInput } from './ledger.schema'
import {
  deleteLedgerEntry as deleteRow,
  listCases,
  listContracts,
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
  const [rows, cases, contracts] = await Promise.all([
    listRows(db),
    listCases(db),
    listContracts(db),
  ])
  // Input for the forecast: the signed contracts of joined cases (each with its own amount and period,
  // so a renewal at a new rate changes the months after it); a case without contracts falls back to its row.
  // Prorating of the start and end months is in lib
  const joined = forecastCases(cases, groupByCase(contracts))
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
