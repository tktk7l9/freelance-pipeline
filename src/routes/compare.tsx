import { Checkbox, Group, Stack, Text } from '@mantine/core'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'

import { CompareTable } from '../components/compare/CompareTable'
import { EmptyState } from '../components/EmptyState'
import { PageShell } from '../components/PageShell'
import { listCasesFn } from '../server/cases'
import { getSettingsData } from '../server/settings'

const search = z.object({ ids: z.string().optional() })

export const Route = createFileRoute('/compare')({
  component: Page,
  validateSearch: (s) => search.parse(s),
  loader: async () => {
    const [{ cases, sites }, settings] = await Promise.all([listCasesFn(), getSettingsData()])
    return { cases, sites, ...settings }
  },
})

function Page() {
  const { cases, sites, thresholds, axes } = Route.useLoaderData()
  const { ids } = Route.useSearch()
  const navigate = useNavigate({ from: '/compare' })
  const candidates = cases.filter((c) => c.group === 'active' || c.group === 'onhold')
  // ids が undefined（クエリ自体が無い）のときだけ既定に落とす。'' は「全部外した」で空。
  const selected =
    ids !== undefined
      ? ids.split(',').filter(Boolean)
      : candidates.filter((c) => c.group === 'active').map((c) => c.id)
  const shown = candidates.filter((c) => selected.includes(c.id))
  const hasThreshold = Object.values(thresholds).some((v) => v !== null)

  return (
    <PageShell title="比較" wide>
      <Stack gap="md">
        <Checkbox.Group
          value={selected}
          onChange={(v) => navigate({ search: { ids: v.join(',') }, replace: true })}
          label="比較する案件"
        >
          <Group gap="sm" mt="xs">
            {candidates.map((c) => (
              <Checkbox key={c.id} value={c.id} label={`${c.title}（${c.company}）`} />
            ))}
          </Group>
        </Checkbox.Group>
        {shown.length === 0 ? (
          <EmptyState emoji="⚖️" title="比較する案件を選んでください" />
        ) : (
          <CompareTable cases={shown} sites={sites} thresholds={thresholds} axes={axes} />
        )}
        <Text size="xs" c="dimmed">
          参画・終了・辞退・見送りは対象外。時給は税抜 ÷ 基準時間。
          {hasThreshold
            ? '赤いセルは設定の閾値を下回る条件。'
            : '設定で閾値を入れると条件を下回るセルが赤くなる。'}
        </Text>
      </Stack>
    </PageShell>
  )
}
