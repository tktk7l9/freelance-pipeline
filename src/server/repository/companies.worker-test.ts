import { beforeEach, describe, expect, it } from 'vitest'

import { listCompanySites, setCompanySite } from './companies'
import { db, reset } from './test-helpers'

beforeEach(reset)

describe('companies repository', () => {
  it('置く・上書き・空で消す', async () => {
    await setCompanySite(db, '甲社', 'https://example.com')
    await setCompanySite(db, '乙社', 'https://example.org')
    expect(await listCompanySites(db)).toEqual({
      甲社: 'https://example.com',
      乙社: 'https://example.org',
    })
    await setCompanySite(db, '甲社', 'https://example.com/new')
    expect((await listCompanySites(db))['甲社']).toBe('https://example.com/new')
    await setCompanySite(db, '乙社', null)
    expect(await listCompanySites(db)).toEqual({ 甲社: 'https://example.com/new' })
  })
})
