import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { PageShell } from '../components/PageShell'
import { AxesCard } from '../components/settings/AxesCard'
import { BusinessCard } from '../components/settings/BusinessCard'
import { ImprovementsCard } from '../components/settings/ImprovementsCard'
import { ThresholdsCard } from '../components/settings/ThresholdsCard'
import { getSettingsData } from '../server/settings'

export const Route = createFileRoute('/settings')({
  component: Page,
  loader: () => getSettingsData(),
})

type Card = 'business' | 'thresholds' | 'axes' | 'improvements'

function Page() {
  const { thresholds, axes, business, improvements } = Route.useLoaderData()
  // Each card edits on its own. Opening one no longer closes another and drops its unsaved input
  // (SHIG 38, 9: modeless)
  const [editing, setEditing] = useState<ReadonlySet<Card>>(new Set())
  const open = (card: Card) => setEditing((prev) => new Set(prev).add(card))
  const close = (card: Card) =>
    setEditing((prev) => {
      const next = new Set(prev)
      next.delete(card)
      return next
    })

  return (
    <PageShell title="設定">
      <BusinessCard
        value={business}
        editing={editing.has('business')}
        onEdit={() => open('business')}
        onClose={() => close('business')}
      />
      <ThresholdsCard
        value={thresholds}
        editing={editing.has('thresholds')}
        onEdit={() => open('thresholds')}
        onClose={() => close('thresholds')}
      />
      <AxesCard
        value={axes}
        editing={editing.has('axes')}
        onEdit={() => open('axes')}
        onClose={() => close('axes')}
      />
      <ImprovementsCard
        value={improvements}
        editing={editing.has('improvements')}
        onEdit={() => open('improvements')}
        onClose={() => close('improvements')}
      />
    </PageShell>
  )
}
