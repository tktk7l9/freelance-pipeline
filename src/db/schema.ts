import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

import { EVENT_KINDS, LEDGER_KINDS, LOG_KINDS, REMOTE_TYPES, ROUTES, TAX_BASES } from '../lib/enums'
import { CASE_STATUSES } from '../lib/status'

/**
 * Policy: dates are ISO-8601 TEXT (date only 'YYYY-MM-DD', month only 'YYYY-MM'),
 * amounts are integer yen, ids are text (crypto.randomUUID()).
 * createdAt / updatedAt both use datetime('now') (never two formats in one column).
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

/** Decision criteria (thresholds / axes) live only here. Never in code */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamps.updatedAt,
})

/**
 * The company's official site. One row per company, keyed by company name (the exact cases.company string).
 * Not stored per case so that setting it once applies to every case of the same company.
 */
export const companies = sqliteTable('companies', {
  name: text('name').primaryKey(),
  url: text('url').notNull(),
  updatedAt: timestamps.updatedAt,
})

/** One row = one case. In-progress and past cases share the same table */
export const cases = sqliteTable(
  'cases',
  {
    id: id(),
    company: text('company').notNull(),
    title: text('title').notNull(),
    route: text('route', { enum: ROUTES }).notNull(),
    /** Agent in charge (who to ask) */
    agentName: text('agent_name'),
    /** Rate cap, tax included (yen). Incl in the column name lets the type prevent mix-ups */
    monthlyMaxIncl: integer('monthly_max_incl').notNull(),
    monthlyMinIncl: integer('monthly_min_incl'),
    /** Which way the case sheet displayed it. The ×1.1 is done by toIncl in src/lib/rate.ts */
    sourceTaxBasis: text('source_tax_basis', { enum: TAX_BASES }).notNull(),
    settlementMinH: integer('settlement_min_h'),
    settlementMaxH: integer('settlement_max_h'),
    remoteType: text('remote_type', { enum: REMOTE_TYPES }).notNull(),
    onsiteNote: text('onsite_note'),
    /** 'YYYY-MM-DD' or 'YYYY-MM' */
    startDate: text('start_date').notNull(),
    endDate: text('end_date'),
    daysPerWeek: text('days_per_week'),
    workLocation: text('work_location'),
    supplyChain: text('supply_chain'),
    paymentSiteDays: integer('payment_site_days'),
    sourceUrl: text('source_url'),
    mustSkills: jsonList('must_skills'),
    niceSkills: jsonList('nice_skills'),
    /** The case sheet's raw text as is */
    rawText: text('raw_text').notNull(),
    status: text('status', { enum: CASE_STATUSES }).notNull().default('saved'),
    nextAction: text('next_action'),
    nextActionDue: text('next_action_due'),
    /** 0–2 per settings.axes. Shown as ○△× in the compare view */
    fitScores: text('fit_scores', { mode: 'json' }).$type<number[]>(),
    /** Actual rate of a past case, tax included */
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

/** History. Status changes add a row automatically; memos are added by hand with a date */
export const caseLog = sqliteTable(
  'case_log',
  {
    id: id(),
    caseId: text('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    /** ISO-8601 datetime */
    at: text('at').notNull(),
    kind: text('kind', { enum: LOG_KINDS }).notNull(),
    fromStatus: text('from_status'),
    toStatus: text('to_status'),
    body: text('body').notNull().default(''),
    createdAt: timestamps.createdAt,
  },
  (t) => [index('case_log_case_idx').on(t.caseId, t.at)],
)

/**
 * Events (calendar). For all-day events startsAt is 'YYYY-MM-DD'; otherwise ISO-8601 (+09:00).
 * Can be linked to a case (if the case is deleted, the event stays and only the link is removed).
 */
export const events = sqliteTable(
  'events',
  {
    id: id(),
    title: text('title').notNull(),
    kind: text('kind', { enum: EVENT_KINDS }).notNull().default('meeting'),
    startsAt: text('starts_at').notNull(),
    endsAt: text('ends_at'),
    allDay: integer('all_day', { mode: 'boolean' }).notNull().default(false),
    caseId: text('case_id').references(() => cases.id, { onDelete: 'set null' }),
    note: text('note'),
    ...timestamps,
  },
  (t) => [index('events_starts_idx').on(t.startsAt)],
)

/**
 * Income/expense ledger. One row = one invoice, receipt, or payment (per year-month). Income and expenses share
 * the same table, split by kind. Amounts are integer yen. Revenue is stored tax included (tax-excluded is ÷1.1 on display).
 * Expenses are expected as one row summing the monthly/yearly totals from MF Cloud (no per-receipt bookkeeping).
 */
export const ledger = sqliteTable(
  'ledger',
  {
    id: id(),
    /** 'YYYY-MM' */
    yearMonth: text('year_month').notNull(),
    kind: text('kind', { enum: LEDGER_KINDS }).notNull(),
    /** Payer / payee (e.g. Levtech, Saito Kousan, the tax office) */
    party: text('party'),
    caseId: text('case_id').references(() => cases.id, { onDelete: 'set null' }),
    amount: integer('amount').notNull(),
    note: text('note'),
    ...timestamps,
  },
  (t) => [index('ledger_ym_idx').on(t.yearMonth)],
)

/**
 * Snapshot of market data (case data and talent data from the Levtech platform).
 * One row per skill × capture date. The body is JSON (shape: marketDataSchema in src/lib/market.ts).
 * Transcribed from screenshots, so re-entering the same skill on the same day overwrites it.
 */
export const marketSnapshots = sqliteTable(
  'market_snapshots',
  {
    id: id(),
    /** 'YYYY-MM-DD' */
    takenOn: text('taken_on').notNull(),
    skill: text('skill').notNull(),
    source: text('source').notNull().default('levtech'),
    data: text('data').notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex('market_snapshots_unique').on(t.takenOn, t.skill)],
)

export type Case = typeof cases.$inferSelect
export type NewCase = typeof cases.$inferInsert
export type CaseLogRow = typeof caseLog.$inferSelect
export type NewCaseLog = typeof caseLog.$inferInsert
export type Setting = typeof settings.$inferSelect
export type EventRow = typeof events.$inferSelect
export type CompanyRow = typeof companies.$inferSelect
export type LedgerRow = typeof ledger.$inferSelect
export type MarketSnapshotRow = typeof marketSnapshots.$inferSelect
