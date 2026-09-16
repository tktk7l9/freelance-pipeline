import { eq, sql } from 'drizzle-orm'

import type { Db } from '../../db/client'
import { settings } from '../../db/schema'
import { parseAxes, parseThresholds, type Thresholds } from '../../lib/compare'

export async function readSetting(db: Db, key: string): Promise<string | null> {
  const [row] = await db.select().from(settings).where(eq(settings.key, key)).limit(1)
  return row?.value ?? null
}

export async function writeSetting(db: Db, key: string, value: string): Promise<void> {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: sql`(datetime('now'))` } })
}

export async function readThresholds(db: Db): Promise<Thresholds> {
  return parseThresholds(await readSetting(db, 'thresholds'))
}

export async function readAxes(db: Db): Promise<string[]> {
  return parseAxes(await readSetting(db, 'axes'))
}
