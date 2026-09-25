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
  it('時刻ありは +09:00 付きの startsAt に組み立て、空メモは null', () => {
    const r = eventInput.parse({ ...base, endTime: '11:00', caseId: id })
    expect(r.startsAt).toBe('2030-01-05T10:00:00+09:00')
    expect(r.endsAt).toBe('2030-01-05T11:00:00+09:00')
    expect(r.note).toBeNull()
    expect(r.caseId).toBe(id)
  })
  it('終日は日付だけ。時刻は捨てる', () => {
    const r = eventInput.parse({ ...base, allDay: true, startTime: '10:00', endTime: '11:00' })
    expect(r.startsAt).toBe('2030-01-05')
    expect(r.endsAt).toBeNull()
  })
  it('終日でないのに開始時刻が無い／終了が開始より前は弾く', () => {
    expect(eventInput.safeParse({ ...base, startTime: null }).success).toBe(false)
    expect(eventInput.safeParse({ ...base, endTime: '09:00' }).success).toBe(false)
  })
  it('タイトル空・日付の形・種別は検証する', () => {
    expect(eventInput.safeParse({ ...base, title: '  ' }).success).toBe(false)
    expect(eventInput.safeParse({ ...base, date: '2030/01/05' }).success).toBe(false)
    expect(eventInput.safeParse({ ...base, kind: 'nope' }).success).toBe(false)
  })
})
