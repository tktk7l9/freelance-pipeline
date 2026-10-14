import { describe, expect, it } from 'vitest'

import { contractInput } from './contracts.schema'

const caseId = '11111111-1111-1111-1111-111111111111'
const base = {
  caseId,
  startDate: '2030-10-16',
  endDate: '2030-12-31',
  monthlyIncl: 880_000,
  settlementMinH: 140,
  settlementMaxH: 180,
  overtimeRate: 5_000,
  deductionRate: 6_000,
  orderNo: ' ORD-1 ',
  note: '',
}

describe('contracts.schema', () => {
  it('trims text and turns an empty memo into null', () => {
    const r = contractInput.parse(base)
    expect(r.orderNo).toBe('ORD-1')
    expect(r.note).toBeNull()
    expect(r.id).toBeUndefined()
  })
  it('accepts month-only dates and an open end', () => {
    expect(contractInput.safeParse({ ...base, startDate: '2030-10', endDate: null }).success).toBe(
      true,
    )
  })
  it('rejects a bad date shape, an end before the start, and a settlement floor above the cap', () => {
    expect(contractInput.safeParse({ ...base, startDate: '2030/10/16' }).success).toBe(false)
    const end = contractInput.safeParse({ ...base, endDate: '2030-10-15' })
    expect(end.success).toBe(false)
    expect(end.error?.issues[0].path).toEqual(['endDate'])
    const range = contractInput.safeParse({ ...base, settlementMinH: 190 })
    expect(range.success).toBe(false)
    expect(range.error?.issues[0].path).toEqual(['settlementMinH'])
  })
  it('requires a positive whole-yen monthly fee and a case id', () => {
    expect(contractInput.safeParse({ ...base, monthlyIncl: 0 }).success).toBe(false)
    expect(contractInput.safeParse({ ...base, monthlyIncl: 1.5 }).success).toBe(false)
    expect(contractInput.safeParse({ ...base, caseId: 'nope' }).success).toBe(false)
  })
})
