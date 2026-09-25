import { Box, Chip, Group, Stack, Text } from '@mantine/core'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'

import { CaseCard } from '../components/cases/CaseCard'
import { CaseTable } from '../components/cases/CaseTable'
import { EmptyState } from '../components/EmptyState'
import { Fab } from '../components/Fab'
import { PageShell } from '../components/PageShell'
import { STATUS_GROUPS, STATUS_GROUP_LABEL, type StatusGroup } from '../lib/status'
import { listCasesFn } from '../server/cases'

const search = z.object({ group: z.enum(STATUS_GROUPS).default('active') })

export const Route = createFileRoute('/cases')({
  component: Page,
  validateSearch: (s) => search.parse(s),
  loader: () => listCasesFn(),
})

function Page() {
  const { cases, today } = Route.useLoaderData()
  const { group } = Route.useSearch()
  const navigate = useNavigate({ from: '/cases' })
  const items = cases.filter((c) => c.group === group)
  const counts = Object.fromEntries(
    STATUS_GROUPS.map((g) => [g, cases.filter((c) => c.group === g).length]),
  )

  return (
    <PageShell title="案件" fab wide>
      <Stack gap="md">
        <Chip.Group
          value={group}
          onChange={(v) => navigate({ search: { group: v as StatusGroup }, replace: true })}
        >
          <Group gap="xs">
            {STATUS_GROUPS.map((g) => (
              <Chip key={g} value={g}>
                {STATUS_GROUP_LABEL[g]} {counts[g]}
              </Chip>
            ))}
          </Group>
        </Chip.Group>
        {items.length === 0 ? (
          <EmptyState
            emoji="📭"
            title="この区分の案件はありません"
            description="右下の取込から登録できます。"
          />
        ) : (
          <>
            <Box hiddenFrom="md">
              <Stack gap="sm">
                {items.map((c) => (
                  <CaseCard key={c.id} item={c} today={today} />
                ))}
              </Stack>
            </Box>
            <Box visibleFrom="md">
              <CaseTable items={items} today={today} />
            </Box>
          </>
        )}
        <Text size="xs" c="dimmed">
          税込降順。時給は税抜 ÷ 基準時間（精算幅の中点か経路の既定）。
        </Text>
      </Stack>
      <Fab label="取込" onClick={() => navigate({ to: '/import' })} />
    </PageShell>
  )
}
