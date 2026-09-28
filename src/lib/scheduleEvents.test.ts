import { describe, expect, it } from 'vitest'

import {
  dayListTimeLabel,
  dueToScheduleEvents,
  eventsOnDay,
  toScheduleEvents,
  toScheduleStamp,
  type CalendarEventRow,
} from './scheduleEvents'

const base: CalendarEventRow = {
  id: 'e1',
  title: '予定',
  kind: 'meeting',
  startsAt: '2030-01-05',
  endsAt: null,
  allDay: true,
}
const ev = (o: Partial<CalendarEventRow>): CalendarEventRow => ({ ...base, ...o })

describe('toScheduleStamp', () => {
  it('時刻あり／日付だけ', () => {
    expect(toScheduleStamp('2030-01-05T13:00:00+09:00')).toBe('2030-01-05 13:00:00')
    expect(toScheduleStamp('2030-01-05')).toBe('2030-01-05 00:00:00')
  })
})

describe('toScheduleEvents', () => {
  it('終日は 00:00:00〜翌日 00:00:00、色は種別', () => {
    const [r] = toScheduleEvents([ev({ id: 'a', kind: 'meeting', allDay: true })])
    expect(r).toEqual({
      id: 'a',
      title: '予定',
      start: '2030-01-05 00:00:00',
      end: '2030-01-06 00:00:00',
      color: 'indigo',
      payload: { kind: 'own', eventId: 'a', past: false },
    })
  })
  it('日付のみの startsAt は allDay が無くても終日扱い', () => {
    const [r] = toScheduleEvents([ev({ kind: 'interview', allDay: false })])
    expect(r.start).toBe('2030-01-05 00:00:00')
    expect(r.color).toBe('teal')
  })
  it('終了時刻あり', () => {
    const [r] = toScheduleEvents([
      ev({
        kind: 'deadline',
        startsAt: '2030-01-07T10:00:00+09:00',
        endsAt: '2030-01-07T11:30:00+09:00',
        allDay: false,
      }),
    ])
    expect(r.start).toBe('2030-01-07 10:00:00')
    expect(r.end).toBe('2030-01-07 11:30:00')
    expect(r.color).toBe('orange')
  })
  it('終了なしは 60 分後。日をまたぐ場合は翌日', () => {
    const [a, b] = toScheduleEvents([
      ev({ id: 'a', startsAt: '2030-01-07T10:00:00+09:00', allDay: false }),
      ev({ id: 'b', startsAt: '2030-01-31T23:30:00+09:00', allDay: false }),
    ])
    expect(a.end).toBe('2030-01-07 11:00:00')
    expect(b.end).toBe('2030-02-01 00:30:00')
  })
  it('nowIso を渡すと終わった予定はグレーで past', () => {
    const [past, future] = toScheduleEvents(
      [
        ev({ id: 'p', startsAt: '2030-01-05T09:00:00+09:00', allDay: false }),
        ev({ id: 'f', startsAt: '2030-01-05T15:00:00+09:00', allDay: false }),
      ],
      '2030-01-05T12:00:00+09:00',
    )
    expect(past.color).toBe('gray')
    expect(past.payload?.past).toBe(true)
    expect(future.color).toBe('indigo')
    expect(future.payload?.past).toBe(false)
  })
})

describe('dueToScheduleEvents', () => {
  it('期日を終日の情報レイヤーにし、今日より前は past', () => {
    const rows = dueToScheduleEvents(
      [
        { id: 'c1', company: '甲社', nextAction: '返信する', nextActionDue: '2030-01-04' },
        { id: 'c2', company: '乙社', nextAction: null, nextActionDue: '2030-01-06' },
      ],
      '2030-01-05',
    )
    expect(rows[0]).toEqual({
      id: 'due-c1',
      title: '甲社: 返信する',
      start: '2030-01-04 00:00:00',
      end: '2030-01-05 00:00:00',
      color: 'gray',
      payload: { kind: 'due', caseId: 'c1', past: true },
    })
    expect(rows[1].title).toBe('乙社: 期日')
    expect(rows[1]?.payload?.past).toBe(false)
  })
  it('todayKey を省くと past にならない', () => {
    const [r] = dueToScheduleEvents([
      { id: 'c', company: '甲社', nextAction: null, nextActionDue: '2020-01-01' },
    ])
    expect(r.payload?.past).toBe(false)
  })
})

describe('eventsOnDay', () => {
  it('その日にかかる予定を開始順に返す（スマホの「選んだ日の予定」, SHIG 82）', () => {
    const items = [
      { id: 'b', start: '2030-01-05 13:00:00', end: '2030-01-05 14:00:00' },
      { id: 'a', start: '2030-01-05 00:00:00', end: '2030-01-06 00:00:00' },
      { id: 'c', start: '2030-01-04 00:00:00', end: '2030-01-05 00:00:00' },
      { id: 'd', start: '2030-01-04 22:00:00', end: '2030-01-05 01:00:00' },
      { id: 'e', start: '2030-01-06 00:00:00', end: '2030-01-07 00:00:00' },
    ]
    expect(eventsOnDay(items, '2030-01-05').map((e) => e.id)).toEqual(['d', 'a', 'b'])
    expect(eventsOnDay(items, '2030-01-08')).toEqual([])
  })
  it('Date で渡された開始・終了も壁時計の時刻で比べる', () => {
    const dated = [
      { id: 'x', start: new Date(2030, 0, 5, 9, 0, 0), end: new Date(2030, 0, 5, 10, 0, 0) },
    ]
    expect(eventsOnDay(dated, '2030-01-05').map((e) => e.id)).toEqual(['x'])
    expect(eventsOnDay(dated, '2030-01-06')).toEqual([])
  })
})

describe('dayListTimeLabel', () => {
  it('期日・終日・開始時刻', () => {
    const [due] = dueToScheduleEvents([
      { id: 'c', company: '甲社', nextAction: null, nextActionDue: '2030-01-05' },
    ])
    expect(dayListTimeLabel(due)).toBe('期日')
    const [allDay, timed] = toScheduleEvents([
      ev({ id: 'a' }),
      ev({ id: 'b', allDay: false, startsAt: '2030-01-05T13:30:00+09:00' }),
    ])
    expect(dayListTimeLabel(allDay)).toBe('終日')
    expect(dayListTimeLabel(timed)).toBe('13:30')
    expect(dayListTimeLabel({ start: '2030-01-05 00:00:00', end: '2030-01-05 09:00:00' })).toBe(
      '00:00',
    )
  })
})
