import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildHistoryStatements, historyFileSchema } from './history.ts'

const file = historyFileSchema.parse({
  cases: [
    {
      slug: 'ko-sha-2020',
      company: '甲社',
      title: '過去案件A',
      route: 'other',
      monthlyMax: 700000,
      taxBasis: 'incl',
      remoteType: 'onsite',
      startDate: '2020-04',
      endDate: '2021-03',
      rawText: '担当: ...',
      status: 'ended',
      mustSkills: ['Java'],
    },
  ],
})

describe('history', () => {
  it('slug から決定的 id で INSERT OR REPLACE を作る（冪等）', () => {
    const a = buildHistoryStatements(file, '2030-01-01T00:00:00Z')
    const b = buildHistoryStatements(file, '2030-01-01T00:00:00Z')
    assert.deepEqual(a, b)
    assert.equal(a.length, 2)
    assert.match(a[0], /^INSERT OR REPLACE INTO cases/)
    assert.match(a[0], /'ended'/)
    assert.match(a[1], /'import'/)
  })
})
