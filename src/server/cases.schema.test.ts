import { describe, expect, it } from 'vitest'

import { memoInput, nextActionInput, statusChangeInput } from './cases.schema'

const id = '11111111-1111-1111-1111-111111111111'

describe('cases.schema', () => {
  it('status accepts known values only', () => {
    expect(statusChangeInput.safeParse({ id, to: 'meeting' }).success).toBe(true)
    expect(statusChangeInput.safeParse({ id, to: 'nope' }).success).toBe(false)
  })
  it('an empty next action becomes null; the deadline is YYYY-MM-DD or null', () => {
    const r = nextActionInput.parse({ id, nextAction: '  ', nextActionDue: null })
    expect(r.nextAction).toBeNull()
    expect(
      nextActionInput.safeParse({ id, nextAction: 'x', nextActionDue: '2030-1-1' }).success,
    ).toBe(false)
  })
  it('a memo requires a body', () => {
    expect(memoInput.safeParse({ id, body: '', date: '2030-01-01' }).success).toBe(false)
  })
})
