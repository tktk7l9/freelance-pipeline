import { describe, expect, it } from 'vitest'

import { CASE_STATUSES } from './status'
import { focusAfterSave, isFreshSignal, nextActionSuggestions } from './nextAction'

describe('nextActionSuggestions', () => {
  it('returns an array for every status (empty when there are no suggestions)', () => {
    for (const s of CASE_STATUSES) expect(Array.isArray(nextActionSuggestions(s))).toBe(true)
    expect(nextActionSuggestions('rejected')).toEqual([])
  })
  it('negotiation and offer have fixed next actions (SHIG 51)', () => {
    expect(nextActionSuggestions('meeting')).toContain('面談日程を返信する')
    expect(nextActionSuggestions('offer').length).toBeGreaterThan(0)
  })
})

describe('isFreshSignal', () => {
  it('true only when the parent advanced the count (the initial 0 does nothing)', () => {
    expect(isFreshSignal(0, 0)).toBe(false)
    expect(isFreshSignal(0, 1)).toBe(true)
    expect(isFreshSignal(1, 2)).toBe(true)
  })
  it('a remounted component does not treat the existing value as a new signal', () => {
    // Remount after saving: the ref starts at the current signal, so no replay
    const signal = 3
    expect(isFreshSignal(signal, signal)).toBe(false)
  })
})

describe('focusAfterSave', () => {
  const body = 'body'
  const base = { body, before: 'field', beforeUsable: true, fallback: 'save' }

  it('puts focus back where it was when saving dropped it to the page (SHIG 94)', () => {
    expect(focusAfterSave({ ...base, active: body })).toBe('field')
    expect(focusAfterSave({ ...base, active: null, before: 'save' })).toBe('save')
  })
  it('falls back to the save button when the previous element is gone or was the page itself', () => {
    expect(focusAfterSave({ ...base, active: body, beforeUsable: false })).toBe('save')
    expect(focusAfterSave({ ...base, active: body, before: null })).toBe('save')
    expect(focusAfterSave({ ...base, active: body, before: body })).toBe('save')
  })
  it('does not steal focus the owner already moved elsewhere while saving', () => {
    expect(focusAfterSave({ ...base, active: 'field' })).toBeNull()
    expect(focusAfterSave({ ...base, active: 'other-link', before: 'save' })).toBeNull()
  })
})
