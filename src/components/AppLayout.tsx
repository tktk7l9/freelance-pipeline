import { AppShell, Group, NavLink, Stack, Text, UnstyledButton } from '@mantine/core'
import { Link, useLocation } from '@tanstack/react-router'
import { Briefcase, CalendarDays, Columns3, House, JapaneseYen, Settings } from 'lucide-react'

import { NAV_ITEMS, isNavItemActive, type NavIcon } from '../lib/nav'
import { PullToRefresh } from './PullToRefresh'

const ICONS: Record<NavIcon, typeof House> = {
  home: House,
  briefcase: Briefcase,
  columns: Columns3,
  calendar: CalendarDays,
  yen: JapaneseYen,
  settings: Settings,
}

/** スマホ: 上に小さなヘッダ、下にタブバー。デスクトップ(sm 以上): 左ナビ。 */
export function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  return (
    <AppShell
      header={{ height: 52 }}
      navbar={{ width: 220, breakpoint: 'sm', collapsed: { mobile: true } }}
      footer={{ height: { base: 56, sm: 0 } }}
      padding="md"
    >
      <AppShell.Header className="appbar">
        <Group h="100%" px="md" wrap="nowrap" gap="xs">
          <Text fw={700} size="lg" component={Link} to="/" c="inherit" td="none">
            案件管理
          </Text>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar className="appbar" p="xs">
        {NAV_ITEMS.map(({ to, label, icon }) => {
          const Icon = ICONS[icon]
          const active = isNavItemActive(pathname, to)
          return (
            <NavLink
              key={to}
              component={Link}
              to={to}
              label={label}
              leftSection={<Icon size={18} aria-hidden />}
              active={active}
              aria-current={active ? 'page' : undefined}
            />
          )
        })}
      </AppShell.Navbar>

      <AppShell.Main className="app-main">
        <PullToRefresh>{children}</PullToRefresh>
      </AppShell.Main>

      <AppShell.Footer hiddenFrom="sm" className="tabbar" withBorder>
        <Group grow gap={0} h="100%" component="nav" aria-label="主要なページ">
          {NAV_ITEMS.map(({ to, label, icon }) => {
            const Icon = ICONS[icon]
            const active = isNavItemActive(pathname, to)
            return (
              <UnstyledButton
                key={to}
                component={Link}
                to={to}
                aria-current={active ? 'page' : undefined}
                h="100%"
                c={active ? 'indigo' : 'dimmed'}
              >
                <Stack align="center" justify="center" gap={3} h="100%">
                  <Icon size={20} aria-hidden strokeWidth={active ? 2.5 : 1.75} />
                  <Text size="xs" fw={active ? 700 : 500} lh={1}>
                    {label}
                  </Text>
                </Stack>
              </UnstyledButton>
            )
          })}
        </Group>
      </AppShell.Footer>
    </AppShell>
  )
}
