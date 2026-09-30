import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CompareTable } from '../../../src/components/compare/CompareTable'
import { MarketView } from '../../../src/components/market/MarketView'
import { NO_THRESHOLDS, TODAY, makeCase, makeMarketData, makeSkill } from '../fixtures'
import { renderWithRouter } from '../render'

describe('CompareTable', () => {
  it('lays cases side by side and marks cells under a threshold with a symbol and words', async () => {
    const cheap = makeCase({ id: 'c-cheap', title: '安い案件', monthlyMaxIncl: 550_000 })
    const good = makeCase({ id: 'c-good', title: '良い案件', company: '乙社', fitScores: [2] })
    const { user, router } = await renderWithRouter(
      <CompareTable
        cases={[cheap, good]}
        sites={{ 乙社: 'https://example.org' }}
        thresholds={{ ...NO_THRESHOLDS, minMonthlyIncl: 770_000 }}
        axes={['技術']}
      />,
    )
    const rateRow = screen.getByRole('rowheader', { name: '単価' }).closest('tr') as HTMLElement
    const cells = within(rateRow).getAllByRole('cell')
    expect(within(cells[0]).getByText('閾値を下回る')).toBeInTheDocument()
    expect(within(cells[0]).getByText('▼')).toHaveAttribute('aria-hidden')
    expect(within(cells[1]).queryByText('閾値を下回る')).not.toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: '技術' })).toBeInTheDocument()
    expect(screen.getByText('合う')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /乙社/ })).toHaveAttribute(
      'href',
      'https://example.org',
    )
    await user.click(screen.getByRole('link', { name: '安い案件' }))
    expect(router.state.location.pathname).toBe('/cases/c-cheap')
  })
})

describe('MarketView', () => {
  const props = {
    onSkillChange: vi.fn(),
    birthDate: '1998-01-01',
    myRate: 880_000,
    ratePoints: [],
    today: TODAY,
  }

  it('explains how to get data when there is none', async () => {
    await renderWithRouter(<MarketView {...props} skills={[]} skill={null} />)
    expect(screen.getByText('市場データがまだありません')).toBeInTheDocument()
  })

  it('puts my position in my age band first, in numbers and words', async () => {
    await renderWithRouter(
      <MarketView {...props} skills={[makeSkill('TypeScript')]} skill="TypeScript" />,
    )
    expect(screen.getByRole('heading', { name: '自分の位置' })).toBeInTheDocument()
    expect(screen.getByText('30代前半')).toBeInTheDocument()
    expect(screen.getByText('88万（税込）')).toBeInTheDocument()
    // 880k falls in the 〜100万 band: nobody above, 20% same, 80% below
    expect(screen.getByText('同年代で自分より高い帯').nextSibling).toHaveTextContent('0%')
    expect(screen.getByText('同じ帯').nextSibling).toHaveTextContent('20%')
    expect(screen.getByText('自分より低い帯').nextSibling).toHaveTextContent('80%')
    expect(screen.getByText('〜100万 より上')).toBeInTheDocument()
    expect(screen.getByText('同年代でいちばん多いのは 〜80万')).toBeInTheDocument()
    // My band is spelled out in text and marked, not only colored
    expect(screen.getByText('▼ 30代前半')).toBeInTheDocument()
    expect(screen.getByText('あなた: 〜100万')).toBeInTheDocument()
    expect(screen.getByText('〜60万 30%・〜80万 50%・〜100万 20%')).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: '40代前半: 〜60万 5%、〜80万 45%、〜100万 50%' }),
    ).toBeInTheDocument()
    expect(screen.getByText('120 件・倍率 0.8')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /元のダッシュボード/ })).toHaveAttribute(
      'href',
      'https://example.com/market',
    )
  })

  it('asks for a birth date and says when there is no current rate', async () => {
    const { user, router } = await renderWithRouter(
      <MarketView
        {...props}
        birthDate={null}
        myRate={null}
        skills={[makeSkill('Go', makeMarketData({ sourceUrl: undefined }))]}
        skill={null}
      />,
    )
    expect(
      screen.getByText('参画中の案件が無いので、いまの単価を決められません。'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /元のダッシュボード/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: '設定の事業者情報' }))
    expect(router.state.location.pathname).toBe('/settings')
  })

  it('says when the skill has no row for my age band, and shows my raise pace', async () => {
    await renderWithRouter(
      <MarketView
        {...props}
        birthDate="1970-01-01"
        ratePoints={[
          { ym: '2028-01', rate: 700_000 },
          { ym: '2030-01', rate: 880_000 },
        ]}
        skills={[makeSkill('TypeScript')]}
        skill="TypeScript"
      />,
    )
    expect(screen.getByText('このスキルには 60代以上 の分布がありません。')).toBeInTheDocument()
    expect(screen.getByText('+9万/年')).toBeInTheDocument()
    expect(screen.getByText('市場の平均 +6万/年＝差 3万')).toBeInTheDocument()
  })

  it('shows a falling pace with its sign', async () => {
    await renderWithRouter(
      <MarketView
        {...props}
        ratePoints={[
          { ym: '2028-01', rate: 900_000 },
          { ym: '2030-01', rate: 700_000 },
        ]}
        skills={[makeSkill('TypeScript')]}
        skill="TypeScript"
      />,
    )
    expect(screen.getByText('-10万/年')).toBeInTheDocument()
  })

  it('switches the skill', async () => {
    const onSkillChange = vi.fn()
    const { user } = await renderWithRouter(
      <MarketView
        {...props}
        onSkillChange={onSkillChange}
        skills={[makeSkill('TypeScript'), makeSkill('Go')]}
        skill="TypeScript"
      />,
    )
    await user.click(screen.getByLabelText('スキル', { selector: 'input' }))
    await user.click(await screen.findByRole('option', { name: 'Go' }))
    expect(onSkillChange).toHaveBeenCalledWith('Go')
  })

  it('handles a band with no people without dividing by zero', async () => {
    const data = makeMarketData()
    data.talent.ageRate = [{ band: '30代前半', cells: [{ bin: 600_000, pct: 0 }] }]
    await renderWithRouter(
      <MarketView {...props} skills={[makeSkill('TypeScript', data)]} skill="TypeScript" />,
    )
    expect(screen.getByRole('img', { name: '30代前半: 〜60万 0%' })).toBeInTheDocument()
  })
})
