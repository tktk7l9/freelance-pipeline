import { Badge, Card, Group, Stack, Text, Title } from '@mantine/core'
import { Link } from '@tanstack/react-router'

import { DUE_COLOR, dueState } from '../../lib/deadlines'

type Item = {
  id: string
  company: string
  title: string
  nextAction: string | null
  nextActionDue: string
}

export function DueList({ items, today }: { items: Item[]; today: string }) {
  if (items.length === 0) return null
  return (
    <Stack gap="xs">
      <Title order={2}>期日順</Title>
      {items.map((i) => (
        <Link key={i.id} to="/cases/$id" params={{ id: i.id }} style={{ textDecoration: 'none' }}>
          <Card withBorder padding="sm">
            <Group wrap="nowrap" align="flex-start" gap="sm">
              <Badge
                color={DUE_COLOR[dueState(i.nextActionDue, today)]}
                variant="light"
                style={{ flexShrink: 0 }}
              >
                {i.nextActionDue}
              </Badge>
              <Stack gap={2} style={{ minWidth: 0 }}>
                <Text fw={600} lineClamp={1}>
                  {i.nextAction ?? '（次の一手が未設定）'}
                </Text>
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {i.company}・{i.title}
                </Text>
              </Stack>
            </Group>
          </Card>
        </Link>
      ))}
    </Stack>
  )
}
