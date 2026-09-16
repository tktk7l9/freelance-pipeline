import { createFileRoute } from '@tanstack/react-router'

import { EmptyState } from '../components/EmptyState'
import { PageShell } from '../components/PageShell'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <PageShell title="ホーム">
      <EmptyState emoji="📋" title="準備中" description="Task 9 でホームを作ります。" />
    </PageShell>
  )
}
