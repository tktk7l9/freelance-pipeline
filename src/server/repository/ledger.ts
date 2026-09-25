import { asc, desc, eq, sql } from 'drizzle-orm'

import type { Db } from '../../db/client'
import { ledger, type LedgerRow } from '../../db/schema'
import type { LedgerValues } from '../ledger.schema'

/** 全件。年月の新しい順、同月は作成順。件数は年 × 数十行なので絞らない */
export async function listLedger(db: Db): Promise<LedgerRow[]> {
  return db.select().from(ledger).orderBy(desc(ledger.yearMonth), asc(ledger.createdAt))
}

export async function getLedgerEntry(db: Db, id: string): Promise<LedgerRow | null> {
  const [row] = await db.select().from(ledger).where(eq(ledger.id, id)).limit(1)
  return row ?? null
}

export async function upsertLedgerEntry(db: Db, input: LedgerValues): Promise<string> {
  const { id, ...values } = input
  if (!id) {
    const newId = crypto.randomUUID()
    await db.insert(ledger).values({ ...values, id: newId })
    return newId
  }
  await db
    .update(ledger)
    .set({ ...values, updatedAt: sql`(datetime('now'))` })
    .where(eq(ledger.id, id))
  return id
}

export async function deleteLedgerEntry(db: Db, id: string): Promise<void> {
  await db.delete(ledger).where(eq(ledger.id, id))
}
