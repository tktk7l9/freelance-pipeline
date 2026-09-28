import { describe, expect, it } from 'vitest'

import { CASE_STATUSES } from './status'
import { isFreshSignal, nextActionSuggestions, pendingFocus } from './nextAction'

describe('nextActionSuggestions', () => {
  it('どの状態でも配列を返す（候補が無い状態は空）', () => {
    for (const s of CASE_STATUSES) expect(Array.isArray(nextActionSuggestions(s))).toBe(true)
    expect(nextActionSuggestions('rejected')).toEqual([])
  })
  it('商談・内定には定型の次の一手がある（SHIG 51）', () => {
    expect(nextActionSuggestions('meeting')).toContain('面談日程を返信する')
    expect(nextActionSuggestions('offer').length).toBeGreaterThan(0)
  })
})

describe('isFreshSignal', () => {
  it('親が数を進めたときだけ真（初期値 0 は何もしない）', () => {
    expect(isFreshSignal(0, 0)).toBe(false)
    expect(isFreshSignal(0, 1)).toBe(true)
    expect(isFreshSignal(1, 2)).toBe(true)
  })
  it('作り直された部品は、すでにある値を新しい合図とみなさない', () => {
    // Remount after saving: the ref starts at the current signal, so no replay
    const signal = 3
    expect(isFreshSignal(signal, signal)).toBe(false)
  })
})

describe('pendingFocus', () => {
  it('returns nothing until the parent bumps the request', () => {
    expect(pendingFocus(0, { n: 0, target: 'field' })).toBeNull()
  })
  it('after a status change, points at the next-step field (SHIG 41)', () => {
    expect(pendingFocus(0, { n: 1, target: 'field' })).toBe('field')
  })
  it('after saving, points back at the save button so focus does not fall to the page (SHIG 94)', () => {
    expect(pendingFocus(1, { n: 2, target: 'save' })).toBe('save')
  })
  it('does not replay a request the remounted editor already saw', () => {
    expect(pendingFocus(2, { n: 2, target: 'save' })).toBeNull()
  })
})
