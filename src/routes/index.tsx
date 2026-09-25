import { createFileRoute } from '@tanstack/react-router'

import { EmptyState } from '../components/EmptyState'
import { PageShell } from '../components/PageShell'
import { CurrentCase } from '../components/home/CurrentCase'
import { DueList } from '../components/home/DueList'
import { Improvements } from '../components/home/Improvements'
import { PipelineStats } from '../components/home/PipelineStats'
import { RecentLog } from '../components/home/RecentLog'
import { homeData } from '../server/home'

export const Route = createFileRoute('/')({ component: Home, loader: () => homeData() })

function Home() {
  const { current, sites, improvements, due, activeCount, medianIncl, byRoute, recent, today } =
    Route.useLoaderData()
  return (
    <PageShell title="ホーム">
      <CurrentCase items={current} sites={sites} today={today} />
      <Improvements items={improvements} />
      <PipelineStats activeCount={activeCount} medianIncl={medianIncl} byRoute={byRoute} />
      <DueList items={due} sites={sites} today={today} />
      {recent.length === 0 ? (
        <EmptyState
          emoji="📋"
          title="まだ案件がありません"
          description="案件タブの取込から登録できます。"
        />
      ) : (
        <RecentLog items={recent} sites={sites} />
      )}
    </PageShell>
  )
}
