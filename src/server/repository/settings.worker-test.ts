import { beforeEach, describe, expect, it } from 'vitest'

import { readAxes, readThresholds, writeSetting } from './settings'
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
})
