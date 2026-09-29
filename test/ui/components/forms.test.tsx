import { screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { FormDrawer } from '../../../src/components/FormDrawer'
import { EventForm } from '../../../src/components/calendar/EventForm'
import { CaseForm } from '../../../src/components/cases/CaseForm'
import { ImportForm } from '../../../src/components/import/ImportForm'
import { LedgerForm } from '../../../src/components/income/LedgerForm'
import { CASE_JSON_EXAMPLE } from '../../../src/lib/caseInput'
import { importCase, saveCase } from '../../../src/server/cases'
import { saveEvent } from '../../../src/server/events'
import { saveLedgerEntry } from '../../../src/server/ledger'
import { makeCase, makeEvent, makeLedger } from '../fixtures'
import { setMedia, PHONE } from '../media'
import { findNotification, renderWithRouter } from '../render'

const zodError = (path: string[], code: string, message = 'Invalid') =>
  new Error(JSON.stringify([{ code, path, message }]))

describe('CaseForm', () => {
  const save = vi.mocked(saveCase)

  it('says which required fields are blank (spaces pass the browser check but not ours)', async () => {
    const { user } = await renderWithRouter(<CaseForm item={null} axes={[]} onSaved={vi.fn()} />)
    await user.type(screen.getByRole('textbox', { name: /企業名/ }), ' ')
    await user.type(screen.getByRole('textbox', { name: /案件名/ }), ' ')
    await user.type(screen.getByRole('textbox', { name: /単価上限/ }), '1')
    await user.type(screen.getByRole('textbox', { name: /開始/ }), '未定')
    await user.type(screen.getByRole('textbox', { name: /^原文/ }), ' ')
    await user.click(screen.getByRole('button', { name: '保存' }))
    expect(screen.getByText('企業名は必須です')).toBeInTheDocument()
    expect(screen.getByText('案件名は必須です')).toBeInTheDocument()
    expect(screen.getByText('2030/11 や 2030/11/16 の形で入れてください')).toBeInTheDocument()
    expect(screen.getByText('原文は必須です')).toBeInTheDocument()
    expect(save).not.toHaveBeenCalled()
  })

  it('registers a new case, normalizing month-only dates and empty fields', async () => {
    save.mockResolvedValue({ id: 'new-id' } as never)
    const onSaved = vi.fn()
    const { user } = await renderWithRouter(
      <CaseForm item={null} axes={['技術', '人']} onSaved={onSaved} />,
    )
    await user.type(screen.getByRole('textbox', { name: /企業名/ }), '甲社')
    await user.type(screen.getByRole('textbox', { name: /案件名/ }), 'テスト案件')
    await user.type(screen.getByRole('textbox', { name: /単価上限/ }), '880000')
    await user.type(screen.getByRole('textbox', { name: /開始/ }), '2030年12月')
    await user.type(screen.getByRole('textbox', { name: /終了/ }), 'あとで')
    await user.type(screen.getByRole('textbox', { name: /^原文/ }), '原文テキスト')
    await user.type(screen.getByRole('textbox', { name: '技術' }), '2')
    await user.click(screen.getByRole('button', { name: '保存' }))
    expect(screen.getByText('2030/12 や 2030/12/31 の形で入れてください')).toBeInTheDocument()
    await user.clear(screen.getByRole('textbox', { name: /終了/ }))
    await user.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('new-id'))
    const values = save.mock.calls[0][0].data.values
    expect(values).toMatchObject({
      company: '甲社',
      title: 'テスト案件',
      monthlyMax: 880_000,
      monthlyMin: null,
      taxBasis: 'incl',
      startDate: '2030-12',
      endDate: null,
      agentName: null,
      status: 'saved',
      fitScores: [2, 0],
    })
    expect(save.mock.calls[0][0].data.id).toBeNull()
    await findNotification('登録しました')
  })

  it('edits an existing case and keeps its status and next step', async () => {
    save.mockResolvedValue({ id: 'c1' } as never)
    const item = makeCase({
      id: 'c1',
      status: 'meeting',
      nextAction: '面談',
      fitScores: [1],
      mustSkills: ['TypeScript'],
    })
    const { user } = await renderWithRouter(
      <CaseForm item={item} companyUrl="https://example.com" axes={['技術']} onSaved={vi.fn()} />,
    )
    expect(screen.getByRole('textbox', { name: /公式サイト/ })).toHaveValue('https://example.com')
    expect(screen.getByRole('textbox', { name: '技術' })).toHaveValue('1')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await findNotification('更新しました')
    expect(save.mock.calls[0][0].data).toMatchObject({
      id: 'c1',
      values: {
        status: 'meeting',
        nextAction: '面談',
        fitScores: [1],
        companyUrl: 'https://example.com',
      },
    })
  })

  it('puts a server validation error on its field, or in a notification otherwise', async () => {
    save.mockRejectedValueOnce(zodError(['values', 'title'], 'too_big'))
    const { user } = await renderWithRouter(
      <CaseForm item={makeCase()} axes={[]} onSaved={vi.fn()} />,
    )
    await user.click(screen.getByRole('button', { name: '保存' }))
    expect(await screen.findByText('案件名は 300 文字までです')).toBeInTheDocument()
    save.mockRejectedValueOnce(new Error('boom'))
    await user.click(screen.getByRole('button', { name: '保存' }))
    await findNotification('保存できませんでした')
  })
})

describe('FormDrawer', () => {
  function Harness({ onClose }: { onClose?: () => void }) {
    const [opened, setOpened] = useState(true)
    return (
      <>
        <button onClick={() => setOpened(true)}>開く</button>
        <FormDrawer
          opened={opened}
          onClose={() => {
            onClose?.()
            setOpened(false)
          }}
          title="テストの編集"
        >
          <LedgerForm
            entry={null}
            defaults={{ yearMonth: '2030-11' }}
            caseOptions={[]}
            onSaved={() => setOpened(false)}
          />
        </FormDrawer>
      </>
    )
  }

  it('closes at once when nothing was typed', async () => {
    const onClose = vi.fn()
    const { user } = await renderWithRouter(<Harness onClose={onClose} />)
    expect(screen.getByRole('dialog', { name: 'テストの編集' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '閉じる' }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('asks once before throwing away typed input, and can go back to it', async () => {
    const onClose = vi.fn()
    const { user } = await renderWithRouter(<Harness onClose={onClose} />)
    const memo = screen.getByRole('textbox', { name: 'メモ' })
    await user.type(memo, '書きかけ')
    await user.keyboard('{Escape}')
    const ask = screen.getByRole('alertdialog', { name: '保存していない入力があります' })
    expect(onClose).not.toHaveBeenCalled()
    const keep = within(ask).getByRole('button', { name: '入力を続ける' })
    expect(keep).toHaveFocus()
    await user.click(keep)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    await waitFor(() => expect(memo).toHaveFocus())
    expect(memo).toHaveValue('書きかけ')
    await user.click(screen.getByRole('button', { name: '閉じる' }))
    await user.click(screen.getByRole('button', { name: '入力を捨てて閉じる' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes on a second close request while asking', async () => {
    const onClose = vi.fn()
    const { user } = await renderWithRouter(<Harness onClose={onClose} />)
    await user.type(screen.getByRole('textbox', { name: 'メモ' }), 'x')
    await user.click(screen.getByRole('button', { name: '閉じる' }))
    await user.click(screen.getByRole('button', { name: '閉じる' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('opens from the bottom at full height on phones', async () => {
    setMedia(PHONE)
    await renderWithRouter(<Harness />)
    expect(screen.getByRole('dialog', { name: 'テストの編集' })).toBeInTheDocument()
  })
})

describe('ImportForm', () => {
  const save = vi.mocked(importCase)

  it('keeps the button disabled until the JSON is valid, and explains problems in Japanese', async () => {
    const { user } = await renderWithRouter(<ImportForm onSaved={vi.fn()} />)
    const button = screen.getByRole('button', { name: 'この内容で登録' })
    expect(button).toBeDisabled()
    await user.type(screen.getByRole('textbox', { name: /案件票の JSON/ }), '{{}')
    expect(screen.getByText('直すところがあります')).toBeInTheDocument()
    expect(button).toBeDisabled()
  })

  it('previews a valid case sheet and registers it', async () => {
    save.mockResolvedValue({ ok: true, id: 'new-id' } as never)
    const onSaved = vi.fn()
    const { user } = await renderWithRouter(<ImportForm onSaved={onSaved} />)
    const box = screen.getByRole('textbox', { name: /案件票の JSON/ })
    await user.click(box)
    await user.paste(CASE_JSON_EXAMPLE)
    expect(screen.getByText('甲社 / テスト案件（サンプル）')).toBeInTheDocument()
    expect(screen.getByText('TypeScript、React')).toBeInTheDocument()
    expect(screen.getByText(/案件票は税抜表示/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'この内容で登録' }))
    expect(save).toHaveBeenCalledWith({ data: { json: CASE_JSON_EXAMPLE } })
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('new-id'))
    await findNotification('登録しました')
  })

  it('links to an existing duplicate, and reports validation and network failures', async () => {
    const { user, router } = await renderWithRouter(<ImportForm onSaved={vi.fn()} />)
    await user.click(screen.getByRole('textbox', { name: /案件票の JSON/ }))
    await user.paste(CASE_JSON_EXAMPLE.replace('"taxBasis": "excl"', '"taxBasis": "incl"'))
    expect(screen.getByText(/案件票は税込表示/)).toBeInTheDocument()
    const button = screen.getByRole('button', { name: 'この内容で登録' })

    save.mockResolvedValueOnce({ ok: false } as never)
    await user.click(button)
    await findNotification('検証に失敗しました（内容を確認してください）')

    save.mockRejectedValueOnce(new Error('network'))
    await user.click(button)
    await findNotification('保存できませんでした')

    save.mockResolvedValueOnce({
      ok: false,
      duplicate: { id: 'dup-1', company: '甲社', title: '既存案件' },
    } as never)
    await user.click(button)
    expect(await screen.findByText('同じ案件が既にあります')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: '甲社 / 既存案件 を開く' }))
    expect(router.state.location.pathname).toBe('/cases/dup-1')
  })
})

describe('EventForm', () => {
  const save = vi.mocked(saveEvent)
  const cases = [{ id: 'c1', label: '甲社｜テスト案件' }]

  it('requires a title and a start time', async () => {
    const { user } = await renderWithRouter(
      <EventForm
        event={null}
        defaults={{ date: '2030-11-12' }}
        caseOptions={cases}
        onSaved={vi.fn()}
      />,
    )
    await user.type(screen.getByRole('textbox', { name: /タイトル/ }), '  ')
    await user.clear(screen.getByLabelText('開始'))
    await user.click(screen.getByRole('button', { name: '保存' }))
    expect(screen.getByText('タイトルは必須です')).toBeInTheDocument()
    expect(screen.getByText('開始時刻を入れてください')).toBeInTheDocument()
    expect(save).not.toHaveBeenCalled()
  })

  it('adds an all-day event without times', async () => {
    save.mockResolvedValue({ id: 'e1' } as never)
    const onSaved = vi.fn()
    const { user } = await renderWithRouter(
      <EventForm
        event={null}
        defaults={{ date: '2030-11-12', caseId: 'c1' }}
        caseOptions={cases}
        onSaved={onSaved}
      />,
    )
    await user.type(screen.getByRole('textbox', { name: /タイトル/ }), '書類提出')
    await user.click(screen.getByRole('checkbox', { name: '終日' }))
    expect(screen.queryByLabelText('開始')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('e1'))
    expect(save).toHaveBeenCalledWith({
      data: {
        title: '書類提出',
        kind: 'meeting',
        date: '2030-11-12',
        allDay: true,
        startTime: '10:00',
        endTime: null,
        caseId: 'c1',
        note: null,
      },
    })
    await findNotification('予定を追加しました')
  })

  it('edits an event, sending its id, times and memo', async () => {
    save.mockResolvedValue({ id: 'e9' } as never)
    const event = makeEvent({ id: 'e9', note: '持ち物' })
    const { user } = await renderWithRouter(
      <EventForm event={event} caseOptions={cases} onSaved={vi.fn()} />,
    )
    expect(screen.getByRole('textbox', { name: /タイトル/ })).toHaveValue('テスト商談')
    const end = screen.getByLabelText('終了')
    expect(end).toHaveValue('11:00')
    await user.clear(end)
    await user.type(screen.getByRole('textbox', { name: 'メモ' }), 'と資料')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await findNotification('予定を更新しました')
    expect(save.mock.calls[0][0].data).toMatchObject({
      id: 'e9',
      date: '2030-11-12',
      startTime: '10:00',
      endTime: null,
      note: '持ち物と資料',
    })
  })

  it('shows the reason a save failed', async () => {
    save.mockRejectedValue(new Error('予定を保存できませんでした（テスト）'))
    const { user } = await renderWithRouter(
      <EventForm event={makeEvent({ endsAt: null })} caseOptions={[]} onSaved={vi.fn()} />,
    )
    expect(screen.getByLabelText('終了')).toHaveValue('')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await findNotification('予定を保存できませんでした（テスト）')
  })

  it('changes the date through the date field', async () => {
    save.mockResolvedValue({ id: 'e1' } as never)
    const { user } = await renderWithRouter(
      <EventForm
        event={null}
        defaults={{ date: '2030-11-12' }}
        caseOptions={[]}
        onSaved={vi.fn()}
      />,
    )
    await user.type(screen.getByRole('textbox', { name: /タイトル/ }), '商談')
    const date = screen.getByRole('textbox', { name: /日付/ })
    await user.clear(date)
    await user.type(date, '2030/11/20')
    await user.tab()
    await user.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(save).toHaveBeenCalled())
    expect(save.mock.calls[0][0].data.date).toBe('2030-11-20')
  })
})

describe('LedgerForm', () => {
  const save = vi.mocked(saveLedgerEntry)

  it('asks for the month', async () => {
    const { user } = await renderWithRouter(
      <LedgerForm entry={null} caseOptions={[]} onSaved={vi.fn()} />,
    )
    await user.type(screen.getByRole('textbox', { name: /金額/ }), '1000')
    await user.click(screen.getByRole('button', { name: '保存' }))
    expect(screen.getByText('年月を選んでください')).toBeInTheDocument()
    expect(save).not.toHaveBeenCalled()
  })

  it('adds an entry from the defaults of the latest row', async () => {
    save.mockResolvedValue({ id: 'l1' } as never)
    const onSaved = vi.fn()
    const { user } = await renderWithRouter(
      <LedgerForm
        entry={null}
        defaults={{
          yearMonth: '2030-11',
          kind: 'freelance',
          party: '乙エージェント',
          amount: 880_000,
        }}
        caseOptions={[{ id: 'c1', label: '甲社｜テスト案件' }]}
        onSaved={onSaved}
      />,
    )
    expect(screen.getByRole('textbox', { name: /金額（円・売上は税込）/ })).toHaveValue('880,000')
    expect(screen.getByRole('textbox', { name: '支払元' })).toHaveValue('乙エージェント')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('l1'))
    expect(save).toHaveBeenCalledWith({
      data: {
        yearMonth: '2030-11',
        kind: 'freelance',
        party: '乙エージェント',
        caseId: null,
        amount: 880_000,
        note: '',
      },
    })
    await findNotification('追加しました')
  })

  it('switches labels for an outgoing kind and hides the case picker', async () => {
    save.mockResolvedValue({ id: 'l2' } as never)
    const entry = makeLedger({
      id: 'l2',
      kind: 'resident_tax',
      party: null,
      note: 'メモ',
      caseId: null,
    })
    const { user } = await renderWithRouter(
      <LedgerForm entry={entry} caseOptions={[]} onSaved={vi.fn()} />,
    )
    expect(screen.getByRole('textbox', { name: /^金額（円）/ })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '支払先' })).toHaveValue('')
    expect(screen.queryByRole('textbox', { name: '案件' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '保存' }))
    await findNotification('更新しました')
    expect(save.mock.calls[0][0].data).toMatchObject({
      id: 'l2',
      kind: 'resident_tax',
      note: 'メモ',
    })
  })

  it('picks a month from the month picker', async () => {
    save.mockResolvedValue({ id: 'l3' } as never)
    const { user } = await renderWithRouter(
      <LedgerForm
        entry={null}
        defaults={{ yearMonth: '2030-11', amount: 1 }}
        caseOptions={[]}
        onSaved={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: /年月/ }))
    await user.click(await screen.findByRole('button', { name: /2030年3月|3月/ }))
    await user.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(save).toHaveBeenCalled())
    expect(save.mock.calls[0][0].data.yearMonth).toBe('2030-03')
  })

  it('shows the reason a save failed', async () => {
    save.mockRejectedValue(new Error('x'))
    const { user } = await renderWithRouter(
      <LedgerForm entry={makeLedger()} caseOptions={[]} onSaved={vi.fn()} />,
    )
    await user.click(screen.getByRole('button', { name: '保存' }))
    await findNotification('保存できませんでした')
  })
})
