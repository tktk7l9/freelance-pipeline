import { describe, expect, it } from 'vitest'

import { dueState, withDue } from './deadlines'

describe('deadlines', () => {
  it('期限状態', () => {
    expect(dueState('2030-01-01', '2030-01-02')).toBe('overdue')
    expect(dueState('2030-01-02', '2030-01-02')).toBe('today')
    expect(dueState('2030-01-05', '2030-01-02')).toBe('soon')
    expect(dueState('2030-01-06', '2030-01-02')).toBe('later')
  })

  it('期日ありだけを昇順に', () => {
    const items = [
      { id: 'a', nextActionDue: '2030-01-05' },
      { id: 'b', nextActionDue: null },
      { id: 'c', nextActionDue: '2030-01-01' },
    ]
    expect(withDue(items).map((i) => i.id)).toEqual(['c', 'a'])
  })
})
