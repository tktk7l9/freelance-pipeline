import { describe, expect, it } from 'vitest'

import {
  DUE_COLOR,
  dueLabel,
  dueState,
  groupByDue,
  postponeDue,
  quickDueOptions,
  type DueState,
  withDue,
} from './deadlines'

describe('deadlines', () => {
  it('due state', () => {
    expect(dueState('2030-01-01', '2030-01-02')).toBe('overdue')
    expect(dueState('2030-01-02', '2030-01-02')).toBe('today')
    expect(dueState('2030-01-05', '2030-01-02')).toBe('soon')
    expect(dueState('2030-01-06', '2030-01-02')).toBe('later')
  })

  it('DUE_COLOR has every DueState', () => {
    const states: DueState[] = ['overdue', 'today', 'soon', 'later']
    for (const s of states) {
      expect(typeof DUE_COLOR[s]).toBe('string')
      expect(DUE_COLOR[s].length).toBeGreaterThan(0)
    }
  })

  it('only cases with a deadline, ascending', () => {
    const items = [
      { id: 'a', nextActionDue: '2030-01-05' },
      { id: 'b', nextActionDue: null },
      { id: 'c', nextActionDue: '2030-01-01' },
    ]
    expect(withDue(items).map((i) => i.id)).toEqual(['c', 'a'])
  })

  it('groupByDue: an empty array gives an empty array', () => {
    expect(groupByDue([])).toEqual([])
  })

  it('groupByDue: groups by date, dates ascending, input order kept within a group', () => {
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
  it('overdue, today, N days left, and null beyond that', () => {
    expect(dueLabel('2030-01-04', '2030-01-05')).toBe('期限切れ')
    expect(dueLabel('2030-01-05', '2030-01-05')).toBe('今日')
    expect(dueLabel('2030-01-07', '2030-01-05')).toBe('あと2日')
    expect(dueLabel('2030-01-08', '2030-01-05')).toBe('あと3日')
    expect(dueLabel('2030-01-09', '2030-01-05')).toBeNull()
  })
})

describe('postponeDue', () => {
  it('shifts by N days from the deadline if it is ahead, from today if overdue', () => {
    expect(postponeDue('2030-01-10', '2030-01-05', 1)).toBe('2030-01-11')
    expect(postponeDue('2030-01-01', '2030-01-05', 1)).toBe('2030-01-06')
    expect(postponeDue('2030-01-05', '2030-01-05', 7)).toBe('2030-01-12')
    expect(postponeDue('2030-01-31', '2030-01-05', 1)).toBe('2030-02-01')
  })
})

describe('quickDueOptions', () => {
  it('returns tomorrow, in 3 days and in 1 week computed from today (choose a result instead of typing a value, SHIG 45)', () => {
    expect(quickDueOptions('2030-12-30')).toEqual([
      { label: '明日', date: '2030-12-31' },
      { label: '3日後', date: '2031-01-02' },
      { label: '1週間後', date: '2031-01-06' },
    ])
  })
})
