import { Badge, Card, Group, Stack, Text, Title } from '@mantine/core'
import { Link } from '@tanstack/react-router'

import { DUE_COLOR, dueLabel, dueState, groupByDue } from '../../lib/deadlines'
import { formatDateSlash } from '../../lib/format'
import type { CompanySites } from '../../server/repository'
import { CompanyName } from '../CompanyName'

type Item = {
  id: string
  company: string
  title: string
  nextAction: string | null
  nextActionDue: string
}

export function DueList({
  items,
  sites,
  today,
}: {
  items: Item[]
  sites: CompanySites
  today: string
}) {
  if (items.length === 0) return null
  const groups = groupByDue(items)
  return (
    <Stack gap="xs">
      <Title order={2}>期日順</Title>
      {groups.map((g) => {
        const state = dueState(g.date, today)
        return (
          <Stack key={g.date} gap={4}>
            <Group gap="xs">
              <Text size="sm" fw={700} c={DUE_COLOR[state]}>
                {formatDateSlash(g.date)}
              </Text>
              {dueLabel(g.date, today) ? (
                <Badge color={DUE_COLOR[state]} variant="light" size="sm">
                  {dueLabel(g.date, today)}
                </Badge>
              ) : null}
            </Group>
            {g.items.map((i) => (
              <Link
                key={i.id}
                to="/cases/$id"
                params={{ id: i.id }}
                style={{ textDecoration: 'none' }}
              >
                <Card withBorder padding="sm">
                  <Stack gap={2}>
                    <Text fw={600} lineClamp={1}>
                      {i.nextAction ?? '（次の一手が未設定）'}
                    </Text>
                    <Text size="xs" c="dimmed" lineClamp={1}>
                      <CompanyName name={i.company} url={sites[i.company]} nested />・{i.title}
                    </Text>
                  </Stack>
                </Card>
              </Link>
            ))}
          </Stack>
        )
      })}
    </Stack>
  )
}
