import { eq, sql } from 'drizzle-orm'

import type { Db } from '../../db/client'
import { companies } from '../../db/schema'

/** 会社名 → 公式サイト URL。表示側で会社名にリンクを付けるための辞書 */
export type CompanySites = Record<string, string>

export async function listCompanySites(db: Db): Promise<CompanySites> {
  const rows = await db.select().from(companies)
  return Object.fromEntries(rows.map((r) => [r.name, r.url]))
}

/** URL を置く。空なら行ごと消す（「リンク無し」に戻す） */
export async function setCompanySite(db: Db, name: string, url: string | null): Promise<void> {
  if (!url) {
    await db.delete(companies).where(eq(companies.name, name))
    return
  }
  await db
    .insert(companies)
    .values({ name, url })
    .onConflictDoUpdate({
      target: companies.name,
      set: { url, updatedAt: sql`(datetime('now'))` },
    })
}
