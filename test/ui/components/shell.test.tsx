import { act, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { RouteErrorState, RouteNotFoundState } from '../../../src/components/ErrorStates'
import { PullToRefresh } from '../../../src/components/PullToRefresh'
import { showUndo } from '../../../src/components/undoNotification'
import { PHONE, setMedia } from '../media'
import { findNotification, renderWithRouter } from '../render'

describe('RouteErrorState', () => {
  it('warns not to trust the screen, shows the message, and can reload or go home', async () => {
    const { user, router } = await renderWithRouter(
      <RouteErrorState error={new Error('D1 に接続できません')} />,
      { path: '/broken' },
    )
    expect(screen.getByRole('heading', { name: '表示できませんでした' })).toBeInTheDocument()
    expect(screen.getByText('この画面の内容は信用しないでください')).toBeInTheDocument()
    expect(screen.getByText('D1 に接続できません')).toBeInTheDocument()
    const invalidate = vi.spyOn(router, 'invalidate')
    await user.click(screen.getByRole('button', { name: '読み直す' }))
    expect(invalidate).toHaveBeenCalled()
    await user.click(screen.getByRole('link', { name: 'ホームへ' }))
    expect(router.state.location.pathname).toBe('/')
  })

  it('accepts non-Error values and hides an empty message', async () => {
    await renderWithRouter(<RouteErrorState error="" />)
    expect(screen.queryByText('エラーの内容')).not.toBeInTheDocument()
  })
})

describe('RouteNotFoundState', () => {
  it('explains the stale link and offers the way home', async () => {
    const { user, router } = await renderWithRouter(<RouteNotFoundState />, { path: '/gone' })
    expect(screen.getByRole('heading', { name: '見つかりません' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'ホームへ' }))
    expect(router.state.location.pathname).toBe('/')
  })
})

function touch(type: string, y?: number, target: EventTarget = window) {
  const event = new Event(type, { bubbles: true }) as Event & { touches: { clientY: number }[] }
  Object.defineProperty(event, 'touches', { value: y === undefined ? [] : [{ clientY: y }] })
  Object.defineProperty(event, 'target', { value: target })
  act(() => {
    window.dispatchEvent(event)
  })
}

describe('PullToRefresh', () => {
  it('does nothing on a mouse device', async () => {
    const { router } = await renderWithRouter(<PullToRefresh>本文</PullToRefresh>)
    const invalidate = vi.spyOn(router, 'invalidate')
    touch('touchstart', 0)
    touch('touchmove', 300)
    touch('touchend')
    expect(invalidate).not.toHaveBeenCalled()
  })

  it('refetches after a long enough pull from the top and announces it', async () => {
    setMedia(PHONE)
    const { router } = await renderWithRouter(
      <PullToRefresh>
        <p>本文</p>
      </PullToRefresh>,
    )
    const invalidate = vi.spyOn(router, 'invalidate')
    touch('touchstart', 0, screen.getByText('本文'))
    touch('touchmove', 300)
    touch('touchend')
    expect(invalidate).toHaveBeenCalledOnce()
    expect(await screen.findByText('更新中')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('更新中')).not.toBeInTheDocument(), {
      timeout: 2000,
    })
  })

  it('ignores short pulls, upward moves, and touches in a dialog or scrolled box', async () => {
    setMedia(PHONE)
    const { router } = await renderWithRouter(
      <PullToRefresh>
        <div role="dialog">
          <span>ダイアログ</span>
        </div>
        <div data-testid="scroller">
          <span>中身</span>
        </div>
      </PullToRefresh>,
    )
    const invalidate = vi.spyOn(router, 'invalidate')
    // Short pull
    touch('touchstart', 0)
    touch('touchmove', 20)
    touch('touchend')
    // Moving up, and a move event without touches
    touch('touchstart', 100)
    touch('touchmove', 50)
    touch('touchmove')
    touch('touchcancel')
    // A move or end without a start
    touch('touchmove', 300)
    touch('touchend')
    // Inside a dialog
    touch('touchstart', 0, screen.getByText('ダイアログ'))
    touch('touchmove', 300)
    touch('touchend')
    // Inside a box that is scrolled down
    const scroller = screen.getByTestId('scroller')
    scroller.scrollTop = 40
    touch('touchstart', 0, screen.getByText('中身'))
    touch('touchmove', 300)
    touch('touchend')
    // A start with no touch point
    touch('touchstart')
    touch('touchmove', 300)
    touch('touchend')
    expect(invalidate).not.toHaveBeenCalled()
  })

  it('does not start while the page is scrolled down', async () => {
    setMedia(PHONE)
    const { router } = await renderWithRouter(<PullToRefresh>本文</PullToRefresh>)
    const invalidate = vi.spyOn(router, 'invalidate')
    Object.defineProperty(window, 'scrollY', { value: 100, configurable: true })
    touch('touchstart', 0)
    touch('touchmove', 300)
    touch('touchend')
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
    expect(invalidate).not.toHaveBeenCalled()
  })
})

describe('showUndo', () => {
  it('returns focus to where the action settled once the undo finishes (SHIG 94)', async () => {
    const { user } = await renderWithRouter(
      <>
        <input aria-label="次の一手" />
        <button>別のボタン</button>
      </>,
    )
    const field = screen.getByRole('textbox', { name: '次の一手' })
    field.focus()
    let undone = false
    act(() =>
      showUndo({
        message: '保留 にしました',
        onUndo: async () => {
          undone = true
        },
      }),
    )
    await findNotification('保留 にしました')
    await user.click(screen.getByRole('button', { name: '取り消す' }))
    await findNotification('元に戻しました')
    expect(undone).toBe(true)
    await waitFor(() => expect(field).toHaveFocus())
  })

  it('follows focus off a closing menu item and finds a re-rendered field by its form path', async () => {
    function Harness() {
      const [key, setKey] = useState(0)
      return (
        <>
          <div role="menu">
            <button role="menuitem">保留にする</button>
          </div>
          <input key={key} aria-label="メモ" data-path="note" />
          <button onClick={() => setKey((k) => k + 1)}>描き直す</button>
        </>
      )
    }
    const { user } = await renderWithRouter(<Harness />)
    act(() => screen.getByRole('menuitem').focus())
    act(() => showUndo({ message: '変更しました', onUndo: async () => {} }))
    // The menu closes and the page moves focus to the field: that is where the action settled
    act(() => screen.getByRole('textbox', { name: 'メモ' }).focus())
    // The undo re-renders the form, so the field is a new element with the same path
    await user.click(screen.getByRole('button', { name: '描き直す' }))
    await user.click(await screen.findByRole('button', { name: '取り消す' }))
    await findNotification('元に戻しました')
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'メモ' })).toHaveFocus())
  })

  it('stops tracking focus when the notification is closed', async () => {
    const { user } = await renderWithRouter(<button>何か</button>)
    act(() => showUndo({ message: '閉じる通知', onUndo: async () => {} }))
    await findNotification('閉じる通知')
    // The icon-only × has a spoken name (theme default, SHIG 11)
    await user.click(screen.getByRole('button', { name: '閉じる' }))
    await waitFor(() => expect(screen.queryByText('閉じる通知')).not.toBeInTheDocument())
  })
})
