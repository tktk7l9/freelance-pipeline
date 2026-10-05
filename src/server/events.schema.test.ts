import { describe, expect, it } from 'vitest'

import { eventInput } from './events.schema'

const id = '11111111-1111-1111-1111-111111111111'
const base = {
  title: '商談',
  kind: 'meeting' as const,
  date: '2030-01-05',
  allDay: false,
  startTime: '10:00',
  endTime: null,
  caseId: null,
  note: '',
}

describe('events.schema', () => {
  it('builds a timed startsAt with +09:00, and an empty memo becomes null', () => {
    const r = eventInput.parse({ ...base, endTime: '11:00', caseId: id })
    expect(r.startsAt).toBe('2030-01-05T10:00:00+09:00')
    expect(r.endsAt).toBe('2030-01-05T11:00:00+09:00')
    expect(r.note).toBeNull()
    expect(r.caseId).toBe(id)
  })
  it('all-day is the date only; the time is dropped', () => {
    const r = eventInput.parse({ ...base, allDay: true, startTime: '10:00', endTime: '11:00' })
    expect(r.startsAt).toBe('2030-01-05')
    expect(r.endsAt).toBeNull()
  })
  it('rejects a missing start time when not all-day, and an end before the start', () => {
    expect(eventInput.safeParse({ ...base, startTime: null }).success).toBe(false)
    expect(eventInput.safeParse({ ...base, endTime: '09:00' }).success).toBe(false)
  })
  it('validates an empty title, the date shape and the kind', () => {
    expect(eventInput.safeParse({ ...base, title: '  ' }).success).toBe(false)
    expect(eventInput.safeParse({ ...base, date: '2030/01/05' }).success).toBe(false)
    expect(eventInput.safeParse({ ...base, kind: 'nope' }).success).toBe(false)
  })
})
