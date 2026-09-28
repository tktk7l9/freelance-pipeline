import { describe, expect, it } from 'vitest'

import { CASE_STATUSES } from './status'
import { isFreshSignal, nextActionSuggestions } from './nextAction'

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
