import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

import { LOG_KINDS, REMOTE_TYPES, ROUTES, TAX_BASES } from '../lib/enums'
import { CASE_STATUSES } from '../lib/status'

/**
 * 方針: 日付は TEXT の ISO-8601（日付のみ 'YYYY-MM-DD'、月のみ 'YYYY-MM'）、
 * 金額は円の整数、id は text（crypto.randomUUID()）。
 * createdAt / updatedAt は両方 datetime('now')（1 列 2 書式にしない）。
 */
export const timestamps = {
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
}

const id = () => text('id').primaryKey()
const jsonList = (name: string) =>
  text(name, { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`)

/** 判断基準（thresholds / axes）はここにだけ置く。コードに書かない */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamps.updatedAt,
})

/** 1 行 = 1 案件。選考中も過去案件も同じ表 */
export const cases = sqliteTable(
  'cases',
  {
    id: id(),
    company: text('company').notNull(),
    title: text('title').notNull(),
    route: text('route', { enum: ROUTES }).notNull(),
    /** 担当エージェント名（誰に聞くか） */
    agentName: text('agent_name'),
    /** 単価上限・税込（円）。列名に Incl を入れて取り違えを型で防ぐ */
    monthlyMaxIncl: integer('monthly_max_incl').notNull(),
    monthlyMinIncl: integer('monthly_min_incl'),
    /** 案件票の表示がどちらだったか。×1.1 は src/lib/rate.ts の toIncl が行う */
    sourceTaxBasis: text('source_tax_basis', { enum: TAX_BASES }).notNull(),
    settlementMinH: integer('settlement_min_h'),
    settlementMaxH: integer('settlement_max_h'),
    remoteType: text('remote_type', { enum: REMOTE_TYPES }).notNull(),
    onsiteNote: text('onsite_note'),
    /** 'YYYY-MM-DD' または 'YYYY-MM' */
    startDate: text('start_date').notNull(),
    endDate: text('end_date'),
    daysPerWeek: text('days_per_week'),
    workLocation: text('work_location'),
    supplyChain: text('supply_chain'),
    paymentSiteDays: integer('payment_site_days'),
    sourceUrl: text('source_url'),
    mustSkills: jsonList('must_skills'),
    niceSkills: jsonList('nice_skills'),
    /** 案件票の原文そのまま */
    rawText: text('raw_text').notNull(),
    status: text('status', { enum: CASE_STATUSES }).notNull().default('saved'),
    nextAction: text('next_action'),
    nextActionDue: text('next_action_due'),
    /** settings.axes に対応する 0〜2。比較ビューで ○△× */
    fitScores: text('fit_scores', { mode: 'json' }).$type<number[]>(),
    /** 過去案件の実単価・税込 */
    actualMonthlyIncl: integer('actual_monthly_incl'),
    note: text('note'),
    ...timestamps,
  },
  (t) => [
    index('cases_status_idx').on(t.status),
    index('cases_due_idx').on(t.nextActionDue),
    uniqueIndex('cases_source_url_unique').on(t.sourceUrl),
  ],
)

/** 経緯。ステータス変更は自動で 1 行、メモは日付つきで手で足す */
export const caseLog = sqliteTable(
  'case_log',
  {
    id: id(),
    caseId: text('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    /** ISO-8601 日時 */
    at: text('at').notNull(),
    kind: text('kind', { enum: LOG_KINDS }).notNull(),
    fromStatus: text('from_status'),
    toStatus: text('to_status'),
    body: text('body').notNull().default(''),
    createdAt: timestamps.createdAt,
  },
  (t) => [index('case_log_case_idx').on(t.caseId, t.at)],
)

export type Case = typeof cases.$inferSelect
export type NewCase = typeof cases.$inferInsert
export type CaseLogRow = typeof caseLog.$inferSelect
export type NewCaseLog = typeof caseLog.$inferInsert
export type Setting = typeof settings.$inferSelect
