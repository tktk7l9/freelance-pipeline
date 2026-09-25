import { beforeEach, describe, expect, it } from 'vitest'

import { cases } from '../../db/schema'
import { deleteCase } from './cases'
import { deleteEvent, getEvent, listEventsBetween, upsertEvent } from './events'
import { db, fakeCase, reset } from './test-helpers'

beforeEach(reset)

const values = {
  title: '商談',
  kind: 'meeting' as const,
  allDay: false,
  startsAt: '2030-01-05T10:00:00+09:00',
  endsAt: '2030-01-05T11:00:00+09:00',
  caseId: null,
  note: null,
}

describe('events repository', () => {
  it('挿入・更新・削除', async () => {
    const id = await upsertEvent(db, values)
    expect((await getEvent(db, id))?.title).toBe('商談')
    await upsertEvent(db, { ...values, id, title: '面談', kind: 'interview' })
    const row = await getEvent(db, id)
    expect(row?.title).toBe('面談')
    expect(row?.kind).toBe('interview')
    await deleteEvent(db, id)
    expect(await getEvent(db, id)).toBeNull()
  })

  it('範囲は日付キーで切り、開始順に並ぶ。終日（日付だけ）も同じ範囲に入る', async () => {
    await upsertEvent(db, { ...values, startsAt: '2030-01-20T15:00:00+09:00', endsAt: null })
    await upsertEvent(db, { ...values, startsAt: '2030-01-20', endsAt: null, allDay: true })
    await upsertEvent(db, { ...values, startsAt: '2030-02-01', endsAt: null, allDay: true })
    const rows = await listEventsBetween(db, '2030-01-01', '2030-01-31')
    expect(rows.map((r) => r.startsAt)).toEqual(['2030-01-20', '2030-01-20T15:00:00+09:00'])
  })

  it('案件を消しても予定は残り、紐づけだけ外れる', async () => {
    const { id: caseId, ...caseValues } = fakeCase()
    await db.insert(cases).values({ ...caseValues, id: caseId })
    const id = await upsertEvent(db, { ...values, caseId })
    expect((await getEvent(db, id))?.caseId).toBe(caseId)
    await deleteCase(db, caseId)
    expect((await getEvent(db, id))?.caseId).toBeNull()
  })
})
