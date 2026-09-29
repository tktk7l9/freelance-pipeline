import { MantineProvider } from '@mantine/core'
import { DatesProvider } from '@mantine/dates'
import { Notifications } from '@mantine/notifications'
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  type AnyRouter,
} from '@tanstack/react-router'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import 'dayjs/locale/ja'

import { AppLayout } from '../../src/components/AppLayout'
import { Route as rootRoute } from '../../src/routes/__root'
import { routeTree } from '../../src/routeTree.gen'
import { cssVariablesResolver, theme } from '../../src/theme'

/**
 * The providers __root.tsx puts around every page. env="test" turns off Mantine's transitions and
 * portals, so drawers and menus render in place and open synchronously.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider
      theme={theme}
      forceColorScheme="dark"
      cssVariablesResolver={cssVariablesResolver}
      env="test"
    >
      <DatesProvider settings={{ locale: 'ja', firstDayOfWeek: 0 }}>
        <Notifications />
        {children}
      </DatesProvider>
    </MantineProvider>
  )
}

async function mount(router: AnyRouter) {
  const user = userEvent.setup()
  await act(() => router.load())
  const utils = render(<RouterProvider router={router} />)
  // Let the router commit its first match before the test starts querying
  await act(async () => {})
  return { user, router, ...utils }
}

/**
 * Renders a component inside a throwaway router (Link and useRouter need one). Paths other than
 * `path` exist as empty routes so links can be followed and the resulting URL asserted.
 */
export async function renderWithRouter(ui: React.ReactNode, { path = '/' } = {}) {
  const root = createRootRoute({
    component: () => (
      <Providers>
        <Outlet />
      </Providers>
    ),
  })
  const page = createRoute({ getParentRoute: () => root, path, component: () => <>{ui}</> })
  const splat = createRoute({ getParentRoute: () => root, path: '$', component: () => null })
  const router = createRouter({
    routeTree: root.addChildren([page, splat]),
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  return mount(router)
}

/** Renders the real route tree at `url`. The HTML shell is swapped for the providers + app layout */
export async function renderApp(url: string) {
  rootRoute.update({
    shellComponent: ({ children }: { children: React.ReactNode }) => (
      <Providers>
        <AppLayout>{children}</AppLayout>
      </Providers>
    ),
  } as never)
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [url] }),
  })
  return mount(router)
}

/** The visible notification text (Mantine notifications render outside the page tree) */
export async function findNotification(text: string | RegExp) {
  return screen.findByText(text, {}, { timeout: 3000 })
}
