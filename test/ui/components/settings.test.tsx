import { screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { AxesCard } from '../../../src/components/settings/AxesCard'
import { BusinessCard } from '../../../src/components/settings/BusinessCard'
import { ImprovementsCard } from '../../../src/components/settings/ImprovementsCard'
import { ThresholdsCard } from '../../../src/components/settings/ThresholdsCard'
import type { Thresholds } from '../../../src/lib/compare'
import type { BusinessInfo } from '../../../src/lib/business'
import {
  saveAxes,
  saveBusiness,
  saveImprovements,
  saveThresholds,
} from '../../../src/server/settings'
import { NO_THRESHOLDS, makeBusiness } from '../fixtures'
import { findNotification, renderWithRouter } from '../render'

/** Cards are modeless: the page keeps which ones are open. This harness plays the page's part */
function Editable<V>({
  Card,
  value,
}: {
  Card: React.ComponentType<{ value: V; editing: boolean; onEdit: () => void; onClose: () => void }>
  value: V
}) {
  const [editing, setEditing] = useState(false)
  return (
    <Card
      value={value}
      editing={editing}
      onEdit={() => setEditing(true)}
      onClose={() => setEditing(false)}
    />
  )
}

describe('ThresholdsCard', () => {
  const save = vi.mocked(saveThresholds)

  it('says when nothing is set', async () => {
    await renderWithRouter(<Editable Card={ThresholdsCard} value={NO_THRESHOLDS} />)
    expect(screen.getByText('未設定')).toBeInTheDocument()
  })

  it('shows the set values and leaves out empty ones', async () => {
    const value: Thresholds = { ...NO_THRESHOLDS, minHourlyExcl: 5_000, maxOnsitePerMonth: 4 }
    await renderWithRouter(<Editable Card={ThresholdsCard} value={value} />)
    expect(screen.getByText('5,000円/h')).toBeInTheDocument()
    expect(screen.getByText('4回/月')).toBeInTheDocument()
    expect(screen.queryByText('単価下限（税込）')).not.toBeInTheDocument()
    expect(screen.queryByText('希望開始')).not.toBeInTheDocument()
  })

  it('accepts a lenient month, normalizes it, and saves', async () => {
    save.mockResolvedValue({ ok: true } as never)
    const value: Thresholds = { ...NO_THRESHOLDS, minMonthlyIncl: 880_000, targetStart: '2030-11' }
    const { user } = await renderWithRouter(<Editable Card={ThresholdsCard} value={value} />)
    expect(screen.getByText('2030/11')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '編集' }))
    const start = screen.getByRole('textbox', { name: /希望開始/ })
    expect(start).toHaveValue('2030/11')
    await user.clear(start)
    await user.type(start, 'いつか')
    await user.click(screen.getByRole('button', { name: '保存' }))
    expect(screen.getByText('2030/11 のように年と月を入れてください')).toBeInTheDocument()
    await user.clear(start)
    await user.type(start, '２０３１年１月')
    await user.type(screen.getByRole('textbox', { name: /出社の上限/ }), '2')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await findNotification('閾値を保存しました')
    expect(save).toHaveBeenCalledWith({
      data: {
        minMonthlyIncl: 880_000,
        minHourlyExcl: null,
        targetStart: '2031-01',
        maxOnsitePerMonth: 2,
      },
    })
    expect(screen.queryByRole('button', { name: '保存' })).not.toBeInTheDocument()
  })

  it('cancels without saving and reports a failed save', async () => {
    save.mockRejectedValue(new Error('x'))
    const { user } = await renderWithRouter(
      <Editable Card={ThresholdsCard} value={NO_THRESHOLDS} />,
    )
    await user.click(screen.getByRole('button', { name: '編集' }))
    await user.click(screen.getByRole('button', { name: 'キャンセル' }))
    expect(save).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: '編集' }))
    await user.click(screen.getByRole('button', { name: '保存' }))
    await findNotification('保存できませんでした')
    expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument()
  })
})

describe('AxesCard', () => {
  const save = vi.mocked(saveAxes)

  it('shows the axes, or that none are set', async () => {
    await renderWithRouter(
      <>
        <Editable Card={AxesCard} value={['技術', '人']} />
      </>,
    )
    expect(screen.getByText('技術')).toBeInTheDocument()
    expect(screen.getByText('人')).toBeInTheDocument()
  })

  it('says when there are no axes', async () => {
    await renderWithRouter(<Editable Card={AxesCard} value={[]} />)
    expect(screen.getByText('未設定')).toBeInTheDocument()
  })

  it('adds an axis with Enter and saves', async () => {
    save.mockResolvedValue({ ok: true } as never)
    const { user } = await renderWithRouter(<Editable Card={AxesCard} value={['技術']} />)
    await user.click(screen.getByRole('button', { name: '編集' }))
    await user.type(screen.getByLabelText('軸', { selector: 'input' }), '成長{Enter}')
    await user.click(screen.getByRole('button', { name: '保存' }))
    expect(save).toHaveBeenCalledWith({ data: { axes: ['技術', '成長'] } })
    await findNotification('軸を保存しました')
  })

  it('cancels, and reports a failed save', async () => {
    save.mockRejectedValue(new Error('x'))
    const { user } = await renderWithRouter(<Editable Card={AxesCard} value={['技術']} />)
    await user.click(screen.getByRole('button', { name: '編集' }))
    await user.click(screen.getByRole('button', { name: 'キャンセル' }))
    await user.click(screen.getByRole('button', { name: '編集' }))
    await user.click(screen.getByRole('button', { name: '保存' }))
    await findNotification('保存できませんでした')
  })
})

describe('ImprovementsCard', () => {
  const save = vi.mocked(saveImprovements)

  it('shows the list or that it is empty', async () => {
    await renderWithRouter(<Editable Card={ImprovementsCard} value={[]} />)
    expect(screen.getByText('未入力。')).toBeInTheDocument()
  })

  it('edits one item per line, dropping bullets and blank lines', async () => {
    save.mockResolvedValue({ ok: true } as never)
    const { user } = await renderWithRouter(<Editable Card={ImprovementsCard} value={['一つ目']} />)
    expect(screen.getByRole('listitem')).toHaveTextContent('一つ目')
    await user.click(screen.getByRole('button', { name: '編集' }))
    const box = screen.getByRole('textbox')
    expect(box).toHaveValue('一つ目')
    await user.type(box, '{Enter}{Enter}- 二つ目')
    await user.click(screen.getByRole('button', { name: '保存' }))
    expect(save).toHaveBeenCalledWith({ data: { items: ['一つ目', '二つ目'] } })
    await findNotification('改善したいことを保存しました')
  })

  it('cancels and reports a failed save', async () => {
    save.mockRejectedValue(new Error('x'))
    const { user } = await renderWithRouter(<Editable Card={ImprovementsCard} value={['a']} />)
    await user.click(screen.getByRole('button', { name: '編集' }))
    await user.click(screen.getByRole('button', { name: 'キャンセル' }))
    expect(screen.getByRole('listitem')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '編集' }))
    await user.click(screen.getByRole('button', { name: '保存' }))
    await findNotification('保存できませんでした')
  })
})

describe('BusinessCard', () => {
  const save = vi.mocked(saveBusiness)
  const full: BusinessInfo = makeBusiness({
    birthDate: '1990-01-15',
    openedOn: '2020-04-01',
    occupation: 'ソフトウェア開発',
    description: '受託開発',
    filingType: 'blue',
    taxOffice: 'テスト税務署',
    taxAddress: '東京都テスト区1-1',
    invoiceNumber: 'T0000000000000',
    invoiceRegisteredOn: '2023-10-01',
    etaxUserId: '0000000000000000',
    businessNumber: 'B-000',
  })

  it('invites to fill it in when empty', async () => {
    await renderWithRouter(<Editable Card={BusinessCard} value={makeBusiness()} />)
    expect(
      screen.getByText('未入力。「編集」から入れると、ここに一覧で出ます。'),
    ).toBeInTheDocument()
  })

  it('lists every field that is set', async () => {
    await renderWithRouter(<Editable Card={BusinessCard} value={full} />)
    expect(screen.getByText('1990/01/15')).toBeInTheDocument()
    expect(screen.getByText('青色申告')).toBeInTheDocument()
    expect(screen.getByText('T0000000000000')).toBeInTheDocument()
    expect(screen.getByText('2023/10/01')).toBeInTheDocument()
  })

  it('hides the filing type row when it is not chosen', async () => {
    await renderWithRouter(
      <Editable Card={BusinessCard} value={makeBusiness({ occupation: '開発' })} />,
    )
    expect(screen.getByText('開発')).toBeInTheDocument()
    expect(screen.queryByText('申告区分')).not.toBeInTheDocument()
  })

  it('saves edits, turning cleared fields into null', async () => {
    save.mockResolvedValue({ ok: true } as never)
    const { user } = await renderWithRouter(<Editable Card={BusinessCard} value={full} />)
    await user.click(screen.getByRole('button', { name: '編集' }))
    await user.clear(screen.getByRole('textbox', { name: '職業' }))
    await user.click(screen.getByRole('button', { name: '生年月日を消す' }))
    await user.click(screen.getByRole('button', { name: '開業日を消す' }))
    await user.click(screen.getByRole('button', { name: '登録年月日を消す' }))
    await user.click(screen.getByRole('button', { name: '保存' }))
    await findNotification('事業者情報を保存しました')
    expect(save.mock.calls[0][0].data).toMatchObject({
      birthDate: null,
      openedOn: null,
      occupation: null,
      invoiceRegisteredOn: null,
      filingType: 'blue',
      taxOffice: 'テスト税務署',
    })
  })

  it('picks the filing type from the list', async () => {
    save.mockResolvedValue({ ok: true } as never)
    const { user } = await renderWithRouter(<Editable Card={BusinessCard} value={makeBusiness()} />)
    await user.click(screen.getByRole('button', { name: '編集' }))
    await user.click(screen.getByLabelText('申告区分', { selector: 'input' }))
    await user.click(await screen.findByRole('option', { name: '白色申告' }))
    await user.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(save).toHaveBeenCalled())
    expect(save.mock.calls[0][0].data.filingType).toBe('white')
  })

  it('clears the filing type back to unset', async () => {
    save.mockResolvedValue({ ok: true } as never)
    const { user } = await renderWithRouter(<Editable Card={BusinessCard} value={full} />)
    await user.click(screen.getByRole('button', { name: '編集' }))
    // Picking the chosen option again deselects it (Mantine's clear button is hidden from assistive tech)
    await user.click(screen.getByLabelText('申告区分', { selector: 'input' }))
    await user.click(await screen.findByRole('option', { name: '青色申告' }))
    await user.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(save).toHaveBeenCalled())
    expect(save.mock.calls[0][0].data.filingType).toBeNull()
  })

  it('cancels, and reports a failed save', async () => {
    save.mockRejectedValue(new Error('x'))
    const { user } = await renderWithRouter(<Editable Card={BusinessCard} value={full} />)
    await user.click(screen.getByRole('button', { name: '編集' }))
    await user.click(screen.getByRole('button', { name: 'キャンセル' }))
    await user.click(screen.getByRole('button', { name: '編集' }))
    await user.click(screen.getByRole('button', { name: '保存' }))
    await findNotification('保存できませんでした')
  })
})
