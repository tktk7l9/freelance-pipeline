import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from '@mantine/core'
import { DatesProvider } from '@mantine/dates'
import { Notifications } from '@mantine/notifications'
import 'dayjs/locale/ja'

import { AppLayout } from '../components/AppLayout'
import { RouteErrorState, RouteNotFoundState } from '../components/ErrorStates'
import { cssVariablesResolver, theme } from '../theme'

import mantineCoreCss from '@mantine/core/styles.css?url'
import mantineDatesCss from '@mantine/dates/styles.css?url'
import mantineNotificationsCss from '@mantine/notifications/styles.css?url'
import mantineScheduleCss from '@mantine/schedule/styles.css?url'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { name: 'robots', content: 'noindex, nofollow, noarchive' },
      // theme-color is written directly in RootDocument's <head> (dark only)
      // (the meta array of head() merges tags with the same name into one)
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      { title: '案件管理' },
    ],
    links: [
      { rel: 'stylesheet', href: mantineCoreCss },
      { rel: 'stylesheet', href: mantineDatesCss },
      { rel: 'stylesheet', href: mantineNotificationsCss },
      { rel: 'stylesheet', href: mantineScheduleCss },
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      { rel: 'apple-touch-icon', href: '/icons/icon-192.png' },
      { rel: 'manifest', href: '/manifest.json' },
    ],
  }),
  shellComponent: RootDocument,
  errorComponent: ({ error }) => <RouteErrorState error={error} />,
  notFoundComponent: RouteNotFoundState,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" {...mantineHtmlProps}>
      <head>
        {/* Dark only (owner's request 2026-09-25). No toggle UI, and it does not follow the OS setting */}
        <ColorSchemeScript forceColorScheme="dark" />
        {/* The base color matches dark[7] in src/theme.ts */}
        <meta name="theme-color" content="#171d27" />
        <HeadContent />
      </head>
      <body>
        <MantineProvider
          theme={theme}
          forceColorScheme="dark"
          cssVariablesResolver={cssVariablesResolver}
        >
          <DatesProvider settings={{ locale: 'ja', firstDayOfWeek: 0 }}>
            <Notifications position="top-center" />
            <AppLayout>{children}</AppLayout>
          </DatesProvider>
        </MantineProvider>
        <Scripts />
      </body>
    </html>
  )
}
