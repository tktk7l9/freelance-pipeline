import { createFileRoute } from '@tanstack/react-router'

import { EmptyState } from '../components/EmptyState'
import { PageShell } from '../components/PageShell'
import { DueList } from '../components/home/DueList'
import { PipelineStats } from '../components/home/PipelineStats'
import { RecentLog } from '../components/home/RecentLog'
import { homeData } from '../server/home'

export const Route = createFileRoute('/')({ component: Home, loader: () => homeData() })

function Home() {
  const { due, activeCount, medianIncl, byRoute, recent, today } = Route.useLoaderData()
  return (
    <PageShell title="ホーム">
      <PipelineStats activeCount={activeCount} medianIncl={medianIncl} byRoute={byRoute} />
      <DueList items={due} today={today} />
      {recent.length === 0 ? (
        <EmptyState
          emoji="📋"
          title="まだ案件がありません"
          description="案件タブの取込から登録できます。"
        />
      ) : (
        <RecentLog items={recent} />
      )}
    </PageShell>
  )
}
