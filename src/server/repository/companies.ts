import { eq, sql } from 'drizzle-orm'

import type { Db } from '../../db/client'
import { companies } from '../../db/schema'

/** Company name → official-site URL. Dictionary used by the UI to link company names */
export type CompanySites = Record<string, string>

export async function listCompanySites(db: Db): Promise<CompanySites> {
  const rows = await db.select().from(companies)
  return Object.fromEntries(rows.map((r) => [r.name, r.url]))
}

/** Sets the URL. If empty, deletes the row (back to "no link") */
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
