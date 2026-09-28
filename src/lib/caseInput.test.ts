import { describe, expect, it } from 'vitest'

import {
  CASE_JSON_EXAMPLE,
  caseInputSchema,
  describeCaseIssue,
  parseCaseJson,
  toCaseRow,
} from './caseInput'

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

  it('検証エラーは日本語の項目名と直し方で返す（zod の英語を出さない, SHIG 55, 11）', () => {
    const messages = (o: Record<string, unknown>) => {
      const r = parseCaseJson(JSON.stringify(o))
      return r.ok ? [] : r.issues.map((i) => `${i.label}|${i.message}`)
    }
    const { title: _t, ...noTitle } = minimal
    expect(messages(noTitle)).toContain('案件名|案件名がありません')
    expect(messages({ ...minimal, company: '' })).toContain('企業名|企業名が空です')
    expect(messages({ ...minimal, route: 'agent' })).toContain(
      '経路|経路は levtech（レバテック）／findy（Findy）／direct（直接）／other（その他） のどれか',
    )
    expect(messages({ ...minimal, monthlyMax: 'x' })).toContain(
      '単価上限|単価上限の形が違います（数値で入れる）',
    )
    expect(messages({ ...minimal, monthlyMax: 0 })).toContain('単価上限|単価上限は 1 以上')
    expect(messages({ ...minimal, settlementMaxH: 999 })).toContain(
      '精算 上限|精算 上限は 400 以下',
    )
    expect(messages({ ...minimal, title: 'x'.repeat(301) })).toContain(
      '案件名|案件名が長すぎます（300 文字まで）',
    )
    expect(messages({ ...minimal, startDate: '2030/01' })).toContain(
      '開始|開始は 2030-11 か 2030-11-16 の形で',
    )
    expect(messages({ ...minimal, nextActionDue: '明日' })).toContain(
      '期日|期日は 2030-11-16 の形で',
    )
    expect(messages({ ...minimal, mustSkills: 'TS' })).toContain(
      '必須スキル|必須スキルの形が違います（配列で入れる）',
    )
    expect(messages({ ...minimal, mustSkills: [''] })).toContain('必須スキル|必須スキルが空です')
    expect(messages({ ...minimal, taxBasis: 'x' })).toContain(
      '税込/税抜|税込/税抜は incl（税込表示）／excl（税抜表示） のどれか',
    )
    // refine() messages are already Japanese and pass through as is
    expect(messages({ ...minimal, monthlyMin: 2_000_000 })).toContain(
      '単価下限|単価の下限が上限を超えています',
    )
    // Unknown keys fall back to the raw key and a generic sentence
    expect(messages({ ...minimal, fitScores: [5] })).toContain('軸の点数|軸の点数は 2 以下')
  })

  it('知らない項目・想定外のコードでも文にする', () => {
    expect(describeCaseIssue({ code: 'custom', path: ['zzz'], message: 'bad' })).toEqual({
      path: 'zzz',
      label: 'zzz',
      message: 'zzz: 内容を確認してください',
    })
    expect(
      describeCaseIssue({
        code: 'invalid_value',
        path: ['status'],
        message: '',
        values: ['saved'],
      }),
    ).toEqual({ path: 'status', label: '状態', message: '状態は saved（保存） のどれか' })
    expect(
      describeCaseIssue({ code: 'invalid_value', path: ['remoteType'], message: '', values: [1] }),
    ).toEqual({ path: 'remoteType', label: 'リモート', message: 'リモートは 1 のどれか' })
    expect(describeCaseIssue({ code: 'too_small', path: [], message: '' }).label).toBe('JSON')
    expect(
      describeCaseIssue({ code: 'invalid_format', path: ['sourceUrl'], message: '' }).message,
    ).toBe('案件 URLの形が違います')
    expect(
      parseCaseJson(
        JSON.stringify({ ...minimal, mustSkills: Array.from({ length: 51 }, (_, i) => `s${i}`) }),
      ),
    ).toMatchObject({ ok: false, issues: [{ message: '必須スキルが多すぎます（50 個まで）' }] })
    expect(
      describeCaseIssue({ code: 'invalid_type', path: ['note'], message: '', expected: 'object' }),
    ).toEqual({ path: 'note', label: '判断メモ', message: '判断メモの形が違います' })
  })

  it('例の JSON はそのまま通る', () => {
    expect(parseCaseJson(CASE_JSON_EXAMPLE).ok).toBe(true)
  })
})
