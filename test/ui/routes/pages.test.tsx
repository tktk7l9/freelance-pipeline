import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  deleteCaseFn,
  getCaseDetail,
  importCase,
  listCasesFn,
  saveCase,
} from '../../../src/server/cases'
import { homeData } from '../../../src/server/home'
import { marketData } from '../../../src/server/market'
import { getSettingsData } from '../../../src/server/settings'
import { CASE_JSON_EXAMPLE } from '../../../src/lib/caseInput'
import { NO_THRESHOLDS, TODAY, makeBusiness, makeCase, makeLog, makeSkill } from '../fixtures'
import { findNotification, renderApp } from '../render'

const settings = (o: Partial<Awaited<ReturnType<typeof getSettingsData>>> = {}) => ({
  thresholds: NO_THRESHOLDS,
  axes: [] as string[],
  business: makeBusiness(),
  improvements: [] as string[],
  ...o,
})

function mockHome(o: Partial<Awaited<ReturnType<typeof homeData>>> = {}) {
  vi.mocked(homeData).mockResolvedValue({
    current: [],
    sites: {},
    improvements: [],
    due: [],
    activeCount: 0,
    medianIncl: null,
    byRoute: [],
    recent: [],
    today: TODAY,
    ...o,
  } as never)
}

describe('app layout', () => {
  it('marks the current tab in both navigations and moves between tabs', async () => {
    mockHome()
    vi.mocked(getSettingsData).mockResolvedValue(settings() as never)
    const { user, router } = await renderApp('/')
    const tabs = screen.getByRole('navigation', { name: '主要なページ' })
    expect(within(tabs).getByRole('link', { name: 'ホーム' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(tabs).getByRole('link', { name: '設定' })).not.toHaveAttribute('aria-current')
    await user.click(within(tabs).getByRole('link', { name: '設定' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/settings'))
    expect(await screen.findByRole('heading', { name: '事業者情報' })).toBeInTheDocument()
    const current = screen
      .getAllByRole('link', { name: '設定' })
      .filter((l) => l.getAttribute('aria-current') === 'page')
    // Left nav (desktop) and bottom tabs (phone) both know where you are
    expect(current).toHaveLength(2)
    await user.click(screen.getByRole('link', { name: '案件管理' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })

  it('shows the not-found page for an unknown URL', async () => {
    await renderApp('/no-such-page')
    expect(await screen.findByRole('heading', { name: '見つかりません' })).toBeInTheDocument()
  })

  it('shows the error page instead of an empty list when loading fails', async () => {
    vi.mocked(homeData).mockRejectedValue(new Error('読み込みに失敗（テスト）'))
    await renderApp('/')
    expect(await screen.findByRole('heading', { name: '表示できませんでした' })).toBeInTheDocument()
    expect(screen.getByText('読み込みに失敗（テスト）')).toBeInTheDocument()
  })
})

describe('home', () => {
  it('invites to register the first case when there is nothing', async () => {
    mockHome()
    await renderApp('/')
    expect(await screen.findByText('まだ案件がありません')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'ホーム' })).toBeInTheDocument()
  })

  it('puts the due list first, then the current case, improvements, stats and recent log', async () => {
    const joined = makeCase({ status: 'joined', title: '参画中の案件' })
    mockHome({
      current: [joined],
      improvements: ['基礎用語を言えるようにする'],
      due: [
        {
          id: 'd1',
          company: '甲社',
          title: '期日の案件',
          nextAction: '返事',
          nextActionDue: TODAY,
        },
      ],
      activeCount: 1,
      medianIncl: 880_000,
      byRoute: [{ route: 'findy', activeCount: 1, medianIncl: 880_000 }],
      recent: [
        { ...makeLog({ body: '最近のメモ' }), caseId: 'd1', company: '甲社', title: '期日の案件' },
      ],
    })
    await renderApp('/')
    const headings = (await screen.findAllByRole('heading', { level: 2 })).map((h) => h.textContent)
    expect(headings).toEqual(['期日順', '現在の案件', '改善したいこと', '最近の動き'])
    expect(screen.getByText('最近のメモ')).toBeInTheDocument()
  })
})

describe('cases list', () => {
  it('filters by status group from the URL and counts each group', async () => {
    vi.mocked(listCasesFn).mockResolvedValue({
      cases: [
        makeCase({ title: '進行中の案件' }),
        makeCase({ title: '保留の案件', status: 'onhold' }),
      ],
      sites: {},
      today: TODAY,
    } as never)
    const { user, router } = await renderApp('/cases')
    expect((await screen.findAllByText('進行中の案件')).length).toBeGreaterThan(0)
    expect(screen.queryByText('保留の案件')).not.toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: '保留 1' }))
    await waitFor(() => expect(router.state.location.search).toEqual({ group: 'onhold' }))
    expect((await screen.findAllByText('保留の案件')).length).toBeGreaterThan(0)
    await user.click(screen.getByRole('radio', { name: '辞退・見送り 0' }))
    expect(await screen.findByText('この区分の案件はありません')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '取込' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/import'))
  })
})

describe('import', () => {
  it('registers a case sheet and opens the new case', async () => {
    vi.mocked(importCase).mockResolvedValue({ ok: true, id: 'new-case' } as never)
    const item = makeCase({ id: 'new-case', title: '取り込んだ案件' })
    vi.mocked(getCaseDetail).mockResolvedValue({
      item,
      log: [],
      companyUrl: null,
      today: TODAY,
    } as never)
    vi.mocked(getSettingsData).mockResolvedValue(settings() as never)
    const { user, router } = await renderApp('/import')
    // A PWA has no browser back button, so the deep page links back up (SHIG 82)
    const links = await screen.findAllByRole('link', { name: '案件' })
    expect(links.some((l) => l.classList.contains('back-link'))).toBe(true)
    await user.click(screen.getByRole('textbox', { name: /案件票の JSON/ }))
    await user.paste(CASE_JSON_EXAMPLE)
    await user.click(screen.getByRole('button', { name: 'この内容で登録' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/cases/new-case'))
    expect(
      await screen.findByRole('heading', { level: 1, name: '取り込んだ案件' }),
    ).toBeInTheDocument()
  })
})

describe('case detail', () => {
  const full = makeCase({
    id: 'c1',
    title: '詳細の案件',
    agentName: '担当B',
    status: 'meeting',
    endDate: '2031-03-31',
    daysPerWeek: '週5',
    workLocation: '東京都港区',
    supplyChain: '元請直',
    paymentSiteDays: 30,
    actualMonthlyIncl: 900_000,
    sourceUrl: 'https://example.com/jobs/1',
    mustSkills: ['TypeScript'],
    niceSkills: ['Go'],
    fitScores: [2],
    note: '判断メモ',
    sourceTaxBasis: 'excl',
  })

  function mockDetail(item = full, axes: string[] = ['技術', '人']) {
    vi.mocked(getCaseDetail).mockResolvedValue({
      item,
      log: [makeLog({ caseId: item.id, body: '経緯のメモ' })],
      companyUrl: 'https://example.com',
      today: TODAY,
    } as never)
    vi.mocked(getSettingsData).mockResolvedValue(settings({ axes }) as never)
  }

  it('shows every condition that is set, with skills and scored axes only', async () => {
    mockDetail()
    await renderApp('/cases/c1')
    expect(await screen.findByRole('heading', { level: 1, name: '詳細の案件' })).toBeInTheDocument()
    expect(screen.getByText(/Findy（担当B）/)).toBeInTheDocument()
    expect(screen.getByText(/案件票は税抜表示/)).toBeInTheDocument()
    expect(screen.getByText('2030/12/01 〜 2031/03/31')).toBeInTheDocument()
    expect(screen.getByText('140〜180h')).toBeInTheDocument()
    expect(screen.getByText('30日')).toBeInTheDocument()
    expect(screen.getByText('元請直')).toBeInTheDocument()
    expect(screen.getByText('実単価')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '開く' })).toHaveAttribute(
      'href',
      'https://example.com/jobs/1',
    )
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
    expect(screen.getByText('Go')).toBeInTheDocument()
    expect(screen.getByText('技術: 合う')).toBeInTheDocument()
    expect(screen.queryByText(/^人:/)).not.toBeInTheDocument()
    expect(screen.getByText('判断メモ')).toBeInTheDocument()
    expect(screen.getByText('経緯のメモ')).toBeInTheDocument()
  })

  it('leaves out empty conditions and says when no skills are registered', async () => {
    mockDetail(
      makeCase({
        id: 'c2',
        settlementMinH: null,
        settlementMaxH: 180,
        fitScores: null,
      }),
      ['技術'],
    )
    await renderApp('/cases/c2')
    expect(await screen.findByText('未登録')).toBeInTheDocument()
    expect(screen.getByText('〜180h')).toBeInTheDocument()
    for (const label of ['作業場所', '商流', '支払サイト', '実単価', '案件ページ', '稼働']) {
      expect(screen.queryByText(label)).not.toBeInTheDocument()
    }
    expect(screen.queryByText(/技術:/)).not.toBeInTheDocument()
  })

  it('hides the settlement row when neither bound is set', async () => {
    mockDetail(makeCase({ id: 'c3', settlementMinH: null, settlementMaxH: null }), [])
    await renderApp('/cases/c3')
    await screen.findByText('未登録')
    expect(screen.queryByText('精算幅')).not.toBeInTheDocument()
  })

  it('edits the case in a drawer and closes it on save', async () => {
    mockDetail()
    vi.mocked(saveCase).mockResolvedValue({ id: 'c1' } as never)
    const { user } = await renderApp('/cases/c1')
    await user.click(await screen.findByRole('button', { name: '編集' }))
    const drawer = screen.getByRole('dialog', { name: '案件を編集' })
    expect(within(drawer).getByRole('textbox', { name: /企業名/ })).toHaveValue('甲社')
    await user.click(within(drawer).getByRole('button', { name: '保存' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: '編集' }))
    await user.click(
      within(screen.getByRole('dialog', { name: '案件を編集' })).getByRole('button', {
        name: '閉じる',
      }),
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('moves focus to the next step after the status advances', async () => {
    mockDetail()
    const { changeCaseStatus } = await import('../../../src/server/cases')
    vi.mocked(changeCaseStatus).mockResolvedValue({ ok: true } as never)
    const { user } = await renderApp('/cases/c1')
    await user.click(await screen.findByRole('button', { name: '内定へ進める' }))
    await waitFor(() =>
      expect(screen.getByLabelText('次の一手', { selector: 'input' })).toHaveFocus(),
    )
  })

  it('deletes only after confirming, then returns to the list', async () => {
    mockDetail()
    vi.mocked(listCasesFn).mockResolvedValue({ cases: [], sites: {}, today: TODAY } as never)
    vi.mocked(deleteCaseFn).mockResolvedValue({ ok: true } as never)
    const confirm = vi.spyOn(window, 'confirm')
    const { user, router } = await renderApp('/cases/c1')
    const del = await screen.findByRole('button', { name: 'この案件と経緯を削除' })
    confirm.mockReturnValueOnce(false)
    await user.click(del)
    expect(deleteCaseFn).not.toHaveBeenCalled()
    vi.mocked(deleteCaseFn).mockRejectedValueOnce(new Error('network'))
    confirm.mockReturnValueOnce(true)
    await user.click(del)
    await findNotification('削除できませんでした')
    confirm.mockReturnValueOnce(true)
    await user.click(del)
    expect(deleteCaseFn).toHaveBeenLastCalledWith({ data: { id: 'c1' } })
    await waitFor(() => expect(router.state.location.pathname).toBe('/cases'))
    await findNotification('削除しました')
    confirm.mockRestore()
  })
})

describe('compare', () => {
  function mockCompare(o: { thresholds?: typeof NO_THRESHOLDS } = {}) {
    vi.mocked(listCasesFn).mockResolvedValue({
      cases: [
        makeCase({ id: 'a1', title: '案件A' }),
        makeCase({ id: 'h1', title: '保留の案件', status: 'onhold' }),
        makeCase({ id: 'j1', title: '参画済み', status: 'joined' }),
      ],
      sites: {},
      today: TODAY,
    } as never)
    vi.mocked(getSettingsData).mockResolvedValue(
      settings({ thresholds: o.thresholds ?? NO_THRESHOLDS, axes: ['技術'] }) as never,
    )
    vi.mocked(marketData).mockResolvedValue({
      skills: [makeSkill('Go'), makeSkill('TypeScript(フロント)')],
      birthDate: null,
      myRate: null,
      ratePoints: [],
      today: TODAY,
    } as never)
  }

  it('compares the active cases by default and lets the owner pick', async () => {
    mockCompare()
    const { user, router } = await renderApp('/compare')
    const a = await screen.findByRole('checkbox', { name: '案件A（甲社）' })
    expect(a).toBeChecked()
    expect(screen.getByRole('checkbox', { name: '保留の案件（甲社）' })).not.toBeChecked()
    expect(screen.queryByRole('checkbox', { name: /参画済み/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '案件A' })).toBeInTheDocument()
    expect(screen.getByText(/設定で閾値を入れると/)).toBeInTheDocument()
    await user.click(a)
    await waitFor(() => expect(router.state.location.search).toEqual({ ids: '' }))
    expect(await screen.findByText('比較する案件を選んでください')).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: '保留の案件（甲社）' }))
    await waitFor(() => expect(router.state.location.search).toEqual({ ids: 'h1' }))
    expect(await screen.findByRole('link', { name: '保留の案件' })).toBeInTheDocument()
  })

  it('explains the ▼ mark once thresholds are set', async () => {
    mockCompare({ thresholds: { ...NO_THRESHOLDS, minMonthlyIncl: 1 } })
    await renderApp('/compare?ids=a1')
    expect(await screen.findByText(/▼ の付いた赤いセルは/)).toBeInTheDocument()
  })

  it('switches to the market view, defaulting to the front-end TypeScript skill', async () => {
    mockCompare()
    const { user, router } = await renderApp('/compare')
    await user.click(await screen.findByRole('radio', { name: '市場と自分' }))
    await waitFor(() => expect(router.state.location.search).toEqual({ view: 'market' }))
    const skill = await screen.findByLabelText('スキル', { selector: 'input' })
    expect(skill).toHaveValue('TypeScript(フロント)')
    await user.click(skill)
    await user.click(await screen.findByRole('option', { name: 'Go' }))
    await waitFor(() =>
      expect(router.state.location.search).toEqual({ view: 'market', skill: 'Go' }),
    )
  })

  it('shows the first skill when the default one is missing', async () => {
    mockCompare()
    vi.mocked(marketData).mockResolvedValue({
      skills: [makeSkill('Go')],
      birthDate: null,
      myRate: null,
      ratePoints: [],
      today: TODAY,
    } as never)
    await renderApp('/compare?view=market')
    expect(await screen.findByLabelText('スキル', { selector: 'input' })).toHaveValue('Go')
  })
})

describe('settings', () => {
  it('opens each card on its own so another card keeps its unsaved input', async () => {
    vi.mocked(getSettingsData).mockResolvedValue(
      settings({ axes: ['技術'], improvements: ['改善A'] }) as never,
    )
    const { user } = await renderApp('/settings')
    await screen.findByRole('heading', { name: '閾値' })
    const edits = screen.getAllByRole('button', { name: '編集' })
    expect(edits).toHaveLength(4)
    for (const b of edits) await user.click(b)
    expect(screen.queryByRole('button', { name: '編集' })).not.toBeInTheDocument()
    const cancels = screen.getAllByRole('button', { name: 'キャンセル' })
    expect(cancels).toHaveLength(4)
    for (const b of cancels) await user.click(b)
    expect(screen.getAllByRole('button', { name: '編集' })).toHaveLength(4)
  })
})
