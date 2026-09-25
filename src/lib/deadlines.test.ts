import { describe, expect, it } from 'vitest'

import { DUE_COLOR, dueLabel, dueState, groupByDue, type DueState, withDue } from './deadlines'

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

  it('groupByDue: 空配列は空配列', () => {
    expect(groupByDue([])).toEqual([])
  })

  it('groupByDue: 日付ごとにまとめ、日付昇順・グループ内は入力順を保つ', () => {
    const a = { id: 'a', nextActionDue: '2030-01-05' }
    const b = { id: 'b', nextActionDue: '2030-01-01' }
    const c = { id: 'c', nextActionDue: '2030-01-05' }
    expect(groupByDue([a, b, c])).toEqual([
      { date: '2030-01-01', items: [b] },
      { date: '2030-01-05', items: [a, c] },
    ])
  })
})

describe('dueLabel', () => {
  it('期限切れ・今日・あと N 日・それより先は null', () => {
    expect(dueLabel('2030-01-04', '2030-01-05')).toBe('期限切れ')
    expect(dueLabel('2030-01-05', '2030-01-05')).toBe('今日')
    expect(dueLabel('2030-01-07', '2030-01-05')).toBe('あと2日')
    expect(dueLabel('2030-01-08', '2030-01-05')).toBe('あと3日')
    expect(dueLabel('2030-01-09', '2030-01-05')).toBeNull()
  })
})
