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
 * 収入タブ用。台帳の全行と、着地見込みに使う「参画中案件の月額」、案件の選択肢、今日。
 * 集計は lib/ledger.ts（純粋関数）で画面側が行う。
 */
export const ledgerData = createServerFn().handler(async () => {
  const db = getDb()
  const [rows, cases] = await Promise.all([listRows(db), listCases(db)])
  // 見込みの材料。期間を持たせ、終了した案件や開始前の案件を月ごとに外す（日割りは lib）
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
