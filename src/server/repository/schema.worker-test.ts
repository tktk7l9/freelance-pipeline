import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'

import { caseLog, cases } from '../../db/schema'
import { db, fakeCase, reset } from './test-helpers'

beforeEach(reset)

describe('schema', () => {
  it('cases と case_log を書けて、削除で CASCADE する', async () => {
    const row = fakeCase()
    await db.insert(cases).values(row)
    await db.insert(caseLog).values({
      id: crypto.randomUUID(),
      caseId: row.id,
      at: '2030-01-01T00:00:00+09:00',
      kind: 'import',
      body: 'テスト',
    })
    const [saved] = await db.select().from(cases).where(eq(cases.id, row.id))
    expect(saved.mustSkills).toEqual([])
    expect(saved.status).toBe('saved')
    expect(saved.createdAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    await db.delete(cases).where(eq(cases.id, row.id))
    expect(await db.select().from(caseLog)).toHaveLength(0)
  })

  it('source_url は重複を拒むが NULL は複数入る', async () => {
    await db.insert(cases).values(fakeCase({ sourceUrl: null }))
    await db.insert(cases).values(fakeCase({ sourceUrl: null }))
    await db.insert(cases).values(fakeCase({ sourceUrl: 'https://example.com/a' }))
    await expect(
      db.insert(cases).values(fakeCase({ sourceUrl: 'https://example.com/a' })),
    ).rejects.toThrow()
  })
})
