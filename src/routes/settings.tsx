import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { PageShell } from '../components/PageShell'
import { AxesCard } from '../components/settings/AxesCard'
import { BusinessCard } from '../components/settings/BusinessCard'
import { ThresholdsCard } from '../components/settings/ThresholdsCard'
import { getSettingsData } from '../server/settings'

export const Route = createFileRoute('/settings')({
  component: Page,
  loader: () => getSettingsData(),
})

type EditingCard = 'business' | 'thresholds' | 'axes' | null

function Page() {
  const { thresholds, axes, business } = Route.useLoaderData()
  const [editing, setEditing] = useState<EditingCard>(null)

  return (
    <PageShell title="設定" description="判断基準はここ（DB）にだけ置く。リポジトリには入らない">
      <BusinessCard
        value={business}
        editing={editing === 'business'}
        onEdit={() => setEditing('business')}
        onClose={() => setEditing(null)}
      />
      <ThresholdsCard
        value={thresholds}
        editing={editing === 'thresholds'}
        onEdit={() => setEditing('thresholds')}
        onClose={() => setEditing(null)}
      />
      <AxesCard
        value={axes}
        editing={editing === 'axes'}
        onEdit={() => setEditing('axes')}
        onClose={() => setEditing(null)}
      />
    </PageShell>
  )
}
