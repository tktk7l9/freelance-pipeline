/**
 * Pure part that turns case rows into D1 SQL statements. No I/O here.
 * Shared by add-case (INSERT / UPDATE) and import-history (INSERT OR REPLACE).
 */
import { createHash } from 'node:crypto'

import type { CaseRowValues } from '../../src/lib/caseInput.ts'

export function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'boolean') return value ? '1' : '0'
  if (typeof value === 'number') return String(value)
  return `'${String(value).replaceAll("'", "''")}'`
}

/** camelCase → snake_case (must match the column names in schema.ts) */
function snake(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
}

const JSON_COLUMNS = new Set(['mustSkills', 'niceSkills', 'fitScores'])

/**
 * Only the columns contained in a case sheet (the JSON Claude Code writes). `--update` does not
 * touch any other column (status, nextAction, nextActionDue, fitScores, actualMonthlyIncl, note),
 * so re-importing a case sheet never rolls back the pipeline progress.
 */
export const SHEET_COLUMNS = [
  'company',
  'title',
  'route',
  'agentName',
  'monthlyMaxIncl',
  'monthlyMinIncl',
  'sourceTaxBasis',
  'settlementMinH',
  'settlementMaxH',
  'remoteType',
  'onsiteNote',
  'startDate',
  'endDate',
  'daysPerWeek',
  'workLocation',
  'supplyChain',
  'paymentSiteDays',
  'sourceUrl',
  'mustSkills',
  'niceSkills',
  'rawText',
] as const satisfies readonly (keyof CaseRowValues)[]

export function caseColumns(row: CaseRowValues): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    out[snake(k)] = JSON_COLUMNS.has(k) ? (v === null ? null : JSON.stringify(v)) : v
  }
  return out
}

function insertInto(table: string, cols: Record<string, unknown>, orReplace: boolean): string {
  const names = Object.keys(cols)
  const values = names.map((n) => sqlLiteral(cols[n]))
  return `INSERT ${orReplace ? 'OR REPLACE ' : ''}INTO ${table} (${names.join(', ')}) VALUES (${values.join(', ')});`
}

export function insertCaseStatements(p: {
  id: string
  row: CaseRowValues
  at: string
  importNote: string
  logId: string
  orReplace?: boolean
}): string[] {
  const orReplace = p.orReplace ?? false
  return [
    insertInto('cases', { id: p.id, ...caseColumns(p.row) }, orReplace),
    insertInto(
      'case_log',
      { id: p.logId, case_id: p.id, at: p.at, kind: 'import', body: p.importNote },
      orReplace,
    ),
  ]
}

/** Overwrite only the case-sheet columns (SHEET_COLUMNS). Progress such as status is kept */
export function updateCaseStatement(id: string, row: CaseRowValues): string {
  const cols = caseColumns(row)
  const sets = SHEET_COLUMNS.map((k) => `${snake(k)} = ${sqlLiteral(cols[snake(k)])}`)
  sets.push("updated_at = (datetime('now'))")
  return `UPDATE cases SET ${sets.join(', ')} WHERE id = ${sqlLiteral(id)};`
}

/** Record in case_log that `--update` imported a case sheet (kind: 'import', so it is not mistaken for a status change) */
export function updateLogStatement(p: {
  id: string
  caseId: string
  at: string
  body: string
}): string {
  return insertInto(
    'case_log',
    { id: p.id, case_id: p.caseId, at: p.at, kind: 'import', body: p.body },
    false,
  )
}

/** Store the company's official site as one row per company (overwrite the URL if the name matches) */
export function upsertCompanyStatement(name: string, url: string): string {
  return `INSERT INTO companies (name, url) VALUES (${sqlLiteral(name)}, ${sqlLiteral(url)}) ON CONFLICT(name) DO UPDATE SET url = excluded.url, updated_at = (datetime('now'));`
}

export function duplicateQuery(q: {
  sourceUrl: string | null
  company: string
  title: string
}): string {
  const pair = `(company = ${sqlLiteral(q.company)} AND title = ${sqlLiteral(q.title)})`
  const where = q.sourceUrl ? `source_url = ${sqlLiteral(q.sourceUrl)} OR ${pair}` : pair
  return `SELECT id, company, title, status FROM cases WHERE ${where} LIMIT 5;`
}

/** Build a deterministic UUID-shaped id from the slug (idempotency for import-history) */
export function slugToId(slug: string): string {
  const hex = createHash('sha256').update(`freelance-pipeline:${slug}`).digest('hex').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}
