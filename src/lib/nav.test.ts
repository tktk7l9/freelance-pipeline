import { describe, expect, it } from 'vitest'

import { NAV_ITEMS, isNavItemActive } from './nav'

describe('isNavItemActive', () => {
  it("'/' はトップだけで有効になる", () => {
    expect(isNavItemActive('/', '/')).toBe(true)
    expect(isNavItemActive('/cases', '/')).toBe(false)
  })

  it('完全一致で有効になる', () => {
    expect(isNavItemActive('/cases', '/cases')).toBe(true)
  })

  it('配下のパスでも有効になる', () => {
    expect(isNavItemActive('/cases/1', '/cases')).toBe(true)
  })

  it('接頭辞が同じだけの別ルートは有効にしない', () => {
    expect(isNavItemActive('/cases-archive', '/cases')).toBe(false)
  })
})

describe('NAV_ITEMS', () => {
  it('タブは 5 つ', () => {
    expect(NAV_ITEMS.map((i) => i.to)).toEqual([
      '/',
      '/cases',
      '/compare',
      '/calendar',
      '/settings',
    ])
  })

  it('案件の詳細ページでも「案件」タブが選択される', () => {
    expect(isNavItemActive('/cases/abc', '/cases')).toBe(true)
    expect(isNavItemActive('/compare/abc', '/settings')).toBe(false)
  })
})
