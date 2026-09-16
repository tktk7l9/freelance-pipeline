import { beforeEach, describe, expect, it } from 'vitest'

import { readAxes, readBusiness, readThresholds, writeSetting } from './settings'
import { db, reset } from './test-helpers'

beforeEach(reset)

describe('settings', () => {
  it('thresholds / axes を JSON で往復し、壊れた値は既定にする', async () => {
    expect((await readThresholds(db)).minMonthlyIncl).toBeNull()
    await writeSetting(db, 'thresholds', JSON.stringify({ minMonthlyIncl: 1 }))
    expect((await readThresholds(db)).minMonthlyIncl).toBe(1)
    await writeSetting(db, 'thresholds', '{bad')
    expect((await readThresholds(db)).minMonthlyIncl).toBeNull()
    await writeSetting(db, 'axes', JSON.stringify(['軸1']))
    expect(await readAxes(db)).toEqual(['軸1'])
  })

  it('business を JSON で往復し、未設定は全項目 null', async () => {
    expect((await readBusiness(db)).occupation).toBeNull()
    await writeSetting(
      db,
      'business',
      JSON.stringify({ occupation: 'ソフトウェア開発', filingType: 'blue' }),
    )
    const business = await readBusiness(db)
    expect(business.occupation).toBe('ソフトウェア開発')
    expect(business.filingType).toBe('blue')
    expect(business.taxOffice).toBeNull()
  })
})
