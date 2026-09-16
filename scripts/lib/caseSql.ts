/**
 * 案件行を D1 の SQL 文へ変換する純粋な部分。I/O はここに書かない。
 * add-case（INSERT / UPDATE）と import-history（INSERT OR REPLACE）が共有する。
 */
import { createHash } from 'node:crypto'

import type { CaseRowValues } from '../../src/lib/caseInput.ts'

export function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'boolean') return value ? '1' : '0'
  if (typeof value === 'number') return String(value)
  return `'${String(value).replaceAll("'", "''")}'`
}

/** camelCase → snake_case（schema.ts の列名と一致させる） */
function snake(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
}

const JSON_COLUMNS = new Set(['mustSkills', 'niceSkills', 'fitScores'])

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

export function updateCaseStatement(id: string, row: CaseRowValues): string {
  const cols = caseColumns(row)
  const sets = Object.keys(cols).map((n) => `${n} = ${sqlLiteral(cols[n])}`)
  sets.push("updated_at = (datetime('now'))")
  return `UPDATE cases SET ${sets.join(', ')} WHERE id = ${sqlLiteral(id)};`
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

/** slug から決定的に UUID 形の id を作る（import-history の冪等性） */
export function slugToId(slug: string): string {
  const hex = createHash('sha256').update(`freelance-pipeline:${slug}`).digest('hex').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}
