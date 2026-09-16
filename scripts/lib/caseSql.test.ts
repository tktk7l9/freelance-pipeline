import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  caseColumns,
  duplicateQuery,
  insertCaseStatements,
  slugToId,
  sqlLiteral,
  updateCaseStatement,
  updateLogStatement,
} from './caseSql.ts'
import type { CaseRowValues } from '../../src/lib/caseInput.ts'

const row: CaseRowValues = {
  company: "甲社 O'Reilly",
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
  sourceUrl: null,
  mustSkills: ['TypeScript'],
  niceSkills: [],
  rawText: '原文\n2行目',
  status: 'saved',
  nextAction: null,
  nextActionDue: null,
  fitScores: null,
  actualMonthlyIncl: null,
  note: null,
}

describe('sqlLiteral', () => {
  it('NULL・数値・文字列のエスケープ', () => {
    assert.equal(sqlLiteral(null), 'NULL')
    assert.equal(sqlLiteral(12), '12')
    assert.equal(sqlLiteral("O'Reilly"), "'O''Reilly'")
  })
})

describe('caseColumns', () => {
  it('snake_case の列名になり、配列は JSON 文字列', () => {
    const cols = caseColumns(row)
    assert.equal(cols.monthly_max_incl, 1_232_000)
    assert.equal(cols.source_tax_basis, 'excl')
    assert.equal(cols.must_skills, '["TypeScript"]')
    assert.equal(cols.fit_scores, null)
    assert.ok(!('monthlyMaxIncl' in cols))
  })
})

describe('insertCaseStatements', () => {
  it('cases と case_log の 2 文。OR REPLACE は指定時だけ', () => {
    const [c, l] = insertCaseStatements({
      id: 'id-1',
      row,
      at: '2030-01-01T00:00:00+09:00',
      importNote: 'add-case',
      logId: 'log-1',
    })
    assert.match(c, /^INSERT INTO cases \(/)
    assert.match(c, /'甲社 O''Reilly'/)
    assert.match(l, /^INSERT INTO case_log .* 'import'/)
    const [r] = insertCaseStatements({
      id: 'id-1',
      row,
      at: 'x',
      importNote: 'h',
      logId: 'l',
      orReplace: true,
    })
    assert.match(r, /^INSERT OR REPLACE INTO cases/)
  })
})

describe('updateCaseStatement / duplicateQuery / slugToId', () => {
  it('UPDATE は updated_at を datetime(now) にする', () => {
    const s = updateCaseStatement('id-1', row)
    assert.match(s, /^UPDATE cases SET /)
    assert.match(s, /updated_at = \(datetime\('now'\)\)/)
    assert.match(s, /WHERE id = 'id-1';$/)
  })
  it('UPDATE は案件票の列だけ。進行状態（status 等）は触らない', () => {
    const s = updateCaseStatement('id-1', row)
    assert.doesNotMatch(s, /\bstatus = /)
    assert.doesNotMatch(s, /\bnext_action = /)
    assert.doesNotMatch(s, /\bnext_action_due = /)
    assert.doesNotMatch(s, /\bfit_scores = /)
    assert.doesNotMatch(s, /\bnote = /)
    assert.doesNotMatch(s, /\bactual_monthly_incl = /)
    assert.match(s, /\bcompany = /)
    assert.match(s, /\braw_text = /)
    assert.match(s, /updated_at = \(datetime\('now'\)\)/)
  })
  it('updateLogStatement は case_log に kind=import の行を作る', () => {
    const s = updateLogStatement({
      id: 'log-1',
      caseId: 'id-1',
      at: '2030-01-01T00:00:00Z',
      body: 'add-case --update',
    })
    assert.match(s, /^INSERT INTO case_log \(/)
    assert.match(s, /'log-1'/)
    assert.match(s, /'id-1'/)
    assert.match(s, /'import'/)
    assert.match(s, /'add-case --update'/)
  })
  it('重複照会は sourceUrl があれば OR、無ければ AND だけ', () => {
    assert.match(
      duplicateQuery({ sourceUrl: 'https://e.com', company: 'a', title: 'b' }),
      /source_url = 'https:\/\/e.com' OR/,
    )
    assert.doesNotMatch(duplicateQuery({ sourceUrl: null, company: 'a', title: 'b' }), /source_url/)
  })
  it('slug から決定的な UUID 形', () => {
    assert.equal(slugToId('a'), slugToId('a'))
    assert.match(slugToId('a'), /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })
})
