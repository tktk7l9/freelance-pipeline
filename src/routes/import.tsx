import { createFileRoute } from '@tanstack/react-router'

import { EmptyState } from '../components/EmptyState'
import { PageShell } from '../components/PageShell'

export const Route = createFileRoute('/import')({ component: Import })

function Import() {
  return (
    <PageShell title="取込">
      <EmptyState emoji="📋" title="準備中" description="Task 10 で取込を作ります。" />
    </PageShell>
  )
}
