import { env } from 'cloudflare:test'
import { drizzle } from 'drizzle-orm/d1'

import * as schema from '../../db/schema'

export const db = drizzle(env.DB, { schema })

/** 全テーブルを空にする。db/schema.ts の全テーブルを網羅すること */
export async function reset() {
  for (const t of ['ledger', 'events', 'case_log', 'cases', 'companies', 'settings']) {
    await env.DB.exec(`DELETE FROM ${t}`)
  }
}

/** テスト用の最小の案件行（架空値） */
export function fakeCase(overrides: Partial<schema.NewCase> = {}): schema.NewCase {
  return {
    id: crypto.randomUUID(),
    company: '甲社',
    title: 'テスト案件',
    route: 'findy',
    monthlyMaxIncl: 1_100_000,
    sourceTaxBasis: 'excl',
    remoteType: 'full',
    startDate: '2030-01',
    rawText: '原文',
    ...overrides,
  }
}
