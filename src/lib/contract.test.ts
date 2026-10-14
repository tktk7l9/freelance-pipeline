import { describe, expect, it } from 'vitest'

import {
  contractHours,
  contractPeriod,
  dayAfter,
  effectiveRate,
  forecastCases,
  formatEffectiveRateLines,
  groupByCase,
  latestContract,
  nextContractDefaults,
  ratePoints,
  sortContractsNewestFirst,
  type ContractLike,
} from './contract'

const sheet = {
  route: 'levtech' as const,
  monthlyMaxIncl: 1_100_000,
  monthlyMinIncl: null,
  settlementMinH: 140,
  settlementMaxH: 180,
  actualMonthlyIncl: null,
}

const first: ContractLike = {
  startDate: '2030-10-16',
  endDate: '2030-12-31',
  monthlyIncl: 880_000,
  settlementMinH: 140,
  settlementMaxH: 180,
}
const renewal: ContractLike = {
  startDate: '2031-01-01',
  endDate: null,
  monthlyIncl: 935_000,
  settlementMinH: null,
  settlementMaxH: null,
}

describe('ordering', () => {
  it('sorts by start date, newest first, without touching the input', () => {
    const input = [first, renewal]
    expect(sortContractsNewestFirst(input).map((c) => c.startDate)).toEqual([
      '2031-01-01',
      '2030-10-16',
    ])
    expect(input[0]).toBe(first)
    expect(latestContract([first, renewal])).toBe(renewal)
    expect(latestContract([])).toBeNull()
  })
})

describe('contractHours', () => {
  it('uses the contract range, else the route default', () => {
    expect(contractHours(first, 'levtech')).toBe(160)
    expect(contractHours(renewal, 'levtech')).toBe(168)
  })
})

describe('effectiveRate', () => {
  it('prefers the latest contract, then the legacy actual rate, then the case sheet', () => {
    expect(effectiveRate(sheet, [first, renewal])).toEqual({
      monthlyIncl: 935_000,
      monthlyMinIncl: null,
      hours: 168,
      source: 'contract',
    })
    expect(effectiveRate({ ...sheet, actualMonthlyIncl: 990_000 }, [])).toEqual({
      monthlyIncl: 990_000,
      monthlyMinIncl: null,
      hours: 160,
      source: 'actual',
    })
    expect(effectiveRate({ ...sheet, monthlyMinIncl: 990_000 }, [])).toEqual({
      monthlyIncl: 1_100_000,
      monthlyMinIncl: 990_000,
      hours: 160,
      source: 'sheet',
    })
  })
})

describe('formatEffectiveRateLines', () => {
  it('keeps the case-sheet look, and names a contract or actual rate as its source', () => {
    expect(
      formatEffectiveRateLines(effectiveRate({ ...sheet, monthlyMinIncl: 990_000 }, [])),
    ).toEqual({ main: '99万〜110万', sub: '(税抜 90万〜100万)' })
    expect(formatEffectiveRateLines(effectiveRate(sheet, [first]))).toEqual({
      main: '88万',
      sub: '(税抜 80万・契約)',
    })
    expect(
      formatEffectiveRateLines(effectiveRate({ ...sheet, actualMonthlyIncl: 990_000 }, [])),
    ).toEqual({ main: '99万', sub: '(税抜 90万・実単価)' })
  })
})

describe('contractPeriod', () => {
  it('shows both ends with slashes, or an open end', () => {
    expect(contractPeriod(first)).toBe('2030/10/16 〜 2030/12/31')
    expect(contractPeriod(renewal)).toBe('2031/01/01 〜')
    expect(contractPeriod({ startDate: '2030-10', endDate: '2030-12' })).toBe('2030/10 〜 2030/12')
  })
})

const joinedCase = {
  id: 'a',
  status: 'joined',
  startDate: '2030-10-01',
  endDate: '2030-12-31',
  monthlyMaxIncl: 1_100_000,
  actualMonthlyIncl: null,
}

describe('forecastCases', () => {
  it('one entry per contract of a joined case; a case without contracts falls back to its row', () => {
    const noContract = { ...joinedCase, id: 'b', actualMonthlyIncl: 770_000 }
    const notJoined = { ...joinedCase, id: 'c', status: 'offer' }
    const byCase = new Map([['a', [first, renewal]]])
    expect(forecastCases([joinedCase, noContract, notJoined], byCase)).toEqual([
      { monthly: 880_000, startDate: '2030-10-16', endDate: '2030-12-31' },
      { monthly: 935_000, startDate: '2031-01-01', endDate: null },
      { monthly: 770_000, startDate: '2030-10-01', endDate: '2030-12-31' },
    ])
    expect(forecastCases([{ ...joinedCase, id: 'b' }], byCase)).toEqual([
      { monthly: 1_100_000, startDate: '2030-10-01', endDate: '2030-12-31' },
    ])
  })
})

describe('ratePoints', () => {
  it('lists every contract of joined and ended cases by start month, ascending', () => {
    const ended = { id: 'e', status: 'ended', startDate: '2029-04', actualMonthlyIncl: 770_000 }
    const silent = { id: 's', status: 'ended', startDate: '2028-01', actualMonthlyIncl: null }
    const active = { id: 'x', status: 'meeting', startDate: '2031-05', actualMonthlyIncl: 1 }
    const byCase = new Map([['a', [renewal, first]]])
    expect(ratePoints([joinedCase, ended, silent, active], byCase)).toEqual([
      { ym: '2029-04', rate: 770_000 },
      { ym: '2030-10', rate: 880_000 },
      { ym: '2031-01', rate: 935_000 },
    ])
  })
})

describe('groupByCase', () => {
  it('keeps each case’s rows together in input order', () => {
    const rows = [
      { caseId: 'a', n: 1 },
      { caseId: 'b', n: 2 },
      { caseId: 'a', n: 3 },
    ]
    expect([...groupByCase(rows).entries()]).toEqual([
      ['a', [rows[0], rows[2]]],
      ['b', [rows[1]]],
    ])
  })
})

describe('dayAfter', () => {
  it('steps over month and year ends, and moves month-only values a month', () => {
    expect(dayAfter('2030-12-31')).toBe('2031-01-01')
    expect(dayAfter('2030-02-28')).toBe('2030-03-01')
    expect(dayAfter('2030-12')).toBe('2031-01')
    expect(dayAfter('2030-04')).toBe('2030-05')
  })
})

describe('nextContractDefaults', () => {
  const c = {
    startDate: '2030-10-16',
    endDate: '2030-12-31',
    monthlyMaxIncl: 1_100_000,
    monthlyMinIncl: null,
    settlementMinH: 140,
    settlementMaxH: 180,
    actualMonthlyIncl: null,
  }
  it('a renewal starts the day after the latest contract and repeats its terms', () => {
    expect(nextContractDefaults(c, [first])).toEqual({
      startDate: '2031-01-01',
      endDate: null,
      monthlyIncl: 880_000,
      settlementMinH: 140,
      settlementMaxH: 180,
    })
    // An open-ended latest contract has no day after; start from its own start so the date is at least plausible
    expect(nextContractDefaults(c, [first, renewal]).startDate).toBe('2031-01-01')
  })
  it('the first contract starts from the case row, preferring the actual rate, then the floor, then the cap', () => {
    expect(nextContractDefaults(c, [])).toEqual({
      startDate: '2030-10-16',
      endDate: '2030-12-31',
      monthlyIncl: 1_100_000,
      settlementMinH: 140,
      settlementMaxH: 180,
    })
    expect(nextContractDefaults({ ...c, monthlyMinIncl: 990_000 }, []).monthlyIncl).toBe(990_000)
    expect(
      nextContractDefaults({ ...c, monthlyMinIncl: 990_000, actualMonthlyIncl: 880_000 }, [])
        .monthlyIncl,
    ).toBe(880_000)
  })
})
