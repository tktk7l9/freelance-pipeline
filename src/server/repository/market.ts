import { desc, sql } from 'drizzle-orm'

import type { Db } from '../../db/client'
import { marketSnapshots, type MarketSnapshotRow } from '../../db/schema'

/** All snapshots (newest capture date first) */
export async function listMarketSnapshots(db: Db): Promise<MarketSnapshotRow[]> {
  return db.select().from(marketSnapshots).orderBy(desc(marketSnapshots.takenOn))
}

/** The latest one per skill */
export function latestPerSkill(rows: readonly MarketSnapshotRow[]): MarketSnapshotRow[] {
  const seen = new Map<string, MarketSnapshotRow>()
  for (const r of rows) {
    const cur = seen.get(r.skill)
    if (!cur || r.takenOn > cur.takenOn) seen.set(r.skill, r)
  }
  return [...seen.values()].sort((a, b) => a.skill.localeCompare(b.skill, 'ja'))
}

/** Overwrites when the capture date and skill match (for fixing transcriptions) */
export async function upsertMarketSnapshot(
  db: Db,
  input: { takenOn: string; skill: string; source?: string; data: string },
): Promise<void> {
  await db
    .insert(marketSnapshots)
    .values({
      id: crypto.randomUUID(),
      takenOn: input.takenOn,
      skill: input.skill,
      source: input.source ?? 'levtech',
      data: input.data,
    })
    .onConflictDoUpdate({
      target: [marketSnapshots.takenOn, marketSnapshots.skill],
      set: {
        data: input.data,
        source: input.source ?? 'levtech',
        updatedAt: sql`(datetime('now'))`,
      },
    })
}
