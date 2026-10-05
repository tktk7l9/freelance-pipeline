import { describe, expect, it } from 'vitest'

import { NAV_ITEMS, isNavItemActive } from './nav'

describe('isNavItemActive', () => {
  it("'/' is active only on the top page", () => {
    expect(isNavItemActive('/', '/')).toBe(true)
    expect(isNavItemActive('/cases', '/')).toBe(false)
  })

  it('active on an exact match', () => {
    expect(isNavItemActive('/cases', '/cases')).toBe(true)
  })

  it('active on a path below it too', () => {
    expect(isNavItemActive('/cases/1', '/cases')).toBe(true)
  })

  it('not active for another route that only shares the prefix', () => {
    expect(isNavItemActive('/cases-archive', '/cases')).toBe(false)
  })
})

describe('NAV_ITEMS', () => {
  it('there are 6 tabs', () => {
    expect(NAV_ITEMS.map((i) => i.to)).toEqual([
      '/',
      '/cases',
      '/compare',
      '/calendar',
      '/income',
      '/settings',
    ])
  })

  it('selects the 「案件」 (Cases) tab on a case detail page too', () => {
    expect(isNavItemActive('/cases/abc', '/cases')).toBe(true)
    expect(isNavItemActive('/compare/abc', '/settings')).toBe(false)
  })
})
