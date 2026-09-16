/**
 * 過去案件ファイル（history.local.json）を D1 の SQL 文へ変換する純粋な部分。
 * slug を冪等キーにして決定的な id を作り、INSERT OR REPLACE で何度流しても同じ状態にする。
 */
import { z } from 'zod'

import { caseInputSchema, toCaseRow } from '../../src/lib/caseInput.ts'
import { insertCaseStatements, slugToId } from './caseSql.ts'

/** history.local.json の形。1 件 = caseInputSchema + slug（冪等キー） */
export const historyFileSchema = z.object({
  cases: z.array(z.object({ slug: z.string().min(1).max(100) }).and(caseInputSchema)),
})
export type HistoryFile = z.infer<typeof historyFileSchema>

export function buildHistoryStatements(file: HistoryFile, at: string): string[] {
  return file.cases.flatMap(({ slug, ...input }) =>
    insertCaseStatements({
      id: slugToId(`case:${slug}`),
      row: toCaseRow(input),
      at,
      importNote: 'import-history',
      logId: slugToId(`log:${slug}`),
      orReplace: true,
    }),
  )
}
