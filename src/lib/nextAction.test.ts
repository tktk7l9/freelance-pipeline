import { describe, expect, it } from 'vitest'

import { CASE_STATUSES } from './status'
import { nextActionSuggestions } from './nextAction'

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
