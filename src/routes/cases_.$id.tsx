import { createFileRoute } from '@tanstack/react-router'

import { EmptyState } from '../components/EmptyState'
import { PageShell } from '../components/PageShell'

export const Route = createFileRoute('/cases_/$id')({ component: CaseDetail })

function CaseDetail() {
  return (
    <PageShell title="案件詳細">
      <EmptyState emoji="📋" title="準備中" description="Task 8 で詳細画面を作ります。" />
    </PageShell>
  )
}
