import { describe, expect, it } from 'vitest'

import { PULL_MAX, PULL_THRESHOLD, pullDistance, pullOpacity, shouldRefresh } from './pullToRefresh'

describe('pullDistance', () => {
  it('0 or less gives 0', () => {
    expect(pullDistance(0)).toBe(0)
    expect(pullDistance(-30)).toBe(0)
  })
  it('grows the further you pull but never exceeds the cap', () => {
    const a = pullDistance(40)
    const b = pullDistance(120)
    const c = pullDistance(2000)
    expect(a).toBeGreaterThan(0)
    expect(b).toBeGreaterThan(a)
    expect(c).toBeGreaterThanOrEqual(b)
    expect(c).toBeLessThanOrEqual(PULL_MAX)
  })
  it('the threshold is reachable with a realistic finger movement', () => {
    expect(shouldRefresh(pullDistance(150))).toBe(true)
    expect(shouldRefresh(pullDistance(40))).toBe(false)
  })
})

describe('shouldRefresh', () => {
  it('refreshes exactly at the threshold', () => {
    expect(shouldRefresh(PULL_THRESHOLD)).toBe(true)
    expect(shouldRefresh(PULL_THRESHOLD - 1)).toBe(false)
  })
})

describe('pullOpacity', () => {
  it('0 gives 0, the threshold gives 1, and beyond it still 1', () => {
    expect(pullOpacity(0)).toBe(0)
    expect(pullOpacity(PULL_THRESHOLD / 2)).toBeCloseTo(0.5)
    expect(pullOpacity(PULL_THRESHOLD)).toBe(1)
    expect(pullOpacity(PULL_MAX)).toBe(1)
  })
})
