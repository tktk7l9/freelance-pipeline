import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { EntryList } from '../../../src/components/income/EntryList'
import { MonthlyBreakdown } from '../../../src/components/income/MonthlyBreakdown'
import { RateHistory } from '../../../src/components/income/RateHistory'
import { YearSummaryCards } from '../../../src/components/income/YearSummaryCards'
import type { MonthRow, YearSummary } from '../../../src/lib/ledger'
import { makeLedger } from '../fixtures'
import { renderWithRouter } from '../render'

const summary = (o: Partial<YearSummary> = {}): YearSummary => ({
  year: 2030,
  salesIncl: 0,
  salesExcl: 0,
  officer: 0,
  otherIncome: 0,
  incomeTotal: 0,
  tax: 0,
  insurance: 0,
  expense: 0,
  otherOutgo: 0,
  outgoTotal: 0,
  net: 0,
  monthsWithIncome: 0,
  ...o,
})

const month = (o: Partial<MonthRow> & { month: number }): MonthRow => ({
  yearMonth: `2030-${String(o.month).padStart(2, '0')}`,
  freelance: 0,
  officer: 0,
  otherIncome: 0,
  income: 0,
  outgo: 0,
  forecastFreelance: 0,
  forecastOfficer: 0,
  ...o,
})

describe('EntryList', () => {
  it('renders nothing without rows', async () => {
    const { container } = await renderWithRouter(<EntryList rows={[]} onSelect={vi.fn()} />)
    expect(container.querySelector('h2')).toBeNull()
  })

  it('names each row for screen readers, signs outgoings, and selects on tap', async () => {
    const income = makeLedger({ yearMonth: '2030-10', amount: 880_000 })
    const tax = makeLedger({
      yearMonth: '2030-06',
      kind: 'resident_tax',
      party: null,
      amount: 50_000,
    })
    const onSelect = vi.fn()
    const { user } = await renderWithRouter(<EntryList rows={[income, tax]} onSelect={onSelect} />)
    expect(
      screen.getByRole('button', { name: '2030/10 フリーランス売上 880,000円 を編集' }),
    ).toHaveTextContent('880,000円')
    const taxRow = screen.getByRole('button', { name: '2030/06 住民税 50,000円 を編集' })
    expect(taxRow).toHaveTextContent('−50,000円')
    await user.click(taxRow)
    expect(onSelect).toHaveBeenCalledWith(tax)
  })
})

describe('YearSummaryCards', () => {
  it('shows this year as provisional with the forecast sentence', async () => {
    await renderWithRouter(
      <YearSummaryCards
        summary={summary({
          salesIncl: 1_100_000,
          salesExcl: 1_000_000,
          officer: 200_000,
          otherIncome: 10_000,
          incomeTotal: 1_310_000,
          tax: 100_000,
          insurance: 50_000,
          expense: 20_000,
          otherOutgo: 5_000,
          outgoTotal: 175_000,
          net: 1_135_000,
          monthsWithIncome: 2,
        })}
        previous={summary({ salesIncl: 1_000_000, incomeTotal: 1_310_000 })}
        forecast={{ salesIncl: 6_000_000, incomeTotal: 7_000_000, filledMonths: 3 }}
        isThisYear
      />,
    )
    expect(screen.getByText('手取り（暫定）')).toBeInTheDocument()
    expect(screen.getByText('未計上の税・経費があれば減る')).toBeInTheDocument()
    expect(screen.getByText('税抜 100万・前年比 +10%')).toBeInTheDocument()
    expect(screen.getByText('役員報酬 20万・その他 1万・前年比 0%')).toBeInTheDocument()
    expect(screen.getByText('税 10万・社保 5万・経費 2万・その他 0.5万')).toBeInTheDocument()
    expect(
      screen.getByText(/年の着地見込み 収入 700万（売上 600万）＝残り 3 か月/),
    ).toBeInTheDocument()
  })

  it('shows a past year with its year-over-year change and no forecast', async () => {
    await renderWithRouter(
      <YearSummaryCards
        summary={summary({ net: 900_000, monthsWithIncome: 0 })}
        previous={summary({ net: 1_000_000 })}
        forecast={{ salesIncl: 0, incomeTotal: 0, filledMonths: 0 }}
        isThisYear={false}
      />,
    )
    expect(screen.getByText('手取り')).toBeInTheDocument()
    expect(screen.getByText('前年比 -10%')).toBeInTheDocument()
    expect(screen.getByText('収入のある月は 0 か月・月平均 0万')).toBeInTheDocument()
  })

  it('writes a dash when there is no previous year to compare with', async () => {
    await renderWithRouter(
      <YearSummaryCards
        summary={summary()}
        previous={summary()}
        forecast={null}
        isThisYear={false}
      />,
    )
    expect(screen.getByText('前年比 —')).toBeInTheDocument()
  })
})

describe('RateHistory', () => {
  it('renders nothing without history', async () => {
    const { container } = await renderWithRouter(<RateHistory history={[]} changes={[]} />)
    expect(container.querySelector('h2')).toBeNull()
  })

  it('says the rate stayed the same in one sentence', async () => {
    await renderWithRouter(
      <RateHistory
        history={[
          { yearMonth: '2029-12', rate: 880_000, partial: false },
          { yearMonth: '2030-01', rate: 880_000, partial: false },
        ]}
        changes={[]}
      />,
    )
    expect(screen.getByText(/のまま（2029\/12〜）/)).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveAccessibleName('2029/12 88万、2030/01 88万')
    expect(screen.getByText('2029')).toBeInTheDocument()
    expect(screen.getByText('2030')).toBeInTheDocument()
  })

  it('lists each revision and marks prorated months in text', async () => {
    await renderWithRouter(
      <RateHistory
        history={[
          { yearMonth: '2030-01', rate: 800_000, partial: false },
          { yearMonth: '2030-02', rate: 300_000, partial: true },
          { yearMonth: '2030-03', rate: 900_000, partial: false },
        ]}
        changes={[{ yearMonth: '2030-03', from: 800_000, to: 900_000 }]}
      />,
    )
    expect(screen.getByText(/（\+10万・\+13%・改定 1 回）/)).toBeInTheDocument()
    expect(screen.getByText(/2030\/03〜 80万 → 90万（\s*\+10万）/)).toBeInTheDocument()
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('2030/02 30万（日割り）')
  })

  it('handles a rate that went down', async () => {
    await renderWithRouter(
      <RateHistory
        history={[
          { yearMonth: '2030-01', rate: 900_000, partial: false },
          { yearMonth: '2030-02', rate: 800_000, partial: false },
        ]}
        changes={[{ yearMonth: '2030-02', from: 900_000, to: 800_000 }]}
      />,
    )
    expect(screen.getByText(/（-10万・-11%・改定 1 回）/)).toBeInTheDocument()
  })

  it('falls back to prorated months and a zero start without dividing by zero', async () => {
    await renderWithRouter(
      <RateHistory
        history={[{ yearMonth: '2030-05', rate: 0, partial: true }]}
        changes={[{ yearMonth: '2030-05', from: 0, to: 0 }]}
      />,
    )
    expect(screen.getByText(/\+0%/)).toBeInTheDocument()
  })
})

describe('MonthlyBreakdown', () => {
  it('shows income, forecast and outgoings per month in text as well as bars', async () => {
    await renderWithRouter(
      <MonthlyBreakdown
        months={[
          month({ month: 9, freelance: 800_000, income: 800_000, outgo: 100_000 }),
          month({ month: 10, forecastFreelance: 880_000, forecastOfficer: 100_000 }),
          month({ month: 11 }),
        ]}
      />,
    )
    const rows = screen.getAllByRole('row')
    expect(within(rows[0]).getByText('9月')).toBeInTheDocument()
    expect(within(rows[0]).getByRole('img', { name: '収入 80万' })).toBeInTheDocument()
    expect(within(rows[0]).getByRole('img', { name: '支出 10万' })).toBeInTheDocument()
    expect(within(rows[0]).getByText('−10万')).toBeInTheDocument()
    expect(within(rows[1]).getByRole('img', { name: '収入 0万・見込み 98万' })).toBeInTheDocument()
    expect(within(rows[1]).getByText('見込み 98万')).toBeInTheDocument()
    expect(within(rows[2]).getByText('—')).toBeInTheDocument()
    expect(screen.getByText('見込み（参画中案件・役員報酬）')).toBeInTheDocument()
  })
})
