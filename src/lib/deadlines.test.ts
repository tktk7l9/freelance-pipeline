import { describe, expect, it } from 'vitest'

import { DUE_COLOR, dueState, withDue, type DueState } from './deadlines'

describe('deadlines', () => {
  it('期限状態', () => {
    expect(dueState('2030-01-01', '2030-01-02')).toBe('overdue')
    expect(dueState('2030-01-02', '2030-01-02')).toBe('today')
    expect(dueState('2030-01-05', '2030-01-02')).toBe('soon')
    expect(dueState('2030-01-06', '2030-01-02')).toBe('later')
  })

  it('DUE_COLOR は全ての DueState を持つ', () => {
    const states: DueState[] = ['overdue', 'today', 'soon', 'later']
    for (const s of states) {
      expect(typeof DUE_COLOR[s]).toBe('string')
      expect(DUE_COLOR[s].length).toBeGreaterThan(0)
    }
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
