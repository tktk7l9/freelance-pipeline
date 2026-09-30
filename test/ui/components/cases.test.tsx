import { screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { CaseCard } from '../../../src/components/cases/CaseCard'
import { CaseLogList } from '../../../src/components/cases/CaseLogList'
import { CaseTable } from '../../../src/components/cases/CaseTable'
import { NextActionEditor } from '../../../src/components/cases/NextActionEditor'
import { StatusBadge } from '../../../src/components/cases/StatusBadge'
import { StatusChanger } from '../../../src/components/cases/StatusChanger'
import {
  addCaseMemo,
  changeCaseStatus,
  deleteCaseMemo,
  saveNextAction,
  undoStatusChange,
} from '../../../src/server/cases'
import { TODAY, makeCase, makeLog } from '../fixtures'
import { findNotification, renderWithRouter } from '../render'

describe('StatusBadge', () => {
  it('shows the status in words', async () => {
    await renderWithRouter(
      <>
        <StatusBadge status="screening" />
        <StatusBadge status="rejected" />
      </>,
    )
    expect(screen.getByText('書類選考')).toBeInTheDocument()
    expect(screen.getByText('見送り')).toBeInTheDocument()
  })
})

describe('CaseCard', () => {
  it('summarizes the case and links the whole card to its detail page', async () => {
    const item = makeCase({
      remoteType: 'partial',
      onsiteNote: '月4回出社',
      daysPerWeek: '週4',
      nextAction: '面談準備',
      nextActionDue: '2030-11-10',
      monthlyMinIncl: 770_000,
    })
    const { user, router } = await renderWithRouter(
      <CaseCard item={item} siteUrl="https://example.com" today={TODAY} />,
    )
    const card = screen.getAllByRole('link')[0]
    expect(within(card).getByText('テスト案件')).toBeInTheDocument()
    expect(within(card).getByText('応募')).toBeInTheDocument()
    expect(within(card).getByText('77万〜88万')).toBeInTheDocument()
    expect(within(card).getByText('一部出社')).toBeInTheDocument()
    expect(within(card).getByText('月4回出社')).toBeInTheDocument()
    expect(within(card).getByText('開始 2030/12/01')).toBeInTheDocument()
    expect(within(card).getByText('週4')).toBeInTheDocument()
    expect(within(card).getByText('2030/11/10 今日')).toBeInTheDocument()
    expect(within(card).getByText('面談準備')).toBeInTheDocument()
    // The company link inside the card is a span so there is no <a> inside <a>
    expect(within(card).getByRole('link', { name: /甲社/ }).tagName).toBe('SPAN')
    await user.click(within(card).getByText('テスト案件'))
    expect(router.state.location.pathname).toBe(`/cases/${item.id}`)
  })

  it('skips an on-site note that repeats the remote label and the empty next-step row', async () => {
    await renderWithRouter(
      <CaseCard item={makeCase({ remoteType: 'onsite', onsiteNote: '常駐' })} today={TODAY} />,
    )
    expect(screen.getAllByText('常駐')).toHaveLength(1)
    expect(screen.queryByText('今日')).not.toBeInTheDocument()
  })

  it('shows a due date alone when there is no next step, and a far date without a label', async () => {
    await renderWithRouter(
      <CaseCard item={makeCase({ nextActionDue: '2030-12-24' })} today={TODAY} />,
    )
    expect(screen.getByText('2030/12/24')).toBeInTheDocument()
  })
})

describe('CaseTable', () => {
  it('lists cases in a table with rates, remote, status and next step', async () => {
    const a = makeCase({
      title: '案件A',
      remoteType: 'partial',
      onsiteNote: '週1出社',
      nextAction: '返事を待つ',
      nextActionDue: '2030-11-12',
    })
    const b = makeCase({
      title: '案件B',
      company: '乙社',
      status: 'onhold',
      nextActionDue: '2030-12-30',
    })
    const c = makeCase({ title: '案件C', nextAction: null })
    const { user, router } = await renderWithRouter(
      <CaseTable items={[a, b, c]} sites={{ 乙社: 'https://example.org' }} today={TODAY} />,
    )
    const rows = screen.getAllByRole('row')
    expect(rows).toHaveLength(4)
    expect(within(rows[1]).getByText('週1出社')).toBeInTheDocument()
    expect(within(rows[1]).getByText('2030/11/12 あと2日')).toBeInTheDocument()
    expect(within(rows[1]).getByText('返事を待つ')).toBeInTheDocument()
    expect(within(rows[2]).getByText('保留')).toBeInTheDocument()
    expect(within(rows[2]).getByText('2030/12/30')).toBeInTheDocument()
    expect(within(rows[2]).getByRole('link', { name: /乙社/ })).toHaveAttribute(
      'href',
      'https://example.org',
    )
    await user.click(screen.getByRole('link', { name: '案件B' }))
    expect(router.state.location.pathname).toBe(`/cases/${b.id}`)
  })
})

describe('StatusChanger', () => {
  const change = vi.mocked(changeCaseStatus)
  const undo = vi.mocked(undoStatusChange)

  it('advances to the next status in one tap and offers undo', async () => {
    change.mockResolvedValue({ ok: true } as never)
    undo.mockResolvedValue({ result: 'ok' } as never)
    const onChanged = vi.fn()
    const { user } = await renderWithRouter(
      <StatusChanger id="c1" status="applied" onChanged={onChanged} />,
    )
    expect(screen.getByText('いま:')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '書類選考へ進める' }))
    expect(change).toHaveBeenCalledWith({ data: { id: 'c1', to: 'screening' } })
    expect(onChanged).toHaveBeenCalledWith('screening')
    await findNotification('書類選考 にしました。次の一手と期日も見直してください')
    await user.click(screen.getByRole('button', { name: '取り消す' }))
    expect(undo).toHaveBeenCalledWith({ data: { id: 'c1' } })
    await findNotification('元に戻しました')
  })

  it('does not claim the undo worked when the server had nothing to revert', async () => {
    change.mockResolvedValue({ ok: true } as never)
    undo.mockResolvedValue({ result: 'nothing' } as never)
    const { user } = await renderWithRouter(<StatusChanger id="c1" status="applied" />)
    await user.click(screen.getByRole('button', { name: '書類選考へ進める' }))
    await user.click(await screen.findByRole('button', { name: '取り消す' }))
    await findNotification('戻せませんでした')
    expect(screen.queryByText('元に戻しました')).not.toBeInTheDocument()
  })

  it('folds the other statuses into a menu', async () => {
    change.mockResolvedValue({ ok: true } as never)
    const { user } = await renderWithRouter(<StatusChanger id="c1" status="applied" />)
    await user.click(screen.getByRole('button', { name: '他の状態にする' }))
    const items = screen.getAllByRole('menuitem').map((i) => i.textContent)
    expect(items).toContain('保留にする')
    expect(items).not.toContain('書類選考にする')
    await user.click(screen.getByRole('menuitem', { name: '保留にする' }))
    expect(change).toHaveBeenCalledWith({ data: { id: 'c1', to: 'onhold' } })
  })

  it('from on hold has no one-tap step and says so in the menu button', async () => {
    await renderWithRouter(<StatusChanger id="c1" status="onhold" />)
    expect(screen.queryByRole('button', { name: /へ進める/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '状態を変える' })).toBeInTheDocument()
  })

  it('renders nothing for a terminal status', async () => {
    const { container } = await renderWithRouter(<StatusChanger id="c1" status="declined" />)
    expect(container.querySelector('button')).toBeNull()
  })

  it('reports a refused transition and a failed request', async () => {
    change.mockResolvedValueOnce({ ok: false } as never)
    const { user } = await renderWithRouter(<StatusChanger id="c1" status="offer" />)
    await user.click(screen.getByRole('button', { name: '参画へ進める' }))
    await findNotification('この遷移はできません')
    change.mockRejectedValueOnce(new Error('network'))
    await user.click(screen.getByRole('button', { name: '参画へ進める' }))
    await findNotification('変更できませんでした')
  })
})

describe('NextActionEditor', () => {
  const save = vi.mocked(saveNextAction)

  it('saves the next step with a quick due date and says so', async () => {
    save.mockResolvedValue({ ok: true } as never)
    const { user } = await renderWithRouter(
      <NextActionEditor
        id="c1"
        status="applied"
        nextAction={null}
        nextActionDue={null}
        today={TODAY}
      />,
    )
    const input = screen.getByLabelText('次の一手', { selector: 'input' })
    await user.type(input, '結果を待つ')
    await user.click(screen.getByRole('checkbox', { name: '1週間後' }))
    expect(screen.getByRole('checkbox', { name: '1週間後' })).toBeChecked()
    const saveButton = screen.getByRole('button', { name: '保存' })
    await user.click(saveButton)
    expect(save).toHaveBeenCalledWith({
      data: { id: 'c1', nextAction: '結果を待つ', nextActionDue: '2030-11-17' },
    })
    await findNotification('次の一手を保存しました')
    // Focus returns to the save button instead of dropping to the page (SHIG 94)
    await waitFor(() => expect(saveButton).toHaveFocus())
  })

  it('offers status-specific suggestions', async () => {
    const { user } = await renderWithRouter(
      <NextActionEditor
        id="c1"
        status="meeting"
        nextAction={null}
        nextActionDue={null}
        today={TODAY}
      />,
    )
    await user.click(screen.getByLabelText('次の一手', { selector: 'input' }))
    expect(await screen.findByRole('option', { name: '面談の準備をする' })).toBeInTheDocument()
  })

  it('clears the due date and sends null', async () => {
    save.mockResolvedValue({ ok: true } as never)
    const { user } = await renderWithRouter(
      <NextActionEditor
        id="c1"
        status="applied"
        nextAction="返事を待つ"
        nextActionDue="2030-11-20"
        today={TODAY}
      />,
    )
    await user.click(screen.getByRole('button', { name: '期日を消す' }))
    await user.click(screen.getByRole('button', { name: '保存' }))
    expect(save).toHaveBeenCalledWith({
      data: { id: 'c1', nextAction: '返事を待つ', nextActionDue: null },
    })
  })

  it('shows a readable error when saving fails', async () => {
    save.mockRejectedValue(new Error('JSON ではない失敗'))
    const { user } = await renderWithRouter(
      <NextActionEditor
        id="c1"
        status="applied"
        nextAction="a"
        nextActionDue={null}
        today={TODAY}
      />,
    )
    await user.click(screen.getByRole('button', { name: '保存' }))
    await findNotification('JSON ではない失敗')
  })

  it('follows new saved values while untouched, keeps typing, and focuses on a fresh signal', async () => {
    function Harness() {
      const [value, setValue] = useState('古い')
      const [signal, setSignal] = useState(0)
      return (
        <>
          <button onClick={() => setValue((v) => `${v}!`)}>外で更新</button>
          <button onClick={() => setSignal((n) => n + 1)}>状態を進めた</button>
          <NextActionEditor
            id="c1"
            status="applied"
            nextAction={value}
            nextActionDue={null}
            today={TODAY}
            focusSignal={signal}
          />
        </>
      )
    }
    const { user } = await renderWithRouter(<Harness />)
    const input = screen.getByLabelText('次の一手', { selector: 'input' })
    expect(input).toHaveValue('古い')
    await user.click(screen.getByRole('button', { name: '外で更新' }))
    expect(input).toHaveValue('古い!')
    // While the owner is typing, an outside update does not overwrite the field
    await user.type(input, '追記')
    await user.click(screen.getByRole('button', { name: '外で更新' }))
    expect(input).toHaveValue('古い!追記')
    await user.click(screen.getByRole('button', { name: '状態を進めた' }))
    expect(input).toHaveFocus()
  })
})

describe('CaseLogList', () => {
  const add = vi.mocked(addCaseMemo)
  const remove = vi.mocked(deleteCaseMemo)
  const log = [
    makeLog({ id: 'l1', kind: 'import', body: 'add-case', at: '2030-11-01T01:00:00.000Z' }),
    makeLog({
      id: 'l2',
      kind: 'status',
      fromStatus: 'saved',
      toStatus: 'applied',
      at: '2030-11-02T01:00:00.000Z',
    }),
    makeLog({ id: 'l3', kind: 'memo', body: '書類通過', at: '2030-11-03T03:00:00.000Z' }),
  ]

  it('lists the history newest first in plain words', async () => {
    await renderWithRouter(<CaseLogList caseId="c1" log={log} today={TODAY} />)
    const texts = ['書類通過', '保存 → 応募', '案件票を取り込んだ'].map((t) => screen.getByText(t))
    expect(
      texts[0].compareDocumentPosition(texts[1]) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      texts[1].compareDocumentPosition(texts[2]) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    // Only memos can be deleted
    expect(screen.getAllByRole('button', { name: 'メモを削除' })).toHaveLength(1)
  })

  it('adds a memo dated today and clears the field', async () => {
    add.mockResolvedValue({ ok: true } as never)
    const { user } = await renderWithRouter(<CaseLogList caseId="c1" log={[]} today={TODAY} />)
    const addButton = screen.getByRole('button', { name: 'メモを追加' })
    expect(addButton).toBeDisabled()
    const memo = screen.getByRole('textbox', { name: 'メモ' })
    await user.type(memo, '面談日程を返した')
    await user.click(addButton)
    expect(add).toHaveBeenCalledWith({ data: { id: 'c1', body: '面談日程を返した', date: TODAY } })
    await waitFor(() => expect(memo).toHaveValue(''))
  })

  it('shows why a memo could not be added', async () => {
    add.mockRejectedValue(
      new Error(JSON.stringify([{ code: 'too_big', path: ['data', 'body'], message: 'Too big' }])),
    )
    const { user } = await renderWithRouter(<CaseLogList caseId="c1" log={[]} today={TODAY} />)
    await user.type(screen.getByRole('textbox', { name: 'メモ' }), 'x')
    await user.click(screen.getByRole('button', { name: 'メモを追加' }))
    await findNotification('メモは 4000 文字までです')
  })

  it('deletes a memo without asking and restores it on undo', async () => {
    remove.mockResolvedValue({ ok: true } as never)
    add.mockResolvedValue({ ok: true } as never)
    const { user } = await renderWithRouter(<CaseLogList caseId="c1" log={log} today={TODAY} />)
    await user.click(screen.getByRole('button', { name: 'メモを削除' }))
    expect(remove).toHaveBeenCalledWith({ data: { id: 'l3' } })
    await findNotification('メモを削除しました')
    await user.click(screen.getByRole('button', { name: '取り消す' }))
    await findNotification('元に戻しました')
    expect(add).toHaveBeenCalledWith({ data: { id: 'c1', body: '書類通過', date: '2030-11-03' } })
  })

  it('reports a failed delete', async () => {
    remove.mockRejectedValue(new Error('network'))
    const { user } = await renderWithRouter(<CaseLogList caseId="c1" log={log} today={TODAY} />)
    await user.click(screen.getByRole('button', { name: 'メモを削除' }))
    await findNotification('削除できませんでした')
  })

  it('does not submit a blank memo when the date is changed', async () => {
    add.mockResolvedValue({ ok: true } as never)
    const { user } = await renderWithRouter(<CaseLogList caseId="c1" log={[]} today={TODAY} />)
    const date = screen.getByRole('textbox', { name: /日付/ })
    await user.clear(date)
    await user.type(date, '2030/11/01')
    await user.tab()
    await user.type(screen.getByRole('textbox', { name: 'メモ' }), '過去のメモ')
    await user.click(screen.getByRole('button', { name: 'メモを追加' }))
    expect(add).toHaveBeenCalledWith({ data: { id: 'c1', body: '過去のメモ', date: '2030-11-01' } })
  })
})
