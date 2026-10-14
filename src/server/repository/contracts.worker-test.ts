import { beforeEach, describe, expect, it } from 'vitest'

import { cases } from '../../db/schema'
import { deleteCase } from './cases'
import {
  deleteContract,
  getContract,
  listContracts,
  listContractsByCase,
  upsertContract,
} from './contracts'
import { db, fakeCase, reset } from './test-helpers'

beforeEach(reset)

async function insertFakeCase() {
  const { id, ...values } = fakeCase()
  await db.insert(cases).values({ ...values, id })
  return id
}

const terms = {
  startDate: '2030-10-16',
  endDate: '2030-12-31',
  monthlyIncl: 880_000,
  settlementMinH: 140,
  settlementMaxH: 180,
  overtimeRate: 5_000,
  deductionRate: 6_000,
  orderNo: 'ORD-1',
  note: null,
}

describe('contracts repository', () => {
  it('insert, update, delete; a case lists its contracts newest first', async () => {
    const caseId = await insertFakeCase()
    const first = await upsertContract(db, { ...terms, caseId })
    const renewal = await upsertContract(db, {
      ...terms,
      caseId,
      startDate: '2031-01-01',
      endDate: null,
      monthlyIncl: 935_000,
    })
    expect((await listContractsByCase(db, caseId)).map((r) => r.id)).toEqual([renewal, first])
    await upsertContract(db, { ...terms, caseId, id: first, monthlyIncl: 900_000, orderNo: null })
    const row = await getContract(db, first)
    expect(row?.monthlyIncl).toBe(900_000)
    expect(row?.orderNo).toBeNull()
    await deleteContract(db, first)
    expect(await getContract(db, first)).toBeNull()
  })

  it('lists every case’s contracts together, and deleting a case removes them', async () => {
    const a = await insertFakeCase()
    const b = await insertFakeCase()
    await upsertContract(db, { ...terms, caseId: a })
    await upsertContract(db, { ...terms, caseId: b })
    await upsertContract(db, { ...terms, caseId: a, startDate: '2031-01-01', endDate: null })
    const all = await listContracts(db)
    expect(all).toHaveLength(3)
    expect(all.filter((r) => r.caseId === a).map((r) => r.startDate)).toEqual([
      '2031-01-01',
      '2030-10-16',
    ])
    await deleteCase(db, a)
    expect((await listContracts(db)).map((r) => r.caseId)).toEqual([b])
  })
})
