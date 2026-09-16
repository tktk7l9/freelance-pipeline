import { describe, expect, it } from 'vitest'

import { memoInput, nextActionInput, statusChangeInput } from './cases.schema'

const id = '11111111-1111-1111-1111-111111111111'

describe('cases.schema', () => {
  it('ステータスは既知の値のみ', () => {
    expect(statusChangeInput.safeParse({ id, to: 'meeting' }).success).toBe(true)
    expect(statusChangeInput.safeParse({ id, to: 'nope' }).success).toBe(false)
  })
  it('次の一手は空→null、期日は YYYY-MM-DD か null', () => {
    const r = nextActionInput.parse({ id, nextAction: '  ', nextActionDue: null })
    expect(r.nextAction).toBeNull()
    expect(
      nextActionInput.safeParse({ id, nextAction: 'x', nextActionDue: '2030-1-1' }).success,
    ).toBe(false)
  })
  it('メモは本文必須', () => {
    expect(memoInput.safeParse({ id, body: '', date: '2030-01-01' }).success).toBe(false)
  })
})
