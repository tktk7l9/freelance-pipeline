import { beforeEach, describe, expect, it } from 'vitest'

import { cases } from '../../db/schema'
import { deleteCase } from './cases'
import { deleteLedgerEntry, getLedgerEntry, listLedger, upsertLedgerEntry } from './ledger'
import { db, fakeCase, reset } from './test-helpers'

beforeEach(reset)

const values = {
  yearMonth: '2030-01',
  kind: 'freelance' as const,
  party: '甲社',
  caseId: null,
  amount: 880_000,
  note: null,
}

describe('ledger repository', () => {
  it('挿入・更新・削除と、年月の新しい順', async () => {
    const a = await upsertLedgerEntry(db, values)
    const b = await upsertLedgerEntry(db, { ...values, yearMonth: '2030-03', kind: 'officer' })
    expect((await listLedger(db)).map((r) => r.id)).toEqual([b, a])
    await upsertLedgerEntry(db, { ...values, id: a, amount: 900_000 })
    expect((await getLedgerEntry(db, a))?.amount).toBe(900_000)
    await deleteLedgerEntry(db, a)
    expect(await getLedgerEntry(db, a)).toBeNull()
  })

  it('案件を消しても行は残り、紐づけだけ外れる', async () => {
    const { id: caseId, ...caseValues } = fakeCase()
    await db.insert(cases).values({ ...caseValues, id: caseId })
    const id = await upsertLedgerEntry(db, { ...values, caseId })
    await deleteCase(db, caseId)
    expect((await getLedgerEntry(db, id))?.caseId).toBeNull()
  })
})
