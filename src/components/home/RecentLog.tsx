import { Stack, Text, Timeline, Title } from '@mantine/core'
import { Link } from '@tanstack/react-router'

import { describeLog, formatLogAt, type LogLike } from '../../lib/caseLog'

type Item = LogLike & { caseId: string; company: string; title: string }

export function RecentLog({ items }: { items: Item[] }) {
  if (items.length === 0) return null
  return (
    <Stack gap="xs">
      <Title order={2}>最近の動き</Title>
      <Timeline bulletSize={12} lineWidth={2}>
        {items.map((e) => (
          <Timeline.Item key={e.id} title={formatLogAt(e)}>
            <Link to="/cases/$id" params={{ id: e.caseId }}>
              <Text size="sm">{describeLog(e)}</Text>
            </Link>
            <Text size="xs" c="dimmed">
              {e.company}・{e.title}
            </Text>
          </Timeline.Item>
        ))}
      </Timeline>
    </Stack>
  )
}
