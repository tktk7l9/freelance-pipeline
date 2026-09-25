/**
 * ナビゲーションの選択状態。'/' だけは前方一致だと常に一致してしまうため完全一致にする。
 */
export function isNavItemActive(pathname: string, to: string): boolean {
  if (to === '/') return pathname === '/'
  return pathname === to || pathname.startsWith(`${to}/`)
}

/**
 * 下タブ（スマホ）と左ナビ（デスクトップ）で共有するタブ定義。
 */
export const NAV_ITEMS = [
  { to: '/', label: 'ホーム', icon: 'home' },
  { to: '/cases', label: '案件', icon: 'briefcase' },
  { to: '/compare', label: '比較', icon: 'columns' },
  { to: '/calendar', label: '予定', icon: 'calendar' },
  { to: '/income', label: '収入', icon: 'yen' },
  { to: '/settings', label: '設定', icon: 'settings' },
] as const
export type NavIcon = (typeof NAV_ITEMS)[number]['icon']
