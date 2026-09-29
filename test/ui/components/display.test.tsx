import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CompanyName } from '../../../src/components/CompanyName'
import { Row } from '../../../src/components/DetailRow'
import { EmptyState } from '../../../src/components/EmptyState'
import { Fab } from '../../../src/components/Fab'
import { PageShell } from '../../../src/components/PageShell'
import { PlaceLink } from '../../../src/components/PlaceLink'
import { RawTextPanel } from '../../../src/components/cases/RawTextPanel'
import { t, n } from '../../../src/components/settings/formValues'
import { renderWithRouter } from '../render'

describe('Row', () => {
  it('shows a label and its value', async () => {
    await renderWithRouter(<Row label="商流" value="二次請け" />)
    expect(screen.getByText('商流')).toBeInTheDocument()
    expect(screen.getByText('二次請け')).toBeInTheDocument()
  })

  it.each([null, undefined, ''])('renders no row at all for an empty value (%s)', async (v) => {
    await renderWithRouter(
      <div data-testid="box">
        <Row label="商流" value={v} />
      </div>,
    )
    expect(screen.getByTestId('box')).toBeEmptyDOMElement()
  })
})

describe('EmptyState', () => {
  it('shows the title, description and action, hiding the emoji from assistive tech', async () => {
    await renderWithRouter(
      <EmptyState
        emoji="📭"
        title="何もありません"
        description="説明文"
        action={<button>次へ</button>}
      />,
    )
    expect(screen.getByText('何もありません')).toBeInTheDocument()
    expect(screen.getByText('説明文')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '次へ' })).toBeInTheDocument()
    expect(screen.getByText('📭')).toHaveAttribute('aria-hidden')
  })

  it('omits the description and action when not given and uses the default emoji', async () => {
    await renderWithRouter(<EmptyState title="空" />)
    expect(screen.getByText('🏠')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('Fab', () => {
  it('calls onClick when pressed', async () => {
    const onClick = vi.fn()
    const { user } = await renderWithRouter(<Fab label="取込" onClick={onClick} />)
    await user.click(screen.getByRole('button', { name: '取込' }))
    expect(onClick).toHaveBeenCalledOnce()
  })
})

describe('PageShell', () => {
  it('keeps the tab-page heading for assistive tech only and shows actions', async () => {
    await renderWithRouter(
      <PageShell title="案件" actions={<button>操作</button>}>
        <p>本文</p>
      </PageShell>,
    )
    expect(screen.getByRole('heading', { level: 1, name: '案件' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '操作' })).toBeInTheDocument()
    expect(screen.getByText('本文')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('shows a back link, the visible heading, description and actions on detail pages', async () => {
    const { user, router } = await renderWithRouter(
      <PageShell
        title="テスト案件"
        heading
        description="甲社"
        back={{ to: '/cases', label: '案件' }}
        actions={<button>編集</button>}
        fab
        wide
      />,
      { path: '/detail' },
    )
    expect(screen.getByRole('heading', { level: 1, name: 'テスト案件' })).toBeVisible()
    expect(screen.getByText('甲社')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '編集' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: '案件' }))
    expect(router.state.location.pathname).toBe('/cases')
  })
})

describe('CompanyName', () => {
  it('is plain text without a URL', async () => {
    await renderWithRouter(<CompanyName name="甲社" />)
    expect(screen.getByText('甲社')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('links to the official site in a new tab', async () => {
    await renderWithRouter(<CompanyName name="甲社" url="https://example.com" />)
    const link = screen.getByRole('link', { name: /甲社/ })
    expect(link).toHaveAttribute('href', 'https://example.com')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(within(link).getByLabelText('（公式サイト）')).toBeInTheDocument()
  })

  it('does not trigger the surrounding row when the site link is clicked', async () => {
    const row = vi.fn()
    const { user } = await renderWithRouter(
      <div onClick={row}>
        <CompanyName name="甲社" url="https://example.com" />
      </div>,
    )
    const link = screen.getByRole('link', { name: /甲社/ })
    // Keep jsdom from trying to navigate; only the propagation matters here
    link.addEventListener('click', (e) => e.preventDefault())
    await user.click(link)
    expect(row).not.toHaveBeenCalled()
  })

  it('inside a card link, opens the site by click or Enter/Space without following the card', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    const outer = vi.fn()
    const { user } = await renderWithRouter(
      <div onClick={outer}>
        <CompanyName name="甲社" url="https://example.com" nested />
      </div>,
    )
    const link = screen.getByRole('link', { name: /甲社/ })
    expect(link.tagName).toBe('SPAN')
    await user.click(link)
    link.focus()
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    await user.keyboard('a')
    expect(open).toHaveBeenCalledTimes(3)
    expect(open).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer')
    expect(outer).not.toHaveBeenCalled()
    open.mockRestore()
  })
})

describe('PlaceLink', () => {
  it('shows a dash when there is no address', async () => {
    await renderWithRouter(<PlaceLink address={null} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('opens Google Maps without the parenthetical note in the query', async () => {
    await renderWithRouter(<PlaceLink address="東京都千代田区（テスト駅直結）" size="sm" />)
    const link = screen.getByRole('link', { name: /東京都千代田区/ })
    expect(link.getAttribute('href')).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('東京都千代田区')}`,
    )
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('inside a card link, opens the map by click or keyboard only', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    const outer = vi.fn()
    const { user } = await renderWithRouter(
      <div onClick={outer}>
        <PlaceLink address="東京都港区" nested />
      </div>,
    )
    const link = screen.getByRole('link', { name: /東京都港区/ })
    await user.click(link)
    link.focus()
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    await user.keyboard('x')
    expect(open).toHaveBeenCalledTimes(3)
    expect(outer).not.toHaveBeenCalled()
    open.mockRestore()
  })
})

describe('RawTextPanel', () => {
  it('shows the character count and reveals the raw text when opened', async () => {
    const { user } = await renderWithRouter(<RawTextPanel text="あいうえお" />)
    const toggle = screen.getByRole('button', { name: '原文（5 文字）' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('あいうえお')).toBeInTheDocument()
  })
})

describe('settings form value helpers', () => {
  it('turn empty input into null', () => {
    expect(t('  ')).toBeNull()
    expect(t(' 甲 ')).toBe('甲')
    expect(n('')).toBeNull()
    expect(n(0)).toBe(0)
  })
})
