import { asc, desc, eq, sql } from 'drizzle-orm'

import type { Db } from '../../db/client'
import { contracts, type ContractRow } from '../../db/schema'
import type { ContractValues } from '../contracts.schema'

/** Every contract. Grouped per case by the caller (lib/contract groupByCase); newest start first within a case */
export async function listContracts(db: Db): Promise<ContractRow[]> {
  return db.select().from(contracts).orderBy(asc(contracts.caseId), desc(contracts.startDate))
}

/** Contracts of one case, newest start first */
export async function listContractsByCase(db: Db, caseId: string): Promise<ContractRow[]> {
  return db
    .select()
    .from(contracts)
    .where(eq(contracts.caseId, caseId))
    .orderBy(desc(contracts.startDate), desc(contracts.createdAt))
}

export async function getContract(db: Db, id: string): Promise<ContractRow | null> {
  const [row] = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1)
  return row ?? null
}

/** Inserts with a new id if new; overwrites if an id is given. Returns the id */
export async function upsertContract(db: Db, input: ContractValues): Promise<string> {
  const { id, ...values } = input
  if (!id) {
    const newId = crypto.randomUUID()
    await db.insert(contracts).values({ ...values, id: newId })
    return newId
  }
  await db
    .update(contracts)
    .set({ ...values, updatedAt: sql`(datetime('now'))` })
    .where(eq(contracts.id, id))
  return id
}

export async function deleteContract(db: Db, id: string): Promise<void> {
  await db.delete(contracts).where(eq(contracts.id, id))
}
