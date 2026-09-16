import { Badge, Card, Group, Stack, Text } from '@mantine/core'
import { Link } from '@tanstack/react-router'

import { DUE_COLOR, dueState } from '../../lib/deadlines'
import { REMOTE_LABEL, ROUTE_LABEL } from '../../lib/enums'
import { formatMan } from '../../lib/rate'
import type { CaseListItem } from '../../server/cases'
import { StatusBadge } from './StatusBadge'

export function CaseCard({ item, today }: { item: CaseListItem; today: string }) {
  return (
    <Link to="/cases/$id" params={{ id: item.id }} style={{ textDecoration: 'none' }}>
      <Card withBorder padding="sm">
        <Stack gap={6}>
          <Group justify="space-between" wrap="nowrap" align="flex-start">
            <Stack gap={2} style={{ minWidth: 0 }}>
              <Text fw={700} lineClamp={2}>
                {item.title}
              </Text>
              <Text size="sm" c="dimmed" lineClamp={1}>
                {item.company}・{ROUTE_LABEL[item.route]}
              </Text>
            </Stack>
            <StatusBadge status={item.status} />
          </Group>
          <Group gap="xs">
            <Text fw={700}>{formatMan(item.monthlyMaxIncl)}</Text>
            <Text size="sm" c="dimmed">
              税込 / 税抜 {formatMan(item.monthlyExcl)} / {item.hourly.toLocaleString('ja-JP')}円 (÷
              {item.hours}h)
            </Text>
          </Group>
          <Group gap="xs">
            <Badge variant="default">{REMOTE_LABEL[item.remoteType]}</Badge>
            {item.onsiteNote ? <Badge variant="default">{item.onsiteNote}</Badge> : null}
            <Badge variant="default">開始 {item.startDate}</Badge>
            {item.daysPerWeek ? <Badge variant="default">{item.daysPerWeek}</Badge> : null}
          </Group>
          {item.nextAction || item.nextActionDue ? (
            <Group gap="xs" wrap="nowrap">
              {item.nextActionDue ? (
                <Badge color={DUE_COLOR[dueState(item.nextActionDue, today)]} variant="light">
                  {item.nextActionDue}
                </Badge>
              ) : null}
              <Text size="sm" lineClamp={1}>
                {item.nextAction ?? ''}
              </Text>
            </Group>
          ) : null}
        </Stack>
      </Card>
    </Link>
  )
}
