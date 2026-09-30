import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { deleteEvent, listEventsBetween, saveEvent } from '../../../src/server/events'
import { getCaseDetail } from '../../../src/server/cases'
import { getSettingsData } from '../../../src/server/settings'
import { NO_THRESHOLDS, makeBusiness, makeCase, makeEvent } from '../fixtures'
import { PHONE, setMedia } from '../media'
import { findNotification, renderApp } from '../render'

const meeting = makeEvent({ id: 'e1', title: 'テスト商談', note: '資料' })
const allDay = makeEvent({
  id: 'e2',
  title: '終日の予定',
  kind: 'deadline',
  startsAt: '2030-11-12',
  endsAt: null,
  allDay: true,
})
const past = makeEvent({
  id: 'e3',
  title: '終わった面談',
  kind: 'interview',
  startsAt: '2030-11-12T08:00:00+09:00',
  endsAt: null,
})

/** A row of the phone's day list (the month grid may show the same title too) */
async function dayRow(title: string) {
  const matches = await screen.findAllByText(title)
  const row = matches.map((m) => m.closest('.day-event')).find(Boolean)
  if (!row) throw new Error(`no day-list row for ${title}`)
  return row as HTMLElement
}

function mockEvents(events = [meeting, allDay, past]) {
  vi.mocked(listEventsBetween).mockResolvedValue({
    events,
    due: [{ id: 'c1', company: '甲社', nextAction: '返事をする', nextActionDue: '2030-11-12' }],
    caseOptions: [{ id: 'c1', label: '甲社｜テスト案件' }],
    todayKey: '2030-11-12',
    nowIso: '2030-11-12T09:30:00+09:00',
  } as never)
}

describe('calendar', () => {
  it('loads the visible month and shows the legend in words', async () => {
    mockEvents()
    await renderApp('/calendar?m=2030-11')
    expect(await screen.findByLabelText('色の見方')).toBeInTheDocument()
    expect(listEventsBetween).toHaveBeenCalledWith({
      data: expect.objectContaining({ from: expect.any(String), to: expect.any(String) }),
    })
    const legend = screen.getByLabelText('色の見方')
    expect(within(legend).getByText('終わった予定')).toBeInTheDocument()
    expect(within(legend).getByText('案件の期日（押すと案件へ）')).toBeInTheDocument()
    // Day buttons are read in Japanese order, holidays with their name (SHIG 94)
    expect(screen.getByRole('button', { name: /^2030年11月12日/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2030年11月3日 文化の日' })).toBeInTheDocument()
  })

  it('on a phone, lists the selected day under the month and edits an event from it', async () => {
    setMedia(PHONE)
    mockEvents()
    vi.mocked(saveEvent).mockResolvedValue({ id: 'e1' } as never)
    const { user } = await renderApp('/calendar?m=2030-11&d=2030-11-12')
    const list = (await screen.findByRole('heading', { name: /2030\/11\/12/ })).closest(
      '.mantine-Card-root',
    ) as HTMLElement
    const rows = within(list)
      .getAllByRole('button')
      .filter((b) => b.classList.contains('day-event'))
    expect(rows.map((r) => r.textContent)).toEqual([
      '終日終日の予定',
      '期日甲社: 返事をする',
      '08:00終わった面談',
      '10:00テスト商談',
    ])
    await user.click(rows[3])
    const drawer = screen.getByRole('dialog', { name: '予定を編集' })
    expect(within(drawer).getByRole('textbox', { name: /タイトル/ })).toHaveValue('テスト商談')
    await user.click(within(drawer).getByRole('button', { name: '保存' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await user.click(await dayRow('終日の予定'))
    await user.click(
      within(screen.getByRole('dialog', { name: '予定を編集' })).getByRole('button', {
        name: '閉じる',
      }),
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('deletes an event without asking and puts it back on undo', async () => {
    setMedia(PHONE)
    mockEvents()
    vi.mocked(deleteEvent).mockResolvedValue({ ok: true } as never)
    vi.mocked(saveEvent).mockResolvedValue({ id: 'e9' } as never)
    const { user } = await renderApp('/calendar?m=2030-11&d=2030-11-12')
    await user.click(await dayRow('終日の予定'))
    await user.click(screen.getByRole('button', { name: 'この予定を削除' }))
    expect(deleteEvent).toHaveBeenCalledWith({ data: { id: 'e2' } })
    await findNotification('予定を削除しました')
    await user.click(screen.getByRole('button', { name: '取り消す' }))
    await findNotification('元に戻しました')
    expect(saveEvent).toHaveBeenCalledWith({
      data: {
        title: '終日の予定',
        kind: 'deadline',
        date: '2030-11-12',
        allDay: true,
        startTime: null,
        endTime: null,
        caseId: null,
        note: null,
      },
    })
  })

  it('restores a timed event with its times, and reports a failed delete', async () => {
    setMedia(PHONE)
    mockEvents()
    vi.mocked(deleteEvent).mockResolvedValueOnce({ ok: true } as never)
    vi.mocked(saveEvent).mockResolvedValue({ id: 'e9' } as never)
    const { user } = await renderApp('/calendar?m=2030-11&d=2030-11-12')
    await user.click(await dayRow('テスト商談'))
    await user.click(screen.getByRole('button', { name: 'この予定を削除' }))
    await user.click(await screen.findByRole('button', { name: '取り消す' }))
    await findNotification('元に戻しました')
    expect(vi.mocked(saveEvent).mock.calls[0][0].data).toMatchObject({
      startTime: '10:00',
      endTime: '11:00',
      note: '資料',
    })
    await user.click(await dayRow('終わった面談'))
    vi.mocked(deleteEvent).mockRejectedValueOnce(new Error('network'))
    await user.click(screen.getByRole('button', { name: 'この予定を削除' }))
    await findNotification('削除できませんでした')
  })

  it('opens the case when its due date is tapped', async () => {
    setMedia(PHONE)
    mockEvents()
    vi.mocked(getCaseDetail).mockResolvedValue({
      item: makeCase({ id: 'c1', title: '期日の案件' }),
      log: [],
      companyUrl: null,
      today: '2030-11-12',
    } as never)
    vi.mocked(getSettingsData).mockResolvedValue({
      thresholds: NO_THRESHOLDS,
      axes: [],
      business: makeBusiness(),
      improvements: [],
    } as never)
    const { user, router } = await renderApp('/calendar?m=2030-11&d=2030-11-12')
    await user.click(await dayRow('甲社: 返事をする'))
    await waitFor(() => expect(router.state.location.pathname).toBe('/cases/c1'))
  })

  it('adds an event on the selected day and says when a day is empty', async () => {
    setMedia(PHONE)
    mockEvents([])
    vi.mocked(saveEvent).mockResolvedValue({ id: 'new' } as never)
    const { user, router } = await renderApp('/calendar?m=2030-11&d=2030-11-20')
    expect(
      await screen.findByText('予定はありません。日付を押すとその日の予定が出ます。'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'この日に追加' }))
    const drawer = screen.getByRole('dialog', { name: '予定を追加' })
    await user.type(within(drawer).getByRole('textbox', { name: /タイトル/ }), '新しい予定')
    await user.click(within(drawer).getByRole('button', { name: '保存' }))
    expect(vi.mocked(saveEvent).mock.calls[0][0].data.date).toBe('2030-11-20')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: '予定を追加' }))
    expect(screen.getByRole('dialog', { name: '予定を追加' })).toBeInTheDocument()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '閉じる' }))
    // "今日" brings the month and the selection back to today (SHIG 60)
    await user.click(screen.getAllByRole('button', { name: '今日' })[0])
    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({ m: '2030-11', d: '2030-11-12' }),
    )
  })

  it('selects a day by tapping it and keeps the view in the URL', async () => {
    mockEvents()
    const { user, router } = await renderApp('/calendar?m=2030-11')
    await user.click(await screen.findByRole('button', { name: /^2030年11月20日/ }))
    await waitFor(() => expect(router.state.location.search).toMatchObject({ d: '2030-11-20' }))
    await user.click(screen.getByRole('button', { name: '次へ' }))
    await waitFor(() => expect(router.state.location.search).toMatchObject({ m: '2030-12' }))
  })

  it('keeps day/week/month in the URL but the year view only on screen', async () => {
    mockEvents()
    const { user, router } = await renderApp('/calendar?m=2030-11')
    await user.click(await screen.findByRole('tab', { name: '週表示に切り替え' }))
    await waitFor(() => expect(router.state.location.search).toMatchObject({ v: 'week' }))
    await user.click(screen.getByRole('tab', { name: '年表示に切り替え' }))
    expect(screen.getByRole('tab', { name: '年表示に切り替え' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(router.state.location.search).toMatchObject({ v: 'week' })
  })

  it('switches to the week and day views', async () => {
    mockEvents()
    const { router } = await renderApp('/calendar?m=2030-11&d=2030-11-12&v=week')
    expect(await screen.findByText(/2030\/11\/1\d – 2030\/11\/1\d/)).toBeInTheDocument()
    await router.navigate({ to: '/calendar', search: { d: '2030-11-12', v: 'day' } })
    expect(await screen.findByText('2030/11/12（火）')).toBeInTheDocument()
  })
})
