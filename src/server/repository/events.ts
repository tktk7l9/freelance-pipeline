import { asc, eq, sql } from 'drizzle-orm'

import type { Db } from '../../db/client'
import { events, type EventRow } from '../../db/schema'
import type { EventValues } from '../events.schema'

/** Inserts with a new id if new; overwrites if an id is given. Returns the id */
export async function upsertEvent(db: Db, input: EventValues): Promise<string> {
  const { id, ...values } = input
  if (!id) {
    const newId = crypto.randomUUID()
    await db.insert(events).values({ ...values, id: newId })
    return newId
  }
  await db
    .update(events)
    .set({ ...values, updatedAt: sql`(datetime('now'))` })
    .where(eq(events.id, id))
  return id
}

export async function getEvent(db: Db, id: string): Promise<EventRow | null> {
  const [row] = await db.select().from(events).where(eq(events.id, id)).limit(1)
  return row ?? null
}

export async function deleteEvent(db: Db, id: string): Promise<void> {
  await db.delete(events).where(eq(events.id, id))
}

/** Events whose date key (first 10 chars) falls within from–to, in start order */
export async function listEventsBetween(
  db: Db,
  fromKey: string,
  toKey: string,
): Promise<EventRow[]> {
  return db
    .select()
    .from(events)
    .where(sql`substr(${events.startsAt}, 1, 10) between ${fromKey} and ${toKey}`)
    .orderBy(asc(events.startsAt))
}
