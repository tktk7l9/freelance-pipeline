import { beforeEach, describe, expect, it } from 'vitest'

import { latestPerSkill, listMarketSnapshots, upsertMarketSnapshot } from './market'
import { db, reset } from './test-helpers'

beforeEach(reset)

describe('market repository', () => {
  it('同じ日・同じスキルは上書き、別の日は別行。スキルごとに最新を選ぶ', async () => {
    await upsertMarketSnapshot(db, { takenOn: '2030-01-01', skill: 'A', data: '{"v":1}' })
    await upsertMarketSnapshot(db, { takenOn: '2030-01-01', skill: 'A', data: '{"v":2}' })
    await upsertMarketSnapshot(db, { takenOn: '2030-02-01', skill: 'A', data: '{"v":3}' })
    await upsertMarketSnapshot(db, { takenOn: '2030-01-01', skill: 'B', data: '{"v":9}' })
    const rows = await listMarketSnapshots(db)
    expect(rows).toHaveLength(3)
    const latest = latestPerSkill(rows)
    expect(latest.map((r) => [r.skill, r.takenOn, r.data])).toEqual([
      ['A', '2030-02-01', '{"v":3}'],
      ['B', '2030-01-01', '{"v":9}'],
    ])
  })
})
