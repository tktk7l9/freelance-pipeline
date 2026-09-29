import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { Route as rootRoute } from '../../../src/routes/__root'
import { routeTree } from '../../../src/routeTree.gen'
import { homeData } from '../../../src/server/home'
import { TODAY } from '../fixtures'

describe('root document', () => {
  it('server-renders a Japanese, dark-only, non-indexed page shell with the app inside', async () => {
    vi.mocked(homeData).mockResolvedValue({
      current: [],
      sites: {},
      improvements: [],
      due: [],
      activeCount: 0,
      medianIncl: null,
      byRoute: [],
      recent: [],
      today: TODAY,
    } as never)
    // Other test files swap the shell for a test one; this file runs in its own module graph
    const options = rootRoute.options as { shellComponent?: { name: string } }
    expect(options.shellComponent?.name).toBe('RootDocument')
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ['/'] }),
      isServer: true,
    })
    await router.load()
    const html = renderToString(<RouterProvider router={router} />)
    expect(html).toContain('<html lang="ja"')
    expect(html).toContain('data-mantine-color-scheme="dark"')
    expect(html).toContain('<meta name="theme-color" content="#171d27"/>')
    expect(html).toContain('noindex, nofollow, noarchive')
    expect(html).toContain('<title>案件管理</title>')
    expect(html).toContain('まだ案件がありません')
  })
})
