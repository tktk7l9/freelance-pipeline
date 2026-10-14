import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ContractForm } from '../../../src/components/cases/ContractForm'
import { ContractList } from '../../../src/components/cases/ContractList'
import { saveContract } from '../../../src/server/contracts'
import { makeContract, uuid } from '../fixtures'
import { findNotification, renderWithRouter } from '../render'

const zodError = (path: string[], code: string, message = 'Invalid') =>
  new Error(JSON.stringify([{ code, path, message }]))

const defaults = {
  startDate: '2030-12-01',
  endDate: '2031-03-31',
  monthlyIncl: 825_000,
  settlementMinH: 140,
  settlementMaxH: 180,
}

describe('ContractList', () => {
  it('explains what a contract row does when there is none, and offers to add one', async () => {
    const onAdd = vi.fn()
    const { user } = await renderWithRouter(
      <ContractList contracts={[]} route="levtech" onAdd={onAdd} onSelect={vi.fn()} />,
    )
    expect(screen.getByRole('heading', { name: '契約' })).toBeInTheDocument()
    expect(screen.getByText(/契約はまだ登録されていません/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '契約を追加' }))
    expect(onAdd).toHaveBeenCalled()
  })

  it('lists contracts newest first with the fee, hourly rate and terms, and selects one on tap', async () => {
    const first = makeContract({
      startDate: '2030-12-01',
      endDate: '2031-03-31',
      monthlyIncl: 825_000,
      overtimeRate: 5_000,
      deductionRate: 6_000,
      orderNo: 'ORD-1',
      note: '初月は日割り',
    })
    const renewal = makeContract({
      startDate: '2031-04-01',
      endDate: null,
      monthlyIncl: 880_000,
      settlementMinH: null,
      settlementMaxH: null,
    })
    const onSelect = vi.fn()
    const { user } = await renderWithRouter(
      <ContractList
        contracts={[first, renewal]}
        route="levtech"
        onAdd={vi.fn()}
        onSelect={onSelect}
      />,
    )
    const rows = screen.getAllByRole('button', { name: /の契約を編集$/ })
    expect(rows.map((r) => r.getAttribute('aria-label'))).toEqual([
      '2031/04/01 〜 の契約を編集',
      '2030/12/01 〜 2031/03/31 の契約を編集',
    ])
    // The open-ended renewal has no settlement range, so the route default (168h) is the divisor
    expect(within(rows[0]).getByText('88万')).toBeInTheDocument()
    expect(within(rows[0]).getByText('(÷168h)')).toBeInTheDocument()
    expect(within(rows[0]).queryByText(/精算/)).not.toBeInTheDocument()
    expect(within(rows[1]).getByText('82.5万')).toBeInTheDocument()
    expect(within(rows[1]).getByText('(税抜 75万)')).toBeInTheDocument()
    expect(within(rows[1]).getByText('(÷160h)')).toBeInTheDocument()
    expect(
      within(rows[1]).getByText('精算 140〜180h・超過 5,000円/h・控除 6,000円/h・注文番号 ORD-1'),
    ).toBeInTheDocument()
    expect(within(rows[1]).getByText('初月は日割り')).toBeInTheDocument()
    await user.click(rows[1])
    expect(onSelect).toHaveBeenCalledWith(first)
  })
})

describe('ContractForm', () => {
  const save = vi.mocked(saveContract)
  const caseId = uuid()

  it('starts from the defaults, checks the dates, and sends a new contract', async () => {
    save.mockResolvedValue({ id: 'k1' } as never)
    const onSaved = vi.fn()
    const { user } = await renderWithRouter(
      <ContractForm caseId={caseId} contract={null} defaults={defaults} onSaved={onSaved} />,
    )
    expect(screen.getByRole('textbox', { name: /開始/ })).toHaveValue('2030-12-01')
    expect(screen.getByRole('textbox', { name: /月額/ })).toHaveValue('825,000')
    expect(screen.getByRole('textbox', { name: /精算 下限/ })).toHaveValue('140')
    await user.clear(screen.getByRole('textbox', { name: /終了/ }))
    await user.type(screen.getByRole('textbox', { name: /終了/ }), 'あとで')
    await user.click(screen.getByRole('button', { name: '保存' }))
    expect(screen.getByText('2030/12 や 2030/12/31 の形で入れてください')).toBeInTheDocument()
    expect(save).not.toHaveBeenCalled()
    await user.clear(screen.getByRole('textbox', { name: /終了/ }))
    await user.type(screen.getByRole('textbox', { name: /終了/ }), '2031年3月')
    await user.type(screen.getByRole('textbox', { name: /超過単価/ }), '5000')
    await user.type(screen.getByRole('textbox', { name: /注文番号/ }), ' ORD-1 ')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await findNotification('契約を追加しました')
    expect(onSaved).toHaveBeenCalledWith('k1')
    expect(save.mock.calls[0][0].data).toEqual({
      caseId,
      startDate: '2030-12-01',
      endDate: '2031-03',
      monthlyIncl: 825_000,
      settlementMinH: 140,
      settlementMaxH: 180,
      overtimeRate: 5_000,
      deductionRate: null,
      orderNo: ' ORD-1 ',
      note: '',
    })
  })

  it('requires a start date and a monthly fee', async () => {
    const { user } = await renderWithRouter(
      <ContractForm
        caseId={caseId}
        contract={null}
        defaults={{ ...defaults, endDate: null }}
        onSaved={vi.fn()}
      />,
    )
    await user.clear(screen.getByRole('textbox', { name: /開始/ }))
    await user.type(screen.getByRole('textbox', { name: /開始/ }), '未定')
    await user.clear(screen.getByRole('textbox', { name: /月額/ }))
    // The browser's own required check would stop the click, so submit the form directly (as a script could)
    fireEvent.submit(screen.getByRole('button', { name: '保存' }).closest('form')!)
    expect(
      await screen.findByText('2030/11 や 2030/11/16 の形で入れてください'),
    ).toBeInTheDocument()
    expect(screen.getByText('月額を入れてください')).toBeInTheDocument()
    expect(save).not.toHaveBeenCalled()
  })

  it('edits an existing contract, sending its id', async () => {
    save.mockResolvedValue({ id: 'k1' } as never)
    const contract = makeContract({ id: 'k1', caseId, deductionRate: 6_000, note: 'メモ' })
    const onSaved = vi.fn()
    const { user } = await renderWithRouter(
      <ContractForm caseId={caseId} contract={contract} defaults={defaults} onSaved={onSaved} />,
    )
    expect(screen.getByRole('textbox', { name: /控除単価/ })).toHaveValue('6,000')
    await user.clear(screen.getByRole('textbox', { name: /月額/ }))
    await user.type(screen.getByRole('textbox', { name: /月額/ }), '880000')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await findNotification('契約を更新しました')
    expect(save.mock.calls[0][0].data).toMatchObject({
      id: 'k1',
      caseId,
      monthlyIncl: 880_000,
      deductionRate: 6_000,
      note: 'メモ',
    })
    expect(onSaved).toHaveBeenCalledWith('k1')
  })

  it('puts a server validation error on its field, or in a notification otherwise', async () => {
    save.mockRejectedValueOnce(zodError(['endDate'], 'custom', '終了が開始より前です'))
    const { user } = await renderWithRouter(
      <ContractForm caseId={caseId} contract={null} defaults={defaults} onSaved={vi.fn()} />,
    )
    await user.click(screen.getByRole('button', { name: '保存' }))
    expect(await screen.findByText('終了が開始より前です')).toBeInTheDocument()
    save.mockRejectedValueOnce(new Error('network'))
    await user.click(screen.getByRole('button', { name: '保存' }))
    await findNotification('保存できませんでした')
  })
})
