import { describe, expect, it } from 'vitest'

import { CASE_JSON_EXAMPLE, caseInputSchema, parseCaseJson, toCaseRow } from './caseInput'

const minimal = {
  company: '甲社',
  title: 'テスト案件',
  route: 'findy',
  monthlyMax: 1_120_000,
  taxBasis: 'excl',
  remoteType: 'full',
  startDate: '2030-01',
  rawText: '原文',
}

describe('caseInputSchema', () => {
  it('最小の JSON を受け、省略項目は null / [] / saved になる', () => {
    const input = caseInputSchema.parse(minimal)
    expect(input.monthlyMin).toBeNull()
    expect(input.mustSkills).toEqual([])
    expect(input.status).toBe('saved')
    expect(input.fitScores).toBeNull()
  })

  it('空文字の任意項目は null に寄せる', () => {
    const input = caseInputSchema.parse({ ...minimal, agentName: '  ', note: '' })
    expect(input.agentName).toBeNull()
    expect(input.note).toBeNull()
  })

  it('開始は YYYY-MM-DD か YYYY-MM。期日は YYYY-MM-DD', () => {
    expect(caseInputSchema.safeParse({ ...minimal, startDate: '2030/01' }).success).toBe(false)
    expect(caseInputSchema.safeParse({ ...minimal, startDate: '2030-01-15' }).success).toBe(true)
    expect(caseInputSchema.safeParse({ ...minimal, nextActionDue: '2030-01' }).success).toBe(false)
  })

  it('companyUrl は受けるが案件の行には入らない（companies 表へ）', () => {
    const input = caseInputSchema.parse({ ...minimal, companyUrl: 'https://example.com' })
    expect(input.companyUrl).toBe('https://example.com')
    expect('companyUrl' in toCaseRow(input)).toBe(false)
    expect(caseInputSchema.parse({ ...minimal, companyUrl: '' }).companyUrl).toBeNull()
    expect(caseInputSchema.safeParse({ ...minimal, companyUrl: 'ftp://x' }).success).toBe(false)
  })

  it('URL は http(s) のみ', () => {
    expect(
      caseInputSchema.safeParse({ ...minimal, sourceUrl: 'javascript:alert(1)' }).success,
    ).toBe(false)
    expect(
      caseInputSchema.safeParse({ ...minimal, sourceUrl: 'https://example.com' }).success,
    ).toBe(true)
    expect(caseInputSchema.safeParse({ ...minimal, sourceUrl: '' }).success).toBe(true)
    const parsed = caseInputSchema.parse({ ...minimal, sourceUrl: '' })
    expect(parsed.sourceUrl).toBeNull()
  })

  it('下限 > 上限、精算幅の逆転を拒む', () => {
    expect(caseInputSchema.safeParse({ ...minimal, monthlyMin: 2_000_000 }).success).toBe(false)
    expect(
      caseInputSchema.safeParse({ ...minimal, settlementMinH: 180, settlementMaxH: 140 }).success,
    ).toBe(false)
  })
})

describe('toCaseRow', () => {
  it('税抜表示は税込に直し、基準を残す', () => {
    const row = toCaseRow(caseInputSchema.parse({ ...minimal, monthlyMin: 1_000_000 }))
    expect(row.monthlyMaxIncl).toBe(1_232_000)
    expect(row.monthlyMinIncl).toBe(1_100_000)
    expect(row.sourceTaxBasis).toBe('excl')
  })

  it('税込表示はそのまま', () => {
    const row = toCaseRow(caseInputSchema.parse({ ...minimal, taxBasis: 'incl' }))
    expect(row.monthlyMaxIncl).toBe(1_120_000)
    expect(row.sourceTaxBasis).toBe('incl')
  })
})

describe('parseCaseJson', () => {
  it('壊れた JSON は issues で返す', () => {
    const r = parseCaseJson('{not json')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.issues[0].path).toBe('')
  })

  it('検証エラーは項目名つき', () => {
    const r = parseCaseJson(JSON.stringify({ ...minimal, company: '' }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.issues.map((i) => i.path)).toContain('company')
  })

  it('例の JSON はそのまま通る', () => {
    expect(parseCaseJson(CASE_JSON_EXAMPLE).ok).toBe(true)
  })
})
