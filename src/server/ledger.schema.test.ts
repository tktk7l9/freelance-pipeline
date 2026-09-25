import { describe, expect, it } from 'vitest'

import { ledgerInput } from './ledger.schema'

const base = {
  yearMonth: '2030-01',
  kind: 'freelance' as const,
  party: ' レバテック ',
  caseId: null,
  amount: 880_000,
  note: '',
}

describe('ledger.schema', () => {
  it('前後の空白を落とし、空メモは null', () => {
    const r = ledgerInput.parse(base)
    expect(r.party).toBe('レバテック')
    expect(r.note).toBeNull()
  })
  it('年月の形・種別・金額の範囲を検証する', () => {
    expect(ledgerInput.safeParse({ ...base, yearMonth: '2030/01' }).success).toBe(false)
    expect(ledgerInput.safeParse({ ...base, kind: 'nope' }).success).toBe(false)
    expect(ledgerInput.safeParse({ ...base, amount: -1 }).success).toBe(false)
    expect(ledgerInput.safeParse({ ...base, amount: 1.5 }).success).toBe(false)
  })
})
