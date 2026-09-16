import { z } from 'zod'

import { REMOTE_TYPES, ROUTES, TAX_BASES } from './enums.ts'
import { toIncl } from './rate.ts'
import { CASE_STATUSES } from './status.ts'

/**
 * Claude Code が書く JSON の契約。scripts/add-case.ts と /import フォームが同じものを使う。
 * 金額は案件票の表示のまま（taxBasis で税込/税抜を宣言）。税込化は toCaseRow が行う。
 */
const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .default(null)

const nullableInt = (min: number, max: number) =>
  z.number().int().min(min).max(max).nullable().default(null)

const YEAR_MONTH_OR_DATE = /^\d{4}-\d{2}(-\d{2})?$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

export const caseInputSchema = z
  .object({
    company: z.string().trim().min(1).max(200),
    title: z.string().trim().min(1).max(300),
    route: z.enum(ROUTES),
    agentName: nullableText(100),
    monthlyMax: z.number().int().min(1).max(100_000_000),
    monthlyMin: nullableInt(1, 100_000_000),
    taxBasis: z.enum(TAX_BASES),
    settlementMinH: nullableInt(1, 400),
    settlementMaxH: nullableInt(1, 400),
    remoteType: z.enum(REMOTE_TYPES),
    onsiteNote: nullableText(200),
    startDate: z.string().regex(YEAR_MONTH_OR_DATE),
    endDate: z.string().regex(YEAR_MONTH_OR_DATE).nullable().default(null),
    daysPerWeek: nullableText(50),
    workLocation: nullableText(200),
    supplyChain: nullableText(200),
    paymentSiteDays: nullableInt(0, 365),
    sourceUrl: z
      .string()
      .trim()
      .max(500)
      .transform((v) => (v === '' ? null : v))
      .nullable()
      .default(null)
      .refine((v) => v === null || /^https?:\/\//.test(v), 'URL は http(s):// で始めてください'),
    mustSkills: z.array(z.string().trim().min(1).max(100)).max(50).default([]),
    niceSkills: z.array(z.string().trim().min(1).max(100)).max(50).default([]),
    rawText: z.string().min(1).max(50_000),
    status: z.enum(CASE_STATUSES).default('saved'),
    nextAction: nullableText(200),
    nextActionDue: z.string().regex(DATE).nullable().default(null),
    fitScores: z.array(z.number().int().min(0).max(2)).max(10).nullable().default(null),
    actualMonthlyIncl: nullableInt(1, 100_000_000),
    note: nullableText(4000),
  })
  .refine((v) => v.monthlyMin === null || v.monthlyMin <= v.monthlyMax, {
    message: '単価の下限が上限を超えています',
    path: ['monthlyMin'],
  })
  .refine(
    (v) =>
      v.settlementMinH === null ||
      v.settlementMaxH === null ||
      v.settlementMinH <= v.settlementMaxH,
    { message: '精算幅の下限が上限を超えています', path: ['settlementMinH'] },
  )

export type CaseInput = z.infer<typeof caseInputSchema>

/** cases テーブルの列（id・timestamps を除く）。schema.ts の NewCase と同じ名前にする */
export type CaseRowValues = {
  company: string
  title: string
  route: CaseInput['route']
  agentName: string | null
  monthlyMaxIncl: number
  monthlyMinIncl: number | null
  sourceTaxBasis: CaseInput['taxBasis']
  settlementMinH: number | null
  settlementMaxH: number | null
  remoteType: CaseInput['remoteType']
  onsiteNote: string | null
  startDate: string
  endDate: string | null
  daysPerWeek: string | null
  workLocation: string | null
  supplyChain: string | null
  paymentSiteDays: number | null
  sourceUrl: string | null
  mustSkills: string[]
  niceSkills: string[]
  rawText: string
  status: CaseInput['status']
  nextAction: string | null
  nextActionDue: string | null
  fitScores: number[] | null
  actualMonthlyIncl: number | null
  note: string | null
}

export function toCaseRow(input: CaseInput): CaseRowValues {
  const { monthlyMax, monthlyMin, taxBasis, ...rest } = input
  return {
    ...rest,
    monthlyMaxIncl: toIncl(monthlyMax, taxBasis),
    monthlyMinIncl: monthlyMin === null ? null : toIncl(monthlyMin, taxBasis),
    sourceTaxBasis: taxBasis,
  }
}

export type CaseJsonIssue = { path: string; message: string }

export function parseCaseJson(
  text: string,
): { ok: true; input: CaseInput } | { ok: false; issues: CaseJsonIssue[] } {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, issues: [{ path: '', message: 'JSON として読めません' }] }
  }
  const result = caseInputSchema.safeParse(json)
  if (result.success) return { ok: true, input: result.data }
  return {
    ok: false,
    issues: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
  }
}

/** AGENTS.md と /import の placeholder に出す例（架空値） */
export const CASE_JSON_EXAMPLE = JSON.stringify(
  {
    company: '甲社',
    title: 'テスト案件（サンプル）',
    route: 'findy',
    agentName: null,
    monthlyMax: 1120000,
    monthlyMin: null,
    taxBasis: 'excl',
    settlementMinH: 140,
    settlementMaxH: 180,
    remoteType: 'full',
    onsiteNote: null,
    startDate: '2030-01',
    daysPerWeek: '週4〜5',
    workLocation: null,
    supplyChain: null,
    paymentSiteDays: null,
    sourceUrl: 'https://example.com/jobs/1',
    mustSkills: ['TypeScript', 'React'],
    niceSkills: ['Cloudflare'],
    rawText: '（案件票の原文をそのまま）',
    status: 'saved',
    nextAction: null,
    nextActionDue: null,
    note: null,
  },
  null,
  2,
)
