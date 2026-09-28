/**
 * Pure part that turns the past-case file (history.local.json) into D1 SQL statements.
 * Uses the slug as the idempotency key to build deterministic ids, so INSERT OR REPLACE yields the same state however often it runs.
 */
import { z } from 'zod'

import { caseInputSchema, toCaseRow } from '../../src/lib/caseInput.ts'
import { insertCaseStatements, slugToId } from './caseSql.ts'

/** Shape of history.local.json. One entry = caseInputSchema + slug (idempotency key) */
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
