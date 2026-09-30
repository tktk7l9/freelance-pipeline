import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CurrentCase } from '../../../src/components/home/CurrentCase'
import { DueList } from '../../../src/components/home/DueList'
import { Improvements } from '../../../src/components/home/Improvements'
import { PipelineStats } from '../../../src/components/home/PipelineStats'
import { RecentLog } from '../../../src/components/home/RecentLog'
import { saveNextAction } from '../../../src/server/cases'
import { TODAY, makeCase, makeLog } from '../fixtures'
import { findNotification, renderWithRouter } from '../render'

const save = vi.mocked(saveNextAction)

const dueItem = (o: Partial<{ id: string; nextAction: string | null; nextActionDue: string }>) => ({
  id: 'a',
  company: '甲社',
  title: 'テスト案件',
  nextAction: '面談日程を返す',
  nextActionDue: TODAY,
  ...o,
})

describe('DueList', () => {
  it('renders nothing without items', async () => {
    const { container } = await renderWithRouter(<DueList items={[]} sites={{}} today={TODAY} />)
    expect(container.querySelector('h2')).toBeNull()
  })

  it('groups by date with a text urgency label, not color alone', async () => {
    await renderWithRouter(
      <DueList
        items={[
          dueItem({ id: 'a', nextActionDue: '2030-11-09' }),
          dueItem({ id: 'b', nextActionDue: '2030-11-20', nextAction: null }),
        ]}
        sites={{ 甲社: 'https://example.com' }}
        today={TODAY}
      />,
    )
    expect(screen.getByRole('heading', { name: '期日順' })).toBeInTheDocument()
    expect(screen.getByText('2030/11/09')).toBeInTheDocument()
    expect(screen.getByText('期限切れ')).toBeInTheDocument()
    expect(screen.getByText('2030/11/20')).toBeInTheDocument()
    expect(screen.getByText('（次の一手が未設定）')).toBeInTheDocument()
  })

  it('postpones the due date by a week in place and can undo it', async () => {
    save.mockResolvedValue({ ok: true } as never)
    const { user, router } = await renderWithRouter(
      <DueList items={[dueItem({ nextActionDue: '2030-11-12' })]} sites={{}} today={TODAY} />,
    )
    const invalidate = vi.spyOn(router, 'invalidate')
    await user.click(screen.getByRole('button', { name: '期日を 1 週間延ばす' }))
    expect(save).toHaveBeenCalledWith({
      data: { id: 'a', nextAction: '面談日程を返す', nextActionDue: '2030-11-19' },
    })
    expect(invalidate).toHaveBeenCalled()
    await findNotification('期日を 2030/11/19 にしました')
    await user.click(screen.getByRole('button', { name: '取り消す' }))
    await findNotification('元に戻しました')
    expect(save).toHaveBeenLastCalledWith({
      data: { id: 'a', nextAction: '面談日程を返す', nextActionDue: '2030-11-12' },
    })
  })

  it('counts an overdue date from today and sends an empty next step as empty text', async () => {
    save.mockResolvedValue({ ok: true } as never)
    const { user } = await renderWithRouter(
      <DueList
        items={[dueItem({ nextActionDue: '2030-11-01', nextAction: null })]}
        sites={{}}
        today={TODAY}
      />,
    )
    await user.click(screen.getByRole('button', { name: '期日を 1 日延ばす' }))
    expect(save).toHaveBeenCalledWith({
      data: { id: 'a', nextAction: '', nextActionDue: '2030-11-11' },
    })
    await findNotification('期日を 2030/11/11 にしました')
    save.mockRejectedValueOnce(new Error('network'))
    await user.click(screen.getByRole('button', { name: '取り消す' }))
    await findNotification('戻せませんでした')
  })

  it('reports a failed save and re-enables the buttons', async () => {
    save.mockRejectedValue(new Error('network'))
    const { user } = await renderWithRouter(
      <DueList items={[dueItem({})]} sites={{}} today={TODAY} />,
    )
    const week = screen.getByRole('button', { name: '期日を 1 週間延ばす' })
    await user.click(week)
    await findNotification('期日を変えられませんでした')
    await waitFor(() => expect(week).toBeEnabled())
  })
})

describe('CurrentCase', () => {
  it('renders nothing without an active case', async () => {
    const { container } = await renderWithRouter(
      <CurrentCase items={[]} sites={{}} today={TODAY} />,
    )
    expect(container.querySelector('h2')).toBeNull()
  })

  it('stays folded to one line and opens the details on demand', async () => {
    const item = makeCase({
      status: 'joined',
      startDate: '2030-10-01',
      endDate: '2030-12-31',
      nextAction: '更新の意思を伝える',
      nextActionDue: '2030-11-11',
      agentName: '担当A',
      actualMonthlyIncl: 900_000,
      daysPerWeek: '週5',
      workLocation: '東京都千代田区',
      paymentSiteDays: 30,
      note: '判断メモ本文',
      onsiteNote: '月2回',
      remoteType: 'partial',
    })
    const { user } = await renderWithRouter(<CurrentCase items={[item]} sites={{}} today={TODAY} />)
    expect(screen.getByRole('heading', { name: '現在の案件' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'テスト案件' })).toBeInTheDocument()
    expect(screen.getByText(/2030\/10\/01 〜 2030\/12\/31/)).toBeInTheDocument()
    expect(screen.getByText('2030/11/11 あと1日')).toBeInTheDocument()
    const toggle = screen.getByRole('button', { name: '詳しく' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)
    expect(screen.getByRole('button', { name: '閉じる' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Findy（担当A）')).toBeInTheDocument()
    expect(screen.getByText('140〜180h')).toBeInTheDocument()
    expect(screen.getByText('週5')).toBeInTheDocument()
    expect(screen.getByText('一部出社（月2回）')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /東京都千代田区/ })).toBeInTheDocument()
    expect(screen.getByText('30 日')).toBeInTheDocument()
    expect(screen.getByText('実単価・税込')).toBeInTheDocument()
    expect(screen.getByText('判断メモ本文')).toBeInTheDocument()
  })

  it('leaves out empty fields and the next-step line when nothing is set', async () => {
    const item = makeCase({ status: 'joined', settlementMinH: null, settlementMaxH: null })
    const { user } = await renderWithRouter(<CurrentCase items={[item]} sites={{}} today={TODAY} />)
    await user.click(screen.getByRole('button', { name: '詳しく' }))
    expect(screen.queryByText('精算幅')).not.toBeInTheDocument()
    expect(screen.queryByText('作業場所')).not.toBeInTheDocument()
    expect(screen.queryByText('支払サイト')).not.toBeInTheDocument()
    expect(screen.getByText(/2030\/12\/01 〜$/)).toBeInTheDocument()
  })

  it('shows the next step without a due date', async () => {
    await renderWithRouter(
      <CurrentCase
        items={[makeCase({ status: 'joined', nextAction: '週報を出す' })]}
        sites={{}}
        today={TODAY}
      />,
    )
    expect(screen.getByText('週報を出す')).toBeInTheDocument()
  })

  it('shows a due date that is further out without a label', async () => {
    await renderWithRouter(
      <CurrentCase
        items={[makeCase({ status: 'joined', nextActionDue: '2030-12-25' })]}
        sites={{}}
        today={TODAY}
      />,
    )
    expect(screen.getByText('2030/12/25')).toBeInTheDocument()
  })
})

describe('Improvements', () => {
  it('renders nothing when empty', async () => {
    const { container } = await renderWithRouter(<Improvements items={[]} />)
    expect(container.querySelector('h2')).toBeNull()
  })

  it('lists the items and links to settings', async () => {
    const { user, router } = await renderWithRouter(<Improvements items={['一つ目', '二つ目']} />)
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      '一つ目',
      '二つ目',
    ])
    await user.click(screen.getByRole('link', { name: '設定' }))
    expect(router.state.location.pathname).toBe('/settings')
  })
})

describe('RecentLog', () => {
  it('renders nothing when empty', async () => {
    const { container } = await renderWithRouter(<RecentLog items={[]} sites={{}} />)
    expect(container.querySelector('h2')).toBeNull()
  })

  it('describes each entry and links to its case', async () => {
    const { user, router } = await renderWithRouter(
      <RecentLog
        items={[
          {
            ...makeLog({
              kind: 'status',
              fromStatus: 'applied',
              toStatus: 'screening',
              at: '2030-11-05T01:00:00.000Z',
            }),
            caseId: 'case-1',
            company: '甲社',
            title: 'テスト案件',
          },
        ]}
        sites={{}}
      />,
    )
    expect(screen.getByRole('heading', { name: '最近の動き' })).toBeInTheDocument()
    expect(screen.getByText('2030/11/05 10:00')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: '応募 → 書類選考' }))
    expect(router.state.location.pathname).toBe('/cases/case-1')
  })
})

describe('PipelineStats', () => {
  it('shows the count, the median and per-route medians, linking to active cases', async () => {
    const { user, router } = await renderWithRouter(
      <PipelineStats
        activeCount={3}
        medianIncl={880_000}
        byRoute={[
          { route: 'findy', activeCount: 2, medianIncl: 880_000 },
          { route: 'direct', activeCount: 1, medianIncl: null },
        ]}
      />,
    )
    const link = screen.getByRole('link')
    expect(within(link).getByText('進行中')).toBeInTheDocument()
    expect(within(link).getByText('Findy')).toBeInTheDocument()
    expect(within(link).getByText('2 本')).toBeInTheDocument()
    expect(within(link).getAllByText('88万')).toHaveLength(2)
    expect(within(link).getByText('—')).toBeInTheDocument()
    await user.click(link)
    expect(router.state.location.pathname).toBe('/cases')
    expect(router.state.location.search).toEqual({ group: 'active' })
  })

  it('shows a dash for the median when there are no cases', async () => {
    await renderWithRouter(<PipelineStats activeCount={0} medianIncl={null} byRoute={[]} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
