import { and, asc, desc, eq, or, sql } from 'drizzle-orm'

import type { Db } from '../../db/client'
import { caseLog, cases, type Case, type CaseLogRow } from '../../db/schema'
import type { CaseRowValues } from '../../lib/caseInput'
import { canTransition, type CaseStatus } from '../../lib/status'

export async function listCases(db: Db): Promise<Case[]> {
  return db.select().from(cases).orderBy(desc(cases.monthlyMaxIncl), asc(cases.company))
}

export async function getCase(db: Db, id: string): Promise<Case | null> {
  const [row] = await db.select().from(cases).where(eq(cases.id, id)).limit(1)
  return row ?? null
}

export async function listLog(db: Db, caseId: string): Promise<CaseLogRow[]> {
  return db.select().from(caseLog).where(eq(caseLog.caseId, caseId)).orderBy(desc(caseLog.at))
}

export async function insertCase(
  db: Db,
  values: CaseRowValues,
  opts: { id?: string; importNote: string; at: string },
): Promise<string> {
  const id = opts.id ?? crypto.randomUUID()
  await db.insert(cases).values({ ...values, id })
  await db.insert(caseLog).values({
    id: crypto.randomUUID(),
    caseId: id,
    at: opts.at,
    kind: 'import',
    body: opts.importNote,
  })
  return id
}

export async function updateCase(
  db: Db,
  id: string,
  values: Partial<CaseRowValues>,
): Promise<void> {
  await db
    .update(cases)
    .set({ ...values, updatedAt: sql`(datetime('now'))` })
    .where(eq(cases.id, id))
}

export async function changeStatus(
  db: Db,
  id: string,
  to: CaseStatus,
  at: string,
): Promise<'ok' | 'not_found' | 'invalid_transition'> {
  const current = await getCase(db, id)
  if (!current) return 'not_found'
  if (!canTransition(current.status, to)) return 'invalid_transition'
  await db
    .update(cases)
    .set({ status: to, updatedAt: sql`(datetime('now'))` })
    .where(eq(cases.id, id))
  await db.insert(caseLog).values({
    id: crypto.randomUUID(),
    caseId: id,
    at,
    kind: 'status',
    fromStatus: current.status,
    toStatus: to,
  })
  return 'ok'
}

export async function setNextAction(
  db: Db,
  id: string,
  v: { nextAction: string | null; nextActionDue: string | null },
): Promise<void> {
  await updateCase(db, id, v)
}

export async function addMemo(db: Db, caseId: string, body: string, at: string): Promise<string> {
  const id = crypto.randomUUID()
  await db.insert(caseLog).values({ id, caseId, at, kind: 'memo', body })
  return id
}

/** 自動記録（status / import）は経緯なので消さない。メモだけ消せる */
export async function deleteLogEntry(db: Db, id: string): Promise<void> {
  await db.delete(caseLog).where(and(eq(caseLog.id, id), eq(caseLog.kind, 'memo')))
}

export async function deleteCase(db: Db, id: string): Promise<void> {
  await db.delete(cases).where(eq(cases.id, id))
}

export async function findDuplicate(
  db: Db,
  q: { sourceUrl: string | null; company: string; title: string },
): Promise<Case | null> {
  const byPair = and(eq(cases.company, q.company), eq(cases.title, q.title))
  const where = q.sourceUrl ? or(eq(cases.sourceUrl, q.sourceUrl), byPair) : byPair
  const [row] = await db.select().from(cases).where(where).limit(1)
  return row ?? null
}

export async function recentLog(
  db: Db,
  limit: number,
): Promise<(CaseLogRow & { company: string; title: string })[]> {
  const rows = await db
    .select({
      id: caseLog.id,
      caseId: caseLog.caseId,
      at: caseLog.at,
      kind: caseLog.kind,
      fromStatus: caseLog.fromStatus,
      toStatus: caseLog.toStatus,
      body: caseLog.body,
      createdAt: caseLog.createdAt,
      company: cases.company,
      title: cases.title,
    })
    .from(caseLog)
    .innerJoin(cases, eq(caseLog.caseId, cases.id))
    .orderBy(desc(caseLog.at))
    .limit(limit)
  return rows
}
