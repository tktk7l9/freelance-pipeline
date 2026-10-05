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
  it('trims surrounding whitespace, and an empty memo becomes null', () => {
    const r = ledgerInput.parse(base)
    expect(r.party).toBe('レバテック')
    expect(r.note).toBeNull()
  })
  it('validates the year-month shape, the kind and the amount range', () => {
    expect(ledgerInput.safeParse({ ...base, yearMonth: '2030/01' }).success).toBe(false)
    expect(ledgerInput.safeParse({ ...base, kind: 'nope' }).success).toBe(false)
    expect(ledgerInput.safeParse({ ...base, amount: -1 }).success).toBe(false)
    expect(ledgerInput.safeParse({ ...base, amount: 1.5 }).success).toBe(false)
  })
})
