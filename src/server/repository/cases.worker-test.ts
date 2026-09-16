import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'

import { caseLog, cases } from '../../db/schema'
import type { CaseRowValues } from '../../lib/caseInput'
import {
  addMemo,
  changeStatus,
  deleteCase,
  deleteLogEntry,
  findDuplicate,
  getCase,
  insertCase,
  listCases,
  listLog,
  recentLog,
  setNextAction,
  updateCase,
} from './cases'
import { db, fakeCase, reset } from './test-helpers'

beforeEach(reset)

const values: CaseRowValues = {
  company: '甲社',
  title: 'テスト案件',
  route: 'findy',
  agentName: null,
  monthlyMaxIncl: 1_232_000,
  monthlyMinIncl: null,
  sourceTaxBasis: 'excl',
  settlementMinH: 140,
  settlementMaxH: 180,
  remoteType: 'full',
  onsiteNote: null,
  startDate: '2030-01',
  endDate: null,
  daysPerWeek: null,
  workLocation: null,
  supplyChain: null,
  paymentSiteDays: null,
  sourceUrl: 'https://example.com/jobs/1',
  mustSkills: ['TypeScript'],
  niceSkills: [],
  rawText: '原文',
  status: 'saved',
  nextAction: null,
  nextActionDue: null,
  fitScores: null,
  actualMonthlyIncl: null,
  note: null,
}
const AT = '2030-01-01T00:00:00+09:00'

describe('cases repository', () => {
  it('insert は case_log に import 行を作る。一覧は税込降順', async () => {
    const id = await insertCase(db, values, { importNote: 'add-case', at: AT })
    await insertCase(
      db,
      { ...values, company: '乙社', sourceUrl: null, monthlyMaxIncl: 2_000_000 },
      { importNote: 'add-case', at: AT },
    )
    const log = await listLog(db, id)
    expect(log).toHaveLength(1)
    expect(log[0].kind).toBe('import')
    const rows = await listCases(db)
    expect(rows.map((r) => r.company)).toEqual(['乙社', '甲社'])
    expect(rows[1].mustSkills).toEqual(['TypeScript'])
  })

  it('ステータス変更はルールを守り、ログを自動で残す', async () => {
    const id = await insertCase(db, values, { importNote: 't', at: AT })
    expect(await changeStatus(db, id, 'meeting', AT)).toBe('ok')
    expect(await changeStatus(db, id, 'applied', AT)).toBe('invalid_transition')
    expect(await changeStatus(db, 'missing', 'applied', AT)).toBe('not_found')
    const c = await getCase(db, id)
    expect(c?.status).toBe('meeting')
    const log = await listLog(db, id)
    const status = log.find((l) => l.kind === 'status')
    expect(status?.fromStatus).toBe('saved')
    expect(status?.toStatus).toBe('meeting')
  })

  it('updatedAt は datetime(now) の書式のまま', async () => {
    const id = await insertCase(db, values, { importNote: 't', at: AT })
    await updateCase(db, id, { note: 'メモ' })
    await setNextAction(db, id, { nextAction: '返信', nextActionDue: '2030-01-05' })
    const c = await getCase(db, id)
    expect(c?.note).toBe('メモ')
    expect(c?.nextActionDue).toBe('2030-01-05')
    expect(c?.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  })

  it('メモの追加・削除。status 行は消せない', async () => {
    const id = await insertCase(db, values, { importNote: 't', at: AT })
    const memoId = await addMemo(db, id, '面談日程を待つ', AT)
    await changeStatus(db, id, 'applied', AT)
    const statusRow = (await listLog(db, id)).find((l) => l.kind === 'status')!
    await deleteLogEntry(db, statusRow.id)
    await deleteLogEntry(db, memoId)
    const kinds = (await listLog(db, id)).map((l) => l.kind).sort()
    expect(kinds).toEqual(['import', 'status'])
  })

  it('重複照会は sourceUrl か company+title', async () => {
    await insertCase(db, values, { importNote: 't', at: AT })
    expect(
      await findDuplicate(db, {
        sourceUrl: 'https://example.com/jobs/1',
        company: 'x',
        title: 'y',
      }),
    ).not.toBeNull()
    expect(
      await findDuplicate(db, { sourceUrl: null, company: '甲社', title: 'テスト案件' }),
    ).not.toBeNull()
    expect(await findDuplicate(db, { sourceUrl: null, company: '甲社', title: '別' })).toBeNull()
  })

  it('削除で case_log も消える。recentLog は企業名つき', async () => {
    const id = await insertCase(db, values, { importNote: 't', at: AT })
    const recent = await recentLog(db, 10)
    expect(recent[0].company).toBe('甲社')
    await deleteCase(db, id)
    expect(await db.select().from(cases).where(eq(cases.id, id))).toHaveLength(0)
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
