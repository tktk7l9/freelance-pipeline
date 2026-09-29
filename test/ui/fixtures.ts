/**
 * Fictional records for UI tests. Never put real companies, cases, rates, or people here
 * (see AGENTS.md: the repository is public).
 */
import type { CaseLogRow, EventRow, LedgerRow } from '../../src/db/schema'
import { EMPTY_BUSINESS, type BusinessInfo } from '../../src/lib/business'
import type { Thresholds } from '../../src/lib/compare'
import type { MarketData } from '../../src/lib/market'
import { statusGroup } from '../../src/lib/status'
import type { CaseListItem } from '../../src/server/cases'
import type { MarketSkill } from '../../src/server/market'

export const TODAY = '2030-11-10'

let seq = 0
/** A UUID-shaped id so it passes the server-side id validation the real forms would face */
export function uuid(): string {
  seq += 1
  return `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`
}

export function makeCase(overrides: Partial<CaseListItem> = {}): CaseListItem {
  const base = {
    id: uuid(),
    company: '甲社',
    title: 'テスト案件',
    route: 'findy' as const,
    agentName: null,
    monthlyMaxIncl: 880_000,
    monthlyMinIncl: null,
    sourceTaxBasis: 'incl' as const,
    settlementMinH: 140,
    settlementMaxH: 180,
    remoteType: 'full' as const,
    onsiteNote: null,
    startDate: '2030-12-01',
    endDate: null,
    daysPerWeek: null,
    workLocation: null,
    supplyChain: null,
    paymentSiteDays: null,
    sourceUrl: null,
    mustSkills: [],
    niceSkills: [],
    rawText: 'テスト用の原文',
    status: 'applied' as const,
    nextAction: null,
    nextActionDue: null,
    fitScores: null,
    actualMonthlyIncl: null,
    note: null,
    createdAt: '2030-11-01 00:00:00',
    updatedAt: '2030-11-01 00:00:00',
    monthlyExcl: 800_000,
    hourly: 5_000,
    hours: 160,
    group: 'active' as const,
  }
  const merged = { ...base, ...overrides }
  return { ...merged, group: overrides.group ?? statusGroup(merged.status) }
}

export function makeLog(overrides: Partial<CaseLogRow> = {}): CaseLogRow {
  return {
    id: uuid(),
    caseId: 'c1',
    at: '2030-11-05T03:00:00.000Z',
    kind: 'memo',
    fromStatus: null,
    toStatus: null,
    body: 'テストのメモ',
    createdAt: '2030-11-05 03:00:00',
    ...overrides,
  }
}

export function makeLedger(overrides: Partial<LedgerRow> = {}): LedgerRow {
  return {
    id: uuid(),
    yearMonth: '2030-10',
    kind: 'freelance',
    party: '乙エージェント',
    caseId: null,
    amount: 880_000,
    note: null,
    createdAt: '2030-10-31 00:00:00',
    updatedAt: '2030-10-31 00:00:00',
    ...overrides,
  }
}

export function makeEvent(overrides: Partial<EventRow> = {}): EventRow {
  return {
    id: uuid(),
    title: 'テスト商談',
    kind: 'meeting',
    startsAt: '2030-11-12T10:00:00+09:00',
    endsAt: '2030-11-12T11:00:00+09:00',
    allDay: false,
    caseId: null,
    note: null,
    createdAt: '2030-11-01 00:00:00',
    updatedAt: '2030-11-01 00:00:00',
    ...overrides,
  }
}

export const NO_THRESHOLDS: Thresholds = {
  minMonthlyIncl: null,
  minHourlyExcl: null,
  targetStart: null,
  maxOnsitePerMonth: null,
}

export function makeBusiness(overrides: Partial<BusinessInfo> = {}): BusinessInfo {
  return { ...EMPTY_BUSINESS, ...overrides }
}

export function makeMarketData(overrides: Partial<MarketData> = {}): MarketData {
  return {
    sourceUrl: 'https://example.com/market',
    jobs: {
      open: 120,
      newWeek: 15,
      ratio: 0.8,
      growthPct: 12,
      maxRate: 1_500_000,
      byDays: [
        { label: '週5日', count: 80 },
        { label: '週3日', count: 40 },
      ],
      remote: [
        { label: 'フル', pct: 60 },
        { label: '一部', pct: 40 },
      ],
    },
    talent: {
      annualRaiseAvg: 60_000,
      bins: [600_000, 800_000, 1_000_000],
      ageRate: [
        {
          band: '30代前半',
          cells: [
            { bin: 600_000, pct: 30 },
            { bin: 800_000, pct: 50 },
            { bin: 1_000_000, pct: 20 },
          ],
        },
        {
          band: '40代前半',
          cells: [
            { bin: 600_000, pct: 5 },
            { bin: 800_000, pct: 45 },
            { bin: 1_000_000, pct: 50 },
          ],
        },
      ],
      ageShare: [{ label: '30代', pct: 40 }],
      renewal: [{ label: '更新', pct: 70 }],
    },
    ...overrides,
  }
}

export function makeSkill(skill: string, data: MarketData = makeMarketData()): MarketSkill {
  return { skill, takenOn: '2030-11-01', data }
}
