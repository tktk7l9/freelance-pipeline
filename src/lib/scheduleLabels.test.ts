import { describe, expect, it } from 'vitest'

import { SCHEDULE_LABELS_JA } from './scheduleLabels'

describe('SCHEDULE_LABELS_JA', () => {
  it('builds the label for the hidden count', () => {
    expect(SCHEDULE_LABELS_JA.moreLabel?.(3)).toBe('他 3 件')
  })
})
