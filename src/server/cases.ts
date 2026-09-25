import { createServerFn } from '@tanstack/react-start'

import { getDb } from '../db/client'
import type { Case } from '../db/schema'
import { parseCaseJson, toCaseRow } from '../lib/caseInput'
import { memoAt } from '../lib/caseLog'
import { formatJst } from '../lib/jst'
import { baseHours, hourlyExcl, toExcl } from '../lib/rate'
import { statusGroup, type StatusGroup } from '../lib/status'
import {
  addMemo,
  changeStatus,
  deleteCase,
  deleteLogEntry,
  findDuplicate,
  getCase,
  insertCase,
  listCases,
  listCompanySites,
  listLog,
  setCompanySite,
  setNextAction,
  updateCase,
} from './repository'
import {
  caseSaveInput,
  importInput,
  memoInput,
  nextActionInput,
  statusChangeInput,
} from './cases.schema'
import { idInput } from './zod'

export type CaseListItem = Case & {
  monthlyExcl: number
  hourly: number
  hours: number
  group: StatusGroup
}

function todayJst(): string {
  return formatJst(new Date().toISOString(), { withTime: false })
}

export function decorate(c: Case): CaseListItem {
  const { hours } = baseHours(c)
  return {
    ...c,
    monthlyExcl: toExcl(c.monthlyMaxIncl),
    hourly: hourlyExcl(c.monthlyMaxIncl, hours),
    hours,
    group: statusGroup(c.status),
  }
}

export const listCasesFn = createServerFn().handler(async () => {
  const db = getDb()
  const [rows, sites] = await Promise.all([listCases(db), listCompanySites(db)])
  return { cases: rows.map(decorate), sites, today: todayJst() }
})

export const getCaseDetail = createServerFn()
  .validator(idInput)
  .handler(async ({ data }) => {
    const db = getDb()
    const c = await getCase(db, data.id)
    if (!c) throw new Response('Not Found', { status: 404 })
    const [log, sites] = await Promise.all([listLog(db, data.id), listCompanySites(db)])
    return { item: decorate(c), log, companyUrl: sites[c.company] ?? null, today: todayJst() }
  })

export const saveCase = createServerFn({ method: 'POST' })
  .validator(caseSaveInput)
  .handler(async ({ data }) => {
    const db = getDb()
    const row = toCaseRow(data.values)
    // 会社の公式サイトはフォームの値で置く（空なら消す）。案件の列ではなく companies 表
    await setCompanySite(db, row.company, data.values.companyUrl)
    if (data.id) {
      const existing = await getCase(db, data.id)
      if (!existing) throw new Response('Not Found', { status: 404 })
      // 税基準は取込時の記録。編集フォームは税込で入れるので上書きしない。
      // ステータスは StatusChanger だけが変える（ログを残すため）
      await updateCase(db, data.id, {
        ...row,
        status: existing.status,
        sourceTaxBasis: existing.sourceTaxBasis,
      })
      return { id: data.id }
    }
    const id = await insertCase(db, row, { importNote: 'フォーム', at: new Date().toISOString() })
    return { id }
  })

export const changeCaseStatus = createServerFn({ method: 'POST' })
  .validator(statusChangeInput)
  .handler(async ({ data }) => {
    const result = await changeStatus(getDb(), data.id, data.to, new Date().toISOString())
    return result === 'ok' ? { ok: true as const } : { ok: false as const, reason: result }
  })

export const saveNextAction = createServerFn({ method: 'POST' })
  .validator(nextActionInput)
  .handler(async ({ data }) => {
    await setNextAction(getDb(), data.id, {
      nextAction: data.nextAction,
      nextActionDue: data.nextActionDue,
    })
    return { ok: true as const }
  })

export const addCaseMemo = createServerFn({ method: 'POST' })
  .validator(memoInput)
  .handler(async ({ data }) => ({
    id: await addMemo(getDb(), data.id, data.body, memoAt(data.date)),
  }))

export const deleteCaseMemo = createServerFn({ method: 'POST' })
  .validator(idInput)
  .handler(async ({ data }) => {
    await deleteLogEntry(getDb(), data.id)
    return { ok: true as const }
  })

export const deleteCaseFn = createServerFn({ method: 'POST' })
  .validator(idInput)
  .handler(async ({ data }) => {
    await deleteCase(getDb(), data.id)
    return { ok: true as const }
  })

export const importCase = createServerFn({ method: 'POST' })
  .validator(importInput)
  .handler(async ({ data }) => {
    const parsed = parseCaseJson(data.json)
    if (!parsed.ok) return { ok: false as const, issues: parsed.issues }
    const db = getDb()
    const row = toCaseRow(parsed.input)
    const dup = await findDuplicate(db, {
      sourceUrl: row.sourceUrl,
      company: row.company,
      title: row.title,
    })
    if (dup)
      return {
        ok: false as const,
        duplicate: { id: dup.id, company: dup.company, title: dup.title },
      }
    // JSON に companyUrl があるときだけ置く（無いときに既存のリンクを消さない）
    if (parsed.input.companyUrl) await setCompanySite(db, row.company, parsed.input.companyUrl)
    const id = await insertCase(db, row, {
      importNote: '取込フォーム',
      at: new Date().toISOString(),
    })
    return { ok: true as const, id }
  })
