import { describe, expect, it } from 'vitest'

import { SCHEDULE_LABELS_JA } from './scheduleLabels'

describe('SCHEDULE_LABELS_JA', () => {
  it('隠れた件数のラベルを組み立てる', () => {
    expect(SCHEDULE_LABELS_JA.moreLabel?.(3)).toBe('他 3 件')
  })
})
