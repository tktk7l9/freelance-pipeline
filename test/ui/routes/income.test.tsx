import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { deleteLedgerEntry, ledgerData, saveLedgerEntry } from '../../../src/server/ledger'
import type { LedgerRow } from '../../../src/db/schema'
import { makeLedger } from '../fixtures'
import { findNotification, renderApp } from '../render'

function mockLedger(rows: LedgerRow[]) {
  vi.mocked(ledgerData).mockResolvedValue({
    rows,
    joined: [{ monthly: 880_000, startDate: '2030-01-01', endDate: null }],
    caseOptions: [{ id: 'c1', label: '甲社｜テスト案件' }],
    todayYm: '2030-11',
  } as never)
}

// Newest first, like the server returns them
const rows = [
  makeLedger({ id: 'r1', yearMonth: '2030-10', amount: 880_000 }),
  makeLedger({
    id: 'r2',
    yearMonth: '2030-09',
    kind: 'resident_tax',
    party: '市役所',
    amount: 50_000,
    note: '第2期',
  }),
  makeLedger({ id: 'r3', yearMonth: '2029-12', amount: 800_000 }),
]

describe('income', () => {
  it('invites the first record when the year is empty', async () => {
    mockLedger([])
    await renderApp('/income')
    expect(await screen.findByText('2030年の記録はまだありません')).toBeInTheDocument()
    // One year is not a choice, so there is no year switch (SHIG 1)
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  })

  it('summarizes this year, shows rate history, months and entries, and switches year', async () => {
    mockLedger(rows)
    const { user, router } = await renderApp('/income')
    expect(await screen.findByText('手取り（暫定）')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '単価の推移（月額・税込）' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '月別' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '2030/10 フリーランス売上 880,000円 を編集' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /2029\/12/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: '2029年' }))
    await waitFor(() => expect(router.state.location.search).toEqual({ y: 2029 }))
    expect(await screen.findByText('手取り')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '2029/12 フリーランス売上 800,000円 を編集' }),
    ).toBeInTheDocument()
  })

  it('adds a record prefilled from the latest row', async () => {
    mockLedger(rows)
    vi.mocked(saveLedgerEntry).mockResolvedValue({ id: 'new' } as never)
    const { user } = await renderApp('/income')
    await user.click(await screen.findByRole('button', { name: '記録を追加' }))
    const drawer = screen.getByRole('dialog', { name: '収入・支出を追加' })
    expect(within(drawer).getByRole('textbox', { name: /金額/ })).toHaveValue('880,000')
    await user.click(within(drawer).getByRole('button', { name: '保存' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(vi.mocked(saveLedgerEntry).mock.calls[0][0].data).toMatchObject({
      yearMonth: '2030-11',
      kind: 'freelance',
      amount: 880_000,
    })
  })

  it('starts an empty ledger with only this month filled in', async () => {
    mockLedger([])
    const { user } = await renderApp('/income')
    await user.click(await screen.findByRole('button', { name: '記録を追加' }))
    const drawer = screen.getByRole('dialog', { name: '収入・支出を追加' })
    expect(within(drawer).getByRole('textbox', { name: /金額/ })).toHaveValue('')
    await user.click(within(drawer).getByRole('button', { name: '閉じる' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('edits a row, then deletes it without asking and restores it on undo', async () => {
    mockLedger(rows)
    vi.mocked(saveLedgerEntry).mockResolvedValue({ id: 'r2' } as never)
    vi.mocked(deleteLedgerEntry).mockResolvedValue({ ok: true } as never)
    const { user } = await renderApp('/income')
    await user.click(await screen.findByRole('button', { name: '2030/09 住民税 50,000円 を編集' }))
    let drawer = screen.getByRole('dialog', { name: '2030/09 住民税 を編集' })
    await user.click(within(drawer).getByRole('button', { name: '閉じる' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '2030/09 住民税 50,000円 を編集' }))
    drawer = screen.getByRole('dialog', { name: '2030/09 住民税 を編集' })
    await user.click(within(drawer).getByRole('button', { name: '保存' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: '2030/09 住民税 50,000円 を編集' }))
    drawer = screen.getByRole('dialog', { name: '2030/09 住民税 を編集' })
    await user.click(within(drawer).getByRole('button', { name: 'この行を削除' }))
    expect(deleteLedgerEntry).toHaveBeenCalledWith({ data: { id: 'r2' } })
    await findNotification('削除しました')
    await user.click(screen.getByRole('button', { name: '取り消す' }))
    await findNotification('元に戻しました')
    expect(saveLedgerEntry).toHaveBeenLastCalledWith({
      data: {
        yearMonth: '2030-09',
        kind: 'resident_tax',
        party: '市役所',
        caseId: null,
        amount: 50_000,
        note: '第2期',
      },
    })
  })

  it('restores a row without payer or memo as empty text, and reports a failed delete', async () => {
    const bare = makeLedger({
      id: 'r9',
      yearMonth: '2030-08',
      party: null,
      note: null,
      amount: 1_000,
    })
    mockLedger([bare])
    vi.mocked(deleteLedgerEntry).mockResolvedValueOnce({ ok: true } as never)
    vi.mocked(saveLedgerEntry).mockResolvedValue({ id: 'r9' } as never)
    const { user } = await renderApp('/income')
    const open = async () =>
      user.click(
        await screen.findByRole('button', { name: '2030/08 フリーランス売上 1,000円 を編集' }),
      )
    await open()
    await user.click(screen.getByRole('button', { name: 'この行を削除' }))
    await user.click(await screen.findByRole('button', { name: '取り消す' }))
    await findNotification('元に戻しました')
    expect(vi.mocked(saveLedgerEntry).mock.calls[0][0].data).toMatchObject({ party: '', note: '' })
    await open()
    vi.mocked(deleteLedgerEntry).mockRejectedValueOnce(new Error('network'))
    await user.click(screen.getByRole('button', { name: 'この行を削除' }))
    await findNotification('削除できませんでした')
  })
})
