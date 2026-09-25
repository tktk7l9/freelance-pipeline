import { asc, eq, sql } from 'drizzle-orm'

import type { Db } from '../../db/client'
import { events, type EventRow } from '../../db/schema'
import type { EventValues } from '../events.schema'

/** 新規なら id を採番して挿入、id 付きなら上書き。返り値は id */
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

/** 日付キー（先頭 10 文字）が from〜to に入る予定を開始順で */
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
