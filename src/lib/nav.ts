/**
 * Navigation selection state. '/' alone would always match as a prefix, so it uses an exact match.
 */
export function isNavItemActive(pathname: string, to: string): boolean {
  if (to === '/') return pathname === '/'
  return pathname === to || pathname.startsWith(`${to}/`)
}

/**
 * Tab definitions shared by the bottom tabs (phone) and the left nav (desktop).
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
