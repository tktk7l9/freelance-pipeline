import { z } from 'zod'

import {
  REMOTE_LABEL,
  REMOTE_TYPES,
  ROUTE_LABEL,
  ROUTES,
  TAX_BASES,
  TAX_BASIS_LABEL,
} from './enums.ts'
import { toIncl } from './rate.ts'
import { CASE_STATUSES, STATUS_LABEL } from './status.ts'

/**
 * Contract for the JSON Claude Code writes. scripts/add-case.ts and the /import form use the same one.
 * Amounts are as displayed on the case sheet (taxBasis declares incl/excl). toCaseRow converts to tax included.
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
    /** The company's official site. Goes into the companies table, not a case column (toCaseRow strips it) */
    companyUrl: z
      .string()
      .trim()
      .max(500)
      .transform((v) => (v === '' ? null : v))
      .nullable()
      .default(null)
      .refine((v) => v === null || /^https?:\/\//.test(v), 'URL は http(s):// で始めてください'),
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

/** Columns of the cases table (excluding id and timestamps). Use the same names as NewCase in schema.ts */
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
  const { monthlyMax, monthlyMin, taxBasis, companyUrl: _companyUrl, ...rest } = input
  return {
    ...rest,
    monthlyMaxIncl: toIncl(monthlyMax, taxBasis),
    monthlyMinIncl: monthlyMin === null ? null : toIncl(monthlyMin, taxBasis),
    sourceTaxBasis: taxBasis,
  }
}

/** `path` is the raw key path (for scripts); `label` and `message` are for people (Japanese) */
export type CaseJsonIssue = { path: string; label: string; message: string }

/** Japanese names of the JSON keys, matching the labels of the case form */
const FIELD_LABEL: Record<string, string> = {
  company: '企業名',
  companyUrl: '会社の公式サイト',
  title: '案件名',
  route: '経路',
  agentName: '担当エージェント',
  monthlyMax: '単価上限',
  monthlyMin: '単価下限',
  taxBasis: '税込/税抜',
  settlementMinH: '精算 下限',
  settlementMaxH: '精算 上限',
  remoteType: 'リモート',
  onsiteNote: '出社の実態',
  startDate: '開始',
  endDate: '終了',
  daysPerWeek: '稼働',
  workLocation: '作業場所',
  supplyChain: '商流',
  paymentSiteDays: '支払サイト',
  sourceUrl: '案件 URL',
  mustSkills: '必須スキル',
  niceSkills: '歓迎スキル',
  rawText: '原文',
  status: '状態',
  nextAction: '次の一手',
  nextActionDue: '期日',
  fitScores: '軸の点数',
  actualMonthlyIncl: '実単価',
  note: '判断メモ',
}

/** Labels for enum values, so "one of" can name the choices in both the JSON form and words */
const VALUE_LABEL: Record<string, Record<string, string>> = {
  route: ROUTE_LABEL,
  taxBasis: TAX_BASIS_LABEL,
  remoteType: REMOTE_LABEL,
  status: STATUS_LABEL,
}

const DATE_FORMAT_HINT: Record<string, string> = {
  startDate: '2030-11 か 2030-11-16',
  endDate: '2030-11 か 2030-11-16',
  nextActionDue: '2030-11-16',
}

const EXPECTED_HINT: Record<string, string> = {
  number: '数値で入れる',
  string: '文字で入れる',
  array: '配列で入れる',
}

const JAPANESE_CHAR = /[぀-ヿ㐀-鿿]/

/** The subset of a zod issue this reads (zod's default messages are English and not shown) */
export type RawCaseIssue = {
  code: string
  path: readonly PropertyKey[]
  message: string
  expected?: string
  values?: readonly unknown[]
  origin?: string
  minimum?: number | bigint
  maximum?: number | bigint
}

/**
 * Turns a zod issue into a Japanese sentence that says which field and how to fix it
 * (SHIG 55: constructive errors, 11: the user's words).
 */
export function describeCaseIssue(issue: RawCaseIssue): CaseJsonIssue {
  const path = issue.path.map(String).join('.')
  const key = issue.path.length > 0 ? String(issue.path[0]) : ''
  const label = key === '' ? 'JSON' : (FIELD_LABEL[key] ?? key)
  const say = (message: string) => ({ path, label, message })
  if (JAPANESE_CHAR.test(issue.message)) return say(issue.message)
  switch (issue.code) {
    case 'invalid_type': {
      if (/received undefined/.test(issue.message)) return say(`${label}がありません`)
      const hint = issue.expected ? EXPECTED_HINT[issue.expected] : undefined
      return say(hint ? `${label}の形が違います（${hint}）` : `${label}の形が違います`)
    }
    case 'invalid_value': {
      const names = VALUE_LABEL[key] ?? {}
      const choices = (issue.values ?? []).map((v) => {
        const name = typeof v === 'string' ? names[v] : undefined
        return name ? `${String(v)}（${name}）` : String(v)
      })
      return say(`${label}は ${choices.join('／')} のどれか`)
    }
    case 'too_small':
      if (issue.origin === 'string') return say(`${label}が空です`)
      if (issue.minimum !== undefined) return say(`${label}は ${issue.minimum} 以上`)
      break
    case 'too_big':
      if (issue.origin === 'string') return say(`${label}が長すぎます（${issue.maximum} 文字まで）`)
      if (issue.origin === 'array') return say(`${label}が多すぎます（${issue.maximum} 個まで）`)
      return say(`${label}は ${issue.maximum} 以下`)
    case 'invalid_format': {
      const hint = DATE_FORMAT_HINT[key]
      return say(hint ? `${label}は ${hint} の形で` : `${label}の形が違います`)
    }
  }
  return say(`${label}: 内容を確認してください`)
}

export function parseCaseJson(
  text: string,
): { ok: true; input: CaseInput } | { ok: false; issues: CaseJsonIssue[] } {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, issues: [{ path: '', label: 'JSON', message: 'JSON として読めません' }] }
  }
  const result = caseInputSchema.safeParse(json)
  if (result.success) return { ok: true, input: result.data }
  return {
    ok: false,
    issues: result.error.issues.map((i) => describeCaseIssue(i as RawCaseIssue)),
  }
}

/** Example shown in AGENTS.md and the /import placeholder (fictitious values) */
export const CASE_JSON_EXAMPLE = JSON.stringify(
  {
    company: '甲社',
    companyUrl: 'https://example.com',
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
